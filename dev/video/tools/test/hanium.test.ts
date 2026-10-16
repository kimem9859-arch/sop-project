import {test} from "node:test";
import assert from "node:assert/strict";
import {place, sfxTrack, totalFrames} from "../../src/lib/edit.ts";
import {FEATURE17} from "../../src/edits/feature17.ts";
import {HANIUM} from "../../src/edits/hanium.ts";

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
test("한이음 — 예선 영상의 장면을 순서 그대로(로고만 뺌)", () => {
  const key = (c: (typeof HANIUM)[number]) => [c.take, c.run, c.from, c.to, c.speed, c.hold, c.caption].join("|");
  assert.deepEqual(HANIUM.slice(1).map(key), FEATURE17.filter((c) => c.take !== "intro_logo").map(key));
});
test("한이음 — 촬영 소리 끔 · 남는 소리는 실제 시스템 출력과 음성 비서 대화뿐", () => {
  assert.ok(HANIUM.every((c) => c.mute && !c.sound));
  const names = sfxTrack(ps, 30).map((s) => s.name);
  assert.ok(names.every((n) => n.startsWith("tts_") || n === "sfx_alarm" || n === "sfx_chime"), names.join(","));
  for (const n of ["tts_warn2", "tts_block2", "sfx_alarm", "sfx_chime", "tts_w_wake", "tts_step1"]) assert.ok(names.includes(n), n);
});
