import {test} from "node:test";
import assert from "node:assert/strict";
import {BANNER_FROM, CHECK_SEC} from "../../src/lib/boot.ts";
import {place, sfxTrack, totalFrames} from "../../src/lib/edit.ts";
import {FEATURE17} from "../../src/edits/feature17.ts";
import {HANIUM, HANIUM_BOOT} from "../../src/edits/hanium.ts";

// 한이음 제출판(설계 D84) — 예선 영상(시안 17)을 공고문 「4) 시연 동영상」 조건에 맞춤
const ps = place(HANIUM, 30);
test("한이음 — 1분 30초 이내", () => {
  const sec = totalFrames(ps) / 30;
  assert.ok(sec <= 90, `${sec}초`);
});
test("한이음 — 로고(소속 이름) 없음 · 첫 화면 = 작품 제목 + 소리 안내 자막", () => {
  assert.ok(!HANIUM.some((c) => c.take === "intro_logo"));
  assert.ok(HANIUM[0].projTitle);
  assert.match(HANIUM[0].caption ?? "", /소리/);
});
test("한이음 — 소리 안내의 「○초부터」 = 실제 첫 소리 시각(초 내림)", () => {
  const first = Math.min(...sfxTrack(ps, 30).map((x) => x.frame)) / 30;
  assert.ok(first > 0);
  assert.match(HANIUM[0].caption ?? "", new RegExp(`^이 영상은 ${Math.floor(first)}초부터 `));
});
test("한이음 — 제목 → 작업 시작(단계 목록 없이) → 켜짐 점검 → 예선 장면 순서 그대로(로고 · 안경 쓰기 뺌)", () => {
  const key = (c: (typeof HANIUM)[number]) => [c.take, c.run, c.from, c.to, c.speed, c.hold, c.caption].join("|");
  assert.deepEqual(HANIUM[1].cta, {panel: false});
  assert.ok(HANIUM[2].boot === true);
  assert.deepEqual(HANIUM.slice(2).map(key), FEATURE17.filter((c) => c.take !== "intro_logo" && c.take !== "20261011_glasses3").map(key));
});
test("한이음 — 켜짐 = 가상 세계 없이 점검만 · 단계 목록은 점검 완료 뒤 · 켜짐 장면 안에서 나타남", () => {
  assert.equal(HANIUM_BOOT.world, false);
  assert.ok(HANIUM_BOOT.panelAt > BANNER_FROM && HANIUM_BOOT.panelAt < CHECK_SEC, `${HANIUM_BOOT.panelAt}`);
});
test("한이음 — 촬영 소리 끔 · 남는 소리는 실제 시스템 출력과 음성 비서 대화뿐", () => {
  assert.ok(HANIUM.every((c) => c.mute && !c.sound));
  const names = sfxTrack(ps, 30).map((s) => s.name);
  assert.ok(names.every((n) => n.startsWith("tts_") || n === "sfx_alarm" || n === "sfx_chime"), names.join(","));
  for (const n of ["tts_warn2", "tts_block2", "sfx_alarm", "sfx_chime", "tts_w_wake", "tts_step1"]) assert.ok(names.includes(n), n);
});
test("한이음 — 오른쪽 아래 글씨는 장면마다 잠깐(작업 시작 + 절마다 첫 화면) · 그 장면의 사실만", () => {
  const cs = HANIUM;
  assert.ok(cs[1].cta && cs[1].note);
  const secs = cs.flatMap((c, i) => (c.card === "section" ? [[c.section!.title, cs.slice(i + 1).find((x) => !x.card)!] as const] : []));
  assert.deepEqual(secs.map(([t]) => t), ["버튼", "손", "공구", "스침", "경고", "차단", "공구 질문", "단계 질문"]);
  for (const [t, shot] of secs) {
    assert.ok(shot.note, t);
    if (["버튼", "손", "공구"].includes(t)) assert.match(shot.note!, /인식은 실제 AI 모델 결과/, t);
    if (["경고", "차단", "공구 질문", "단계 질문"].includes(t)) assert.match(shot.note!, /연출 · .*AI 합성/, t);
  }
  assert.equal(cs.filter((c) => c.note).length, 9);
});
