import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync} from "node:fs";
import {place, sfxTrack} from "../../src/lib/edit.ts";
import {outOfFrame, viewAt} from "../../src/lib/view.ts";
import {ASK, FEATURE17, FEATURE17_STAGED, FEATURE17_VIEWS} from "../../src/edits/feature17.ts";
import {TTS_SEC} from "../../src/edits/ttsSec.ts";
import {stagedRun} from "../../src/lib/staged.ts";
import {stateAt} from "../../src/lib/uiState.ts";
import {dwellAt} from "../../src/lib/judge.ts";

// 시안 17 — 새 촬영(10/11) 편집표의 소리 · 확대 · 음성비서 시각
const file = (n: string) => new URL(`../../public/audio/${n}.wav`, import.meta.url);

test("소리는 하나도 버려지지 않고 파일이 모두 있다", () => {
  const tr = sfxTrack(place(FEATURE17, 30), 30);
  assert.equal(tr.length, FEATURE17.reduce((n, c) => n + (c.sfx?.length ?? 0), 0));
  for (const s of tr) assert.ok(existsSync(file(s.name)), s.name);
});

test("확대 창은 원본 밖으로 나가지 않고(검은 테두리 없음) 기준점은 시간 순", () => {
  for (const [take, keys] of Object.entries(FEATURE17_VIEWS)) {
    for (const key of keys) assert.equal(outOfFrame(key), false, `${take} ${key}`);
    for (let i = 1; i < keys.length; i++) assert.ok(keys[i][0] >= keys[i - 1][0], `${take} ${keys[i][0]}`);
  }
});

test("프레임 판정에서 뺀 구간(문 · 비침) 중 편집에 쓰는 곳은 창이 디스플레이 · 문을 뺀다(위 0.23 · 왼쪽 0.11 안쪽)", () => {
  const M = FEATURE17_VIEWS["20261011_main"];
  // [시작, 끝] 원본 초 — 프레임 판정 결과(#2633~2919 · #3801~3842 · #3945~4008 · #4681~4920 · #5208~5232 · #5380~5407)
  //   창 경계 = 판정 프레임에 창을 그려 확인(디스플레이 아래 끝 ≤ 0.21 · 문 띠 ≤ 0.10)
  const bad: [number, number][] = [[44.38, 49.21], [64.08, 64.81], [66.51, 67.577], [78.93, 82.96], [87.82, 88.27], [90.71, 91.16]];
  const used = place(FEATURE17, 30).filter((p) => p.clip.take === "20261011_main");
  for (const [a, b] of bad)
    for (const p of used) {
      const c = p.clip, lo = Math.max(a, c.from), hi = Math.min(b, c.hold !== undefined ? c.from : c.to);
      for (let t = lo; t <= hi; t += 0.01) {
        const v = viewAt(M, t), h = 0.5 / v.z;
        assert.ok(v.cy - h >= 0.229 && v.cx - h >= 0.109, `${c.run ?? "-"} ${t.toFixed(2)}초 창 위 ${(v.cy - h).toFixed(3)} 왼쪽 ${(v.cx - h).toFixed(3)}`);
      }
    }
});

test("장면 안에서는 확대 · 축소가 일어나지 않는다 — 같은 촬영 갈래로 이어진 구간의 배율이 모두 같다(시안 17 4차 · 렌치 장면은 5차에 2차 방식으로 되돌림)", () => {
  const ps = place(FEATURE17, 30).map((p) => p.clip).filter((c) => !c.card);
  for (const take of Object.keys(FEATURE17_VIEWS))
    for (const run of new Set(ps.filter((c) => c.take === take).map((c) => c.run ?? ""))) {
      if (take === "20261011_main" && run === "tool") continue;   // 사용자 「이전 확대 방식으로 롤백」 — 고정이면 렌치 이름표가 잘림
      const zs = ps.filter((c) => c.take === take && (c.run ?? "") === run)
        .flatMap((c) => (c.hold !== undefined ? [c.from] : Array.from({length: 21}, (_, i) => c.from + ((c.to - c.from) * i) / 20)))
        .map((t) => viewAt(FEATURE17_VIEWS[take], t).z);
      assert.ok(Math.max(...zs) - Math.min(...zs) < 1e-9, `${take}#${run}: 배율 ${Math.min(...zs)} ~ ${Math.max(...zs)}`);
    }
});

test("음성비서 — 재생 → 정지 → 재생의 HUD 시계가 이어지고, 공구 답을 다 들은 뒤 재생 · 단계 답은 1단계 완료 전에 끝난다", () => {
  const ps = place(FEATURE17, 30);
  const clips = (run: string) => ps.filter((p) => p.clip.run === run && !p.clip.card).map((p) => p.clip);
  const [a, hold, after] = clips("voice1");
  assert.ok(Math.abs(a.hud! + (a.to - a.from) / a.speed - hold.hud!) < 1e-9, "재생 구간이 끝난 HUD = 정지 HUD 시작");
  assert.ok(Math.abs(hold.hud! + hold.hold! - after.hud!) < 1e-9, "정지가 끝난 HUD = 재생 구간 HUD 시작");
  assert.ok(ASK.A1.done === ASK.A1.play + TTS_SEC.tool && ASK.A1.done < after.hud!, "공구 답 재생이 정지 안에서 끝나고 그 뒤 손이 움직인다(시안 17 3차)");
  assert.ok(ASK.A2.done <= ASK.STEP1_DONE - 0.1, "단계 답이 1단계 완료 전에 끝남");
  const [b, hold2] = clips("voice2");
  assert.equal(hold2.hud, b.to, "B1 누름 장면 뒤 정지의 HUD = 재생이 끝난 원본 초");
  assert.ok(hold2.hud! + hold2.hold! >= ASK.STEP1_DONE + 1, "1단계 완료 안내를 보일 여유");
  assert.ok(b.to < 12.37, "손이 다시 들어오기(12.37) 전에 정지");
});

test("작업자 말(남성 TTS)은 호출 · 질문 글자보다 먼저 끝난다 — 실제 시스템은 다 들은 뒤 띠링 · 받아쓰기", () => {
  for (const [a, w] of [[ASK.A1, TTS_SEC.w_tool], [ASK.A2, TTS_SEC.w_step]] as const) {
    assert.ok(a.w + TTS_SEC.w_wake <= a.call, "「가디언」이 끝난 뒤 호출");
    assert.ok(a.q >= a.call + 0.25, "띠링 뒤에 질문");
    assert.ok(a.q + w <= a.stt, "질문을 다 말한 뒤 받아쓰기");
  }
});

test("흐림 창(dim)은 구간 안에 있고, 정지에서 답 직전에 풀린다", () => {
  const ps = place(FEATURE17, 30);
  for (const p of ps.filter((x) => x.clip.dim)) {
    const [a, b] = p.clip.dim!, dur = p.frames / 30;
    assert.ok(a >= 0 && b <= dur + 1 / 30 + 1e-6 && a < b, `${p.clip.run} ${a}~${b} / ${dur}`);   // 길이는 1/30초로 반올림
  }
});
test("멈춘 뒤 이어지는 재생은 HUD 시계를 멈춘 만큼 이어 간다 — 쥠 확인 · 다른 공구 · 차단(효과가 두 번 나오지 않게)", () => {
  const ps = place(FEATURE17, 30).map((p) => p.clip).filter((c) => !c.card);
  for (const [i, c] of ps.entries()) {
    if (c.hold === undefined || i + 1 >= ps.length) continue;
    const n = ps[i + 1];
    if (n.hud === undefined || n.take !== c.take || n.run !== c.run) continue;
    const end = (c.hud ?? c.from) + c.hold;
    assert.ok(Math.abs(n.hud - end) < 1e-9, `${c.run} ${c.from}: 정지 끝 HUD ${end} = 다음 HUD ${n.hud}`);
  }
  const runs = ps.filter((c) => c.hud !== undefined && c.hold === undefined && (c.run === "tool" || c.run === "other")).map((c) => c.run);
  assert.deepEqual(runs, ["tool", "other"]);
});

test("공구 · 손 절 — 버튼 상자는 모두 끄고, 공구 인식부터 드라이버 끝까지 단계 목록을 끈 채(quiet)로 · 인식 · 쥠 · 다른 공구는 정지", () => {
  const cs = place(FEATURE17, 30).map((p) => p.clip);
  const hand = cs.filter((c) => c.take === "20261011_main" && !c.run && (c.intro === "hand" || c.focus === "hand" || c.section?.title === "손"));
  assert.ok(hand.length >= 3 && hand.every((c) => c.hideBtn?.length === 5), "손 절 버튼 끔");
  const tool = cs.filter((c) => c.run === "tool" || c.run === "other");
  assert.ok(tool.every((c) => c.hideBtn?.length === 5), "공구 절 버튼 끔");
  const first = tool.findIndex((c) => c.intro === "tool");
  assert.ok(tool.slice(first).every((c) => c.quiet), "인식부터 끝까지 quiet");
  assert.deepEqual(tool.filter((c) => c.hold !== undefined && !c.card).map((c) => [c.run, c.intro ?? "", c.from]),
    [["tool", "tool", 49.5], ["tool", "", 53.0], ["other", "tool", 83.9], ["other", "", 85.9]]);
  assert.ok(tool.filter((c) => c.intro === "overlap").every((c) => c.hold === undefined), "쥠 판정(스캔)은 재생 중");
  const h = cs.filter((c) => c.intro === "hand");
  assert.deepEqual(h.map((c) => c.hold === undefined), [true, false], "손 인식은 재생 → 같은 프레임에서 정지");
  assert.equal(h[0].to, h[1].from);
});

test("차단 — 누름(버튼 색 파동 · 누름 소리)이 먼저, 멈춘 화면에서 0.35초 뒤 차단 · 경보 · 머묾 타이머는 누른 자리(60%)에서 멈춤", () => {
  const st = FEATURE17_STAGED["20261011_main#block"];
  const R = stagedRun(st.start, st.presses, {first: st.first, extra: st.extra});
  const press = R.events.find((e) => e.kind === "press")!, block = R.events.find((e) => e.kind === "state" && e.d.new === "BLOCK")!;
  assert.ok(block.t - press.t >= 350, "차단은 누름보다 늦게");
  assert.equal(stateAt(R.events, R.runStart, press.t + 100).alert, null);
  assert.equal(stateAt(R.events, R.runStart, block.t).alert?.kind, "block");
  const d = dwellAt(R.events, R.runStart, block.t - 10)!;
  assert.ok(d.progress > 0.5 && d.progress < 0.7, `누른 순간 타이머 ${d.progress}`);
  const ps = place(FEATURE17, 30), i = ps.findIndex((p) => p.clip.run === "block" && p.clip.hold !== undefined && !p.clip.card);
  const hold = ps[i].clip, alarm = hold.sfx!.find((x) => x[1] === "sfx_alarm")!;
  assert.ok(Math.abs(hold.hud! + alarm[0] - block.t / 1000) < 1e-9, "경보 = 차단 순간");
});

test("음성 질의 — 작업자 말풍선은 목소리와 함께(utter = 소리 시작 시각 · 길이 = 목소리 길이)", () => {
  for (const [run, a, q] of [["voice1", ASK.A1, TTS_SEC.w_tool], ["voice2", ASK.A2, TTS_SEC.w_step]] as const) {
    const st = FEATURE17_STAGED[`20261011_main#${run}`];
    const u = st.extra!.filter((e) => e.kind === "utter");
    assert.deepEqual(u.map((e) => [e.t, e.d.dur]), [[a.w, TTS_SEC.w_wake], [a.q, q]], run);
  }
});
