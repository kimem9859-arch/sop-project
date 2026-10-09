import {test} from "node:test";
import assert from "node:assert/strict";
import {BOOT_SEC, SCAN_FROM, SCAN_TO, scanPassBoot, scanY} from "../../src/lib/boot.ts";

const near = (a: number, b: number, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

test("스캔 선은 SCAN_FROM 에 맨 위, SCAN_TO 에 맨 아래(거의)", () => {
  near(scanY(SCAN_FROM, 1080), 0);
  assert.ok(scanY(SCAN_TO, 1080) > 1078);
});
test("scanPassBoot — 스캔 선이 그 높이를 지나간 boot 값(역함수)", () => {
  for (const y of [0, 100, 540, 900, 1070]) near(scanY(scanPassBoot(y, 1080), 1080), y, 1e-3);
});
test("화면 맨 아래 버튼도 켜짐이 끝나기 0.7초 전에 스캔이 지나간다(탐지 연출이 잘리지 않게)", () => {
  assert.ok((1 - scanPassBoot(1079, 1080)) * BOOT_SEC >= 0.7);
});
