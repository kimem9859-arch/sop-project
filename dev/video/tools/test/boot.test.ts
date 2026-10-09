import {test} from "node:test";
import assert from "node:assert/strict";
import {BOOT_SEC, BTN_INTRO_SEC, CHECK_SEC, SCAN_FROM, SCAN_HOLD_SEC, SCAN_TO, scanPassBoot, scanY} from "../../src/lib/boot.ts";

const near = (a: number, b: number, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

test("스캔 선은 SCAN_FROM 에 맨 위, SCAN_TO 에 맨 아래(거의)", () => {
  near(scanY(SCAN_FROM, 1080), 0);
  assert.ok(scanY(SCAN_TO, 1080) > 1078);
});
test("scanPassBoot — 스캔 선이 그 높이를 지나간 boot 값(역함수)", () => {
  for (const y of [0, 100, 540, 900, 1070]) near(scanY(scanPassBoot(y, 1080), 1080), y, 1e-3);
});
test("화면 맨 아래 버튼도 정지 구간이 끝나기 전에 탐지 연출을 마친다(연출이 잘리지 않게)", () => {
  assert.ok(CHECK_SEC + SCAN_HOLD_SEC - scanPassBoot(1079, 1080) * BOOT_SEC >= BTN_INTRO_SEC);
});
test("스캔은 점검 목록이 끝난 뒤(정지 구간 안)에만 지나간다", () => {
  assert.ok(SCAN_FROM * BOOT_SEC >= CHECK_SEC);
  assert.ok(SCAN_TO * BOOT_SEC <= CHECK_SEC + SCAN_HOLD_SEC);
});
