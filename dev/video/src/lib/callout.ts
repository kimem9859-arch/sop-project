// 사람이 짚은 표시(검출 모델이 없는 것 — 타워램프)의 자리 · keys = [원본 초, x, y, w, h](사본 픽셀)
// 열쇠 사이는 직선으로 잇는다 · 첫·끝 열쇠 앞뒤 0.2초까지는 끝 값 · 그 밖은 null
export type Key = [number, number, number, number, number];
export type CalloutDef = {label: string; lines: {text: string; color: "warn" | "danger" | "done" | "label"}[]; keys: Key[]};
export function calloutAt(keys: Key[], sec: number): [number, number, number, number] | null {
  if (!keys.length || sec < keys[0][0] - 0.2 || sec > keys[keys.length - 1][0] + 0.2) return null;
  let i = 0;
  while (i < keys.length - 2 && sec > keys[i + 1][0]) i++;
  const [t0, ...a] = keys[i], [t1, ...b] = keys[Math.min(i + 1, keys.length - 1)];
  const u = t1 > t0 ? Math.min(1, Math.max(0, (sec - t0) / (t1 - t0))) : 0;
  return [0, 1, 2, 3].map((j) => a[j] + (b[j] - a[j]) * u) as [number, number, number, number];
}
