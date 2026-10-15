// 화면 보기(확대) — 원본 초마다 [초, 배율 z, 중심 cx, cy](원본 정규 좌표 0~1) 기준점을 두고 그 사이를 부드럽게 잇는다
//   용도 = ① 이어 붙이는 두 장면의 버튼 자리를 맞춤(안경 → 패널) ② 디스플레이 비침 · 문이 보이는 순간만 확대해 화면 밖으로(시안 17 · 사용자 「공구를 손으로 가져올 때 컷편집으로 끊기니 이어지게」)
//   영상과 박스(검출 좌표) · 판정 구역은 같이 확대되고, 단계 목록 같은 화면 고정 UI 는 그대로다
export type ViewKey = [number, number, number, number];
export type View = {z: number; cx: number; cy: number};
export const IDENTITY: View = {z: 1, cx: 0.5, cy: 0.5};

const ease = (u: number) => u * u * (3 - 2 * u);

// 기준점 밖은 끝값 · 기준점이 없으면 원래 화면
export function viewAt(keys: ViewKey[] | undefined, sec: number): View {
  if (!keys || keys.length === 0) return IDENTITY;
  const pick = (k: ViewKey): View => ({z: k[1], cx: k[2], cy: k[3]});
  if (sec <= keys[0][0]) return pick(keys[0]);
  for (let i = 1; i < keys.length; i++) {
    const [a, b] = [keys[i - 1], keys[i]];
    if (sec <= b[0]) {
      const u = b[0] > a[0] ? ease((sec - a[0]) / (b[0] - a[0])) : 1;
      return {z: a[1] + (b[1] - a[1]) * u, cx: a[2] + (b[2] - a[2]) * u, cy: a[3] + (b[3] - a[3]) * u};
    }
  }
  return pick(keys[keys.length - 1]);
}

// 확대 창이 원본 밖으로 나가는 기준점(검은 테두리가 보임)을 찾는다 — 편집표 시험용
export const outOfFrame = (k: ViewKey) => {
  const h = 0.5 / k[1];
  return k[1] < 1 || k[2] - h < -1e-9 || k[2] + h > 1 + 1e-9 || k[3] - h < -1e-9 || k[3] + h > 1 + 1e-9;
};

// 화면 좌표 변환 — 원래 화면(W×H)의 점 p 를 확대 화면의 점으로: (p - c·W)·z + W/2
//   fit(검출 좌표 → 화면)에 그대로 얹는다: s' = s·z · x' = (x - cx·W)·z + W/2
export function zoomFit<F extends {s: number; x: number; y: number}>(fit: F, v: View, W: number, H: number): F {
  return {...fit, s: fit.s * v.z, x: (fit.x - v.cx * W) * v.z + W / 2, y: (fit.y - v.cy * H) * v.z + H / 2};
}
// 영상 요소 자리(원래 화면을 꽉 채우던 것을 같은 변환으로)
export const zoomRect = (v: View, W: number, H: number) =>
  ({left: (0 - v.cx * W) * v.z + W / 2, top: (0 - v.cy * H) * v.z + H / 2, width: W * v.z, height: H * v.z});
