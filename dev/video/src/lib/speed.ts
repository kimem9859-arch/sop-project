import {detAt, stableBox, type Box, type Dets, type Pt} from "./dets.ts";

// 판정 기준 장면의 손끝 속도(수정 18 · 사용자 「버튼으로 빨리 가다가 멈추는 연출로 손 속도도 판정 기준」)
//   = 검지 끝(손 21점의 8번)이 SPEED_WIN 초 동안 움직인 거리 ÷ 시간(사본 픽셀/초 · 실제 검출 그대로)
//   실제 시스템(판정 기준 안 B) = 오답 버튼 안쪽 상자에서 손끝 속도가 XGA 700 px/s 이하면 체류를 기다리지 않고 바로 경고(Rpi5 fsm.py
//   경고 이유 "slow" · 최종 정리 5.2) — 속도는 직전 3장(0.25초 안) 가운데 손끝이 있는 가장 가까운 장까지(보통 1장 · 17 fps 에서 약 0.06초)
//   🔑 영상의 0.1초 창은 30 fps 폰 영상의 흔들림을 누르는 평활(실제 창과 다름) · 0.1초 전에 손이 없으면 창 안에서 가장 먼 손 있는 장으로
//   🔑 SLOW_PX_S 는 개념 표시 — 폰 사본 픽셀과 안경 카메라(XGA) 픽셀은 크기가 달라 숫자는 화면에 쓰지 않는다(판정 구역 링 폭과 같은 방식)
//     이 촬영(버튼 상자 폭 약 57 px)에서 B3 로 다가오는 손(600~670 · 상자 안 536~642)과 B3 위에서 느려지는 손(358 → 54)을 가른다
export const SPEED_WIN = 0.1, SLOW_PX_S = 400, SPEED_MAX = 900;

const tipOf = (d: Dets, sec: number): Pt | null => detAt(d, sec).hand?.[8] ?? null;
const inside = (b: Box, p: Pt) => p[0] >= b[2] && p[0] <= b[4] && p[1] >= b[3] && p[1] <= b[5];

export function tipSpeed(d: Dets, sec: number, win = SPEED_WIN): number | null {
  const b = tipOf(d, sec);
  if (!b) return null;
  for (let j = 0, n = Math.round(win * d.fps); j < n; j++) {   // 0.1초 전 → 손이 없으면 한 장씩 가까이(손이 막 나타난 장도 값이 나오게 · 리뷰)
    const dt = win - j / d.fps, a = tipOf(d, sec - dt);
    if (a) return Math.hypot(b[0] - a[0], b[1] - a[1]) / dt;
  }
  return null;
}

// 계기 읽기 — approach = 그 버튼 밖(규칙이 아직 적용되지 않음) · fast = 상자 안 · 빠름 · slow = 상자 안에서 기준 아래(→ 바로 경고)
//   passed = 상자를 빠르게 지나 나감(back 초 동안 상자 안 마지막 속도 — 스침) · 손이 없고 최근 상자 안 기록도 없으면 null
//   🔑 촬영 장(정수 프레임)마다 판정한다 — 실제 시스템도 카메라 장마다 판정 · 프레임 사이 시각으로 거슬러 보면 값이 톱니처럼 떨렸다(리뷰)
//   🔑 상자 안에서 한 번 느려지면 back 초 동안 「느려짐」 유지 — 실제 FSM 도 해제 전까지 경고를 유지한다(카메라가 움직여 상자가 밀린 장에서
//     「지나감」이 비치던 것 · 리뷰)
export type SpeedRead = {v: number; kind: "approach" | "fast" | "slow" | "passed"};
export function speedRead(d: Dets, sec: number, box: Box, back = 1): SpeedRead | null {
  const f0 = Math.floor(sec * d.fps + 1e-6);
  const at = (k: number) => ({q: tipOf(d, (f0 - k) / d.fps), w: tipSpeed(d, (f0 - k) / d.fps)});
  const now = at(0);
  let last: number | null = null;
  for (let k = 0; k <= Math.round(back * d.fps); k++) {
    const {q, w} = at(k);
    if (!q || w === null || !inside(box, q)) continue;
    if (w <= SLOW_PX_S) return {v: now.w ?? w, kind: "slow"};
    last ??= w;
  }
  if (now.q && now.w !== null && inside(box, now.q)) return {v: now.w, kind: "fast"};
  if (last !== null) return {v: last, kind: "passed"};
  return now.w === null ? null : {v: now.w, kind: "approach"};
}

// from ~ to 초 사이에서 손끝이 name 버튼 상자(판정 구역과 같은 stableBox) 안에 처음 든 장 · 그 안에서 기준 아래로 처음 떨어진 장(초) — 연출 기록의 시각
const firstAt = (d: Dets, from: number, to: number, name: string, ok: (v: number) => boolean): number | null => {
  for (let f = Math.ceil(from * d.fps - 1e-6); f <= Math.floor(to * d.fps + 1e-6); f++) {
    const t = f / d.fps, b = stableBox(d, t, name), p = tipOf(d, t), v = tipSpeed(d, t);
    if (b && p && v !== null && inside(b, p) && ok(v)) return t;
  }
  return null;
};
export const enterAt = (d: Dets, from: number, to: number, name: string) => firstAt(d, from, to, name, () => true);
export const slowAt = (d: Dets, from: number, to: number, name: string) => firstAt(d, from, to, name, (v) => v <= SLOW_PX_S);
