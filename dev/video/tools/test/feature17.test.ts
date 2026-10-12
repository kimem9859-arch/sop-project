import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync} from "node:fs";
import {place, sfxTrack, srcSec} from "../../src/lib/edit.ts";
import {meterSpan} from "../../src/lib/fx.ts";
import {stableBox} from "../../src/lib/dets.ts";
import {outOfFrame, viewAt} from "../../src/lib/view.ts";
import {ASK, FEATURE17, FEATURE17_STAGED, FEATURE17_VIEWS} from "../../src/edits/feature17.ts";
import {TTS_SEC} from "../../src/edits/ttsSec.ts";
import {stagedRun} from "../../src/lib/staged.ts";
import {stateAt} from "../../src/lib/uiState.ts";
import {dwellAt} from "../../src/lib/judge.ts";
import {enterAt, slowAt, speedRead} from "../../src/lib/speed.ts";
import {readFileSync} from "node:fs";

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
  assert.ok(ASK.A1.done === ASK.A1.play + TTS_SEC.tool_quick && ASK.A1.done < after.hud!, "공구 답 재생이 정지 안에서 끝나고 그 뒤 손이 움직인다(시안 17 3차)");
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

test("차단 — 느려짐 → 경고 → 무시하고 누름(파동 · 누름 소리) → 멈춘 화면에서 0.35초 뒤 차단 · 경보 · 경고 구역은 차단 순간 사라짐(수정 18)", () => {
  const st = FEATURE17_STAGED["20261011_main#block"];
  const R = stagedRun(st.start, st.presses, {first: st.first, extra: st.extra});
  const warn = R.events.find((e) => e.kind === "state" && e.d.new === "WARNING")!;
  const press = R.events.find((e) => e.kind === "press")!, block = R.events.find((e) => e.kind === "state" && e.d.new === "BLOCK")!;
  assert.equal(warn.d.reason, "slow");
  assert.ok(warn.t < press.t && block.t - press.t >= 350, "경고 → 누름 → 차단");
  assert.equal(stateAt(R.events, R.runStart, press.t - 10).alert?.kind, "warning");
  assert.equal(stateAt(R.events, R.runStart, block.t).alert?.kind, "block");
  assert.equal(dwellAt(R.events, R.runStart, press.t)?.slow, true, "누르기 전 = 느린 손끝 경고 구역");
  assert.notEqual(dwellAt(R.events, R.runStart, block.t - 10), null, "차단 직전까지 경고 구역이 보인다(경고 뒤 1초 표시 창 안 — 차단이 그보다 먼저)");
  assert.equal(dwellAt(R.events, R.runStart, block.t + 10), null, "차단 뒤에는 경고 구역이 사라진다");
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

// 수정 17 — 프로젝트 최종 정리(sop-project docs/프로젝트-최종정리.md · 시연 Rpi5 bfba16f)와 맞춤
test("공구 질문 = 상태 질문 즉답 — 사실 카드 · 「확인해 보겠습니다」 없이 코드가 바로 답하고, 단계 질문은 LLM(최종 정리 5.6)", () => {
  const run = (k: string) => {
    const st = FEATURE17_STAGED[`20261011_main#${k}`];
    return stagedRun(st.start, st.presses, {first: st.first, extra: st.extra});
  };
  const q = run("voice1"), ans = q.events.find((e) => e.kind === "answer")!;
  assert.equal(q.events.filter((e) => e.kind === "card").length, 0, "즉답은 LLM 에 카드를 보내지 않는다");
  assert.equal(ans.d.src, "quick");
  assert.equal(ans.d.text, "2단계에 필요한 공구는 렌치입니다.", "voice_card.quick_answer 「필요공구」 문장");
  assert.ok(ASK.A1.ans - ASK.A1.stt <= 1.2, "받아쓰기 뒤 1.2초 안에 답");
  const v = stateAt(q.events, q.runStart, Math.round(ASK.A1.play * 1000) + 50).voice;
  assert.ok(v.speaking && !v.ack && v.card === null, "답만 말한다(「확인해 보겠습니다」 · 카드 없음)");
  const l = run("voice2"), lans = l.events.find((e) => e.kind === "answer")!;
  assert.equal(lans.d.src, "llm");
  assert.equal(l.events.filter((e) => e.kind === "card").length, 1, "단계 질문은 사실 카드와 함께 LLM 으로");
});

test("화면에 보이는 서브작업 대기는 레시피대로 10초 — 1단계 플라즈마 클린 · 2단계 N2 퍼지(최종 정리 3.1)", () => {
  const subs = Object.values(FEATURE17_STAGED).flatMap((st) => st.presses.filter((p) => p.sub && p.sub.sec > 1).map((p) => p.sub!));
  assert.ok(subs.length >= 4);
  for (const s of subs) assert.equal(s.sec, 10, s.label);
  assert.equal(ASK.STEP1_DONE, 9.54 + 10, "단계 질문의 1단계 완료 = B1 누름 + 10초");
});

test("공구 질문 장면 — B2 누름 파동(0.9초)은 장면 앞에서 끝나고, 10초 대기는 장면이 끝날 때까지 끝나지 않는다", () => {
  const b2 = FEATURE17_STAGED["20261011_main#voice1"].presses.find((p) => p.button === "B2")!;
  const ps = place(FEATURE17, 30).filter((p) => p.clip.run === "voice1" && !p.clip.card).map((p) => p.clip);
  const last = ps[ps.length - 1], end = last.hud! + (last.to - last.from) / last.speed;
  const start = ps[0].hud ?? ps[0].from;
  assert.ok(b2.t + 0.9 <= start, `누름 ${b2.t} · 장면 시작 HUD ${start}`);
  assert.ok(b2.t + b2.sub!.sec >= end + 0.2, `대기 끝 ${b2.t + b2.sub!.sec} · 장면 끝 HUD ${end.toFixed(3)}`);
});

test("2단계 N2 퍼지(10초)는 어느 장면에서도 장면 HUD 가 끝나기 전에 끝나지 않는다 — 연출 기록은 렌치 없이도 시간이 차면 단계를 끝내므로", () => {
  const ps = place(FEATURE17, 30).map((p) => p.clip).filter((c) => !c.card);
  for (const run of ["tool", "other", "voice1"]) {
    const cs = ps.filter((c) => c.run === run);
    const end = Math.max(...cs.map((c) => (c.hud !== undefined ? c.hud + (c.hold ?? (c.to - c.from) / c.speed) : c.hold !== undefined ? c.from : c.to)));
    const b2 = FEATURE17_STAGED[`20261011_main#${run}`].presses.find((p) => p.button === "B2")!;
    assert.ok(b2.t + b2.sub!.sec >= end + 0.2, `${run}: 대기 끝 ${b2.t + b2.sub!.sec} · 장면 끝 HUD ${end.toFixed(3)}`);
  }
});

test("즉답 장면에는 「확인해 보겠습니다」 · 사실 카드 소리가 없고, 단계 질문(LLM)에는 있다", () => {
  const names = (run: string) => place(FEATURE17, 30).filter((p) => p.clip.run === run && !p.clip.card).flatMap((p) => (p.clip.sfx ?? []).map((x) => x[1]));
  for (const n of ["tts_ack", "sfx_card", "sfx_pop"]) {
    assert.ok(!names("voice1").includes(n), `voice1 ${n}`);
    assert.ok(names("voice2").includes(n), `voice2 ${n}`);
  }
  assert.ok(names("voice1").includes("tts_tool_quick"));
});

// 촬영 검출(public/footage → ~/data/시연영상 · 저장소 밖)이 있을 때만 — 연출 기록의 경고 시각이 실제 손끝 속도와 맞는지
const DETS = new URL("../../public/footage/20261011_main/dets.json", import.meta.url);
test("경고 · 차단의 경고 시각 = 손끝이 B3 상자 안에서 느림 기준 아래로 떨어진 순간 · 머문 시작 = 상자에 든 순간(촬영 검출 · 수정 18)", {skip: !existsSync(DETS)}, () => {
  const d = JSON.parse(readFileSync(DETS, "utf8"));
  for (const [run, from, to] of [["warn", 14.3, 15.3], ["block", 20.0, 20.94]] as const) {
    const st = FEATURE17_STAGED[`20261011_main#${run}`];
    const w = st.extra!.find((e) => e.kind === "state" && e.d.new === "WARNING")!;
    const slow = slowAt(d, from, to, "B3")!, enter = enterAt(d, from, to, "B3")!;
    assert.ok(Math.abs(w.t - slow) <= 0.002, `${run}: 경고 ${w.t} · 느려짐 ${slow}`);
    assert.ok(Math.abs(w.d.dwell_start_ms / 1000 - enter) <= 0.002, `${run}: 머문 시작 ${w.d.dwell_start_ms} · 상자에 듦 ${enter}`);
  }
  assert.equal(slowAt(d, 12.5, 13.4, "B1"), null, "스침은 B1 상자 안에서 느려지지 않는다(빠르게 지나감)");
});

test("계기 장면의 장식 시계는 구간 경계에서 이어진다 — 정지 → 재생에서 경고 카드 · 번쩍임이 다시 시작하지 않게(수정 18 리뷰)", () => {
  const ps = place(FEATURE17, 30);
  const idx = ps.map((_, i) => i).filter((i) => ps[i].clip.run === "warn" && ps[i].clip.meter);
  const clock = (i: number, f: number) => srcSec(ps[i].clip, f, 30) + (ps[i].clip.hold !== undefined ? f / 30 : 0) + meterSpan(ps, i, f, 30).held;
  assert.equal(idx.length, 4);
  for (let k = 1; k < idx.length; k++) {
    const a = idx[k - 1], b = idx[k], c = ps[a].clip;
    const next = clock(a, ps[a].frames - 1) + (c.hold !== undefined ? 1 : c.speed) / 30;
    assert.ok(Math.abs(clock(b, 0) - next) < 0.02, `${k}: ${next.toFixed(3)} → ${clock(b, 0).toFixed(3)}`);
  }
});

test("계기 — 화면에 그리는 모든 장에서 경고는 느려진 뒤 늘 「느려짐」 · 스침은 「느려짐」이 없고 「지나감」 값이 한결같다(수정 18 리뷰)", {skip: !existsSync(DETS)}, () => {
  const d = JSON.parse(readFileSync(DETS, "utf8"));
  const ps = place(FEATURE17, 30);
  const reads = (run: string) => ps.filter((p) => p.clip.run === run && p.clip.meter).flatMap((p) =>
    Array.from({length: p.frames}, (_, f) => {
      const sec = srcSec(p.clip, f, 30);
      return {sec, r: speedRead(d, sec, stableBox(d, sec, p.clip.spot!)!)};
    }));
  const slowT = FEATURE17_STAGED["20261011_main#warn"].extra!.find((e) => e.kind === "state" && e.d.new === "WARNING")!.t + 0.001;
  const warn = reads("warn");
  for (const {sec, r} of warn) if (sec >= slowT - 1e-6) assert.equal(r?.kind, "slow", `warn ${sec.toFixed(3)}초 ${r?.kind}`);
  assert.ok(warn.some(({sec, r}) => sec < slowT && r?.kind === "approach") && warn.some(({sec, r}) => sec < slowT && r?.kind === "fast"), "다가감 → 상자 안 빠름이 먼저");
  const graze = reads("graze");
  assert.ok(graze.every(({r}) => r?.kind !== "slow"));
  const passed = new Set(graze.filter(({r}) => r?.kind === "passed").map(({r}) => Math.round(r!.v)));
  assert.equal(passed.size, 1, `지나감 값 ${[...passed]}`);
});
