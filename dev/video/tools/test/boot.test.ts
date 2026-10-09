import {test} from "node:test";
import assert from "node:assert/strict";
import {BANNER_TO, BOOT_SEC, BTN_INTRO_SEC, BTN_ORDER, CHECK_SEC, HEAD_AT, PANEL_FROM, SCAN_END, SCAN_HOLD_SEC, WORLD_SEC, btnIntroAge, scanY} from "../../src/lib/boot.ts";

// 10/9 시안 1 피드백 — 점검 목록 → 「점검 완료」 따로 → 정지 구간: 스캔 선이 내려갔다 다시 올라옴 · 버튼 파동은 B1→B2→B3→B4→EMO 차례로
const near = (a: number, b: number, e = 1) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

test("스캔 선 — 정지 구간 안에서 위 → 아래 → 위 · 그 밖에는 없음", () => {
  const ys: number[] = [];
  for (let s = CHECK_SEC; s < CHECK_SEC + SCAN_HOLD_SEC; s += 0.01) { const y = scanY(s, 1080); if (y !== null) ys.push(y); }
  assert.ok(ys.length > 0);
  near(ys[0], 0, 30);
  near(Math.max(...ys), 1080, 30);
  near(ys[ys.length - 1], 0, 30);
  assert.equal(scanY(CHECK_SEC - 0.5, 1080), null);
  assert.equal(scanY(BOOT_SEC - 0.1, 1080), null);
});
test("버튼 탐지 연출 — 정해진 차례로 시작하고, 마지막 버튼도 정지가 풀리기 전에 끝난다", () => {
  const starts = BTN_ORDER.map((b) => CHECK_SEC - btnIntroAge(b, CHECK_SEC)!);
  starts.slice(1).forEach((s, i) => assert.ok(s > starts[i] + 0.3, "앞 버튼보다 늦게 · 너무 빠르지 않게"));
  assert.ok(starts[starts.length - 1] + BTN_INTRO_SEC <= CHECK_SEC + SCAN_HOLD_SEC);
  assert.ok(starts[0] >= CHECK_SEC);
  assert.equal(btnIntroAge("X", CHECK_SEC + 1), null);
});

// 시안 3 피드백 — 「스캔 왕복이 끝나면 버튼 강조」 · 「점검 완료 연출이 끝나면 작업 단계 UI」 · 「안경 프레임이 사라진 직후 가상 세계가 펼쳐지는 연출 = 인트로」
test("버튼 강조는 스캔 왕복이 끝난 뒤에 시작한다", () => {
  assert.ok(CHECK_SEC - btnIntroAge(BTN_ORDER[0], CHECK_SEC)! >= SCAN_END);
  assert.equal(scanY(SCAN_END + 0.05, 1080), null);
});
test("단계 목록은 점검 완료 뒤 · 버튼 탐지(정지 구간) 전에 나타난다", () => {
  assert.ok(PANEL_FROM * BOOT_SEC >= BANNER_TO);
  assert.ok(PANEL_FROM * BOOT_SEC < CHECK_SEC);
});
test("가상 세계가 펼쳐진 뒤에 점검 목록이 시작한다", () => {
  assert.ok(WORLD_SEC > 0 && HEAD_AT >= WORLD_SEC * 0.9);
});
