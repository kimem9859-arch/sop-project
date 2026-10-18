import {test} from "node:test";
import assert from "node:assert/strict";
import {BANNER_FROM, BANNER_TO, BOOT_SEC, BTN_INTRO_SEC, BTN_ORDER, CHECK_SEC, HEAD_AT, PANEL_FROM, RECIPE_OK, SCAN_END, SCAN_HOLD_SEC, WORLD_SEC, btnIntroAge, scanY, LIST_END, panelState} from "../../src/lib/boot.ts";

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
// 시안 17 피드백 — 「가상 환경 · 상태 점검 · 점검 완료를 한 장면으로」·「작업 레시피 불러오기가 정상이 되면 단계 UI」
test("단계 목록은 레시피 줄이 정상이 될 때 나타나고, 버튼 탐지(정지 구간) 전이다", () => {
  near(PANEL_FROM * BOOT_SEC, RECIPE_OK, 1e-6);
  assert.ok(PANEL_FROM * BOOT_SEC < CHECK_SEC);
});
test("한 장면 — 가상 세계가 열린 뒤 점검 목록 · 같은 띠 안 「점검 완료」 · 띠와 가상 세계가 함께 걷힌다", () => {
  assert.ok(HEAD_AT >= 0.6, "눈꺼풀이 열린 뒤");
  assert.ok(BANNER_FROM > RECIPE_OK, "4줄이 모두 정상이 된 뒤 점검 완료");
  assert.ok(WORLD_SEC >= BANNER_TO, "가상 세계는 띠가 걷힐 때까지");
  assert.ok(CHECK_SEC > BANNER_TO);
});
test("단계 목록 등장 — 기본값(레시피 줄 정상)은 옛 식과 비트 단위로 같다 · 편집별 시각(panelAt)도 같은 식(한이음 D84 · 최종 리뷰 Important)", () => {
  // 옛 식(Hud) = shown: boot >= PANEL_FROM · age: (boot - PANEL_FROM) * BOOT_SEC — 지지직이 floor(age × 30) 을 써서 반올림 하나가 프레임을 바꾼다
  for (let n = 0; n < 400; n++) {
    const boot = (n / 30) / BOOT_SEC;
    const p = panelState(boot);
    assert.equal(p.shown, boot >= PANEL_FROM, `n=${n}`);
    assert.equal(p.age, boot >= 1 ? null : (boot - PANEL_FROM) * BOOT_SEC, `n=${n}`);
  }
  assert.equal(panelState(LIST_END / BOOT_SEC - 1e-9, LIST_END).shown, false);
  assert.equal(panelState(LIST_END / BOOT_SEC, LIST_END).shown, true);
});
