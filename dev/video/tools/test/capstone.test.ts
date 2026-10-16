import {test} from "node:test";
import assert from "node:assert/strict";
import {CHECK_SEC} from "../../src/lib/boot.ts";
import {bootTimes, place, sfxTrack, totalFrames} from "../../src/lib/edit.ts";
import {CAPSTONE} from "../../src/edits/capstone.ts";
import {FEATURE17_STAGED} from "../../src/edits/feature17.ts";

// 캡스톤 본선 제출판(설계 D83) — 예선 영상(시안 17)에서 장면을 골라 약 1분 10초
const ps = place(CAPSTONE, 30);
const cs = ps.map((p) => p.clip);
test("캡스톤 — 길이 66~76초(사용자 「1분 10초 안팎」)", () => {
  const sec = totalFrames(ps) / 30;
  assert.ok(sec >= 66 && sec <= 76, `${sec}초`);
});
test("캡스톤 — 로고 → 작업 시작 → 01 · 02 · 03 장 · 안경 쓰기 · 켜짐 · 공구 질문 · 안경 벗기 없음 · 틀린 공구 있음", () => {
  assert.equal(cs[0].take, "intro_logo");
  assert.ok(cs[1].cta);
  assert.deepEqual(cs.filter((c) => c.card === "chapter").map((c) => c.chapter!.no), ["01", "02", "03"]);
  assert.ok(!cs.some((c) => c.take === "20261011_glasses3" || c.take === "20261011_glassesoff"));
  assert.ok(!cs.some((c) => c.boot === true));
  assert.ok(!cs.some((c) => c.run === "voice1"));
  assert.ok(cs.some((c) => c.run === "other"));
  assert.deepEqual(cs.filter((c) => c.card === "section" && c.run === "voice2").map((c) => c.section!.no), ["1"]);
});
test("캡스톤 — 01 장 카드에서 켜짐 시계가 점검 끝(CHECK_SEC)부터 · 버튼 탐지 정지가 그 시계로 흐름", () => {
  const bt = bootTimes(ps, 30);
  const i = ps.findIndex((p) => p.clip.card === "chapter" && p.clip.chapter?.no === "01");
  const j = ps.findIndex((p) => p.clip.intro === "buttons");
  assert.deepEqual(bt[i], {at: CHECK_SEC, runs: false});
  assert.deepEqual(bt[j], {at: CHECK_SEC, runs: true});
  assert.ok(bt.slice(0, i).every((b) => b === null));
});
test("캡스톤 — 03 장 카드는 단계 질문 첫 화면 위(같은 갈래 voice2) · 마지막은 검게 사라짐", () => {
  const k = cs.findIndex((c) => c.card === "chapter" && c.chapter?.no === "03");
  assert.equal(cs[k].run, "voice2");
  assert.equal(cs[k].from, cs[k + 1].from);
  assert.ok((cs.at(-1)!.fadeOut ?? 0) > 0);
});
test("캡스톤 — 소리가 빠지지 않음 · 오버레이 구간마다 연출 기록", () => {
  assert.equal(sfxTrack(ps, 30).length, CAPSTONE.reduce((n, c) => n + (c.sfx?.length ?? 0), 0));
  for (const c of cs.filter((x) => x.overlay)) assert.ok(FEATURE17_STAGED[c.run ? `${c.take}#${c.run}` : c.take], `${c.take}#${c.run}`);
});
