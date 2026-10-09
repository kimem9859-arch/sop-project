import type {Clip, Placed} from "./edit.ts";

// 화면 효과의 순수 계산(시안 8 피드백 「연출 · 효과 … 테크적이고 화려하게」) — 같은 입력이면 같은 값(렌더가 몇 번이든 같은 영상)
export const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 글자가 써지는 연출 — age 초 동안 dur 에 걸쳐 앞에서부터(한글 한 글자 단위)
export function typed(text: string, age: number, dur: number): string {
  const cs = Array.from(text);
  const n = age <= 0 ? 0 : age >= dur ? cs.length : Math.ceil((cs.length * age) / dur);  // 올림 — 시작하자마자 첫 글자
  return cs.slice(0, n).join("");
}

// 화면 흔들림 — 처음 amp px 에서 dur 초에 걸쳐 0 으로(제곱 감쇠) · 30fps 박자로 방향이 바뀐다
export function shake(age: number, amp: number, dur: number): [number, number] {
  if (age < 0 || age >= dur) return [0, 0];
  const k = amp * (1 - age / dur) ** 2, f = Math.floor(age * 30);
  return [(rnd(f) * 2 - 1) * k, (rnd(f + 97) * 2 - 1) * k];
}

// 화면 시계 — 원본 sinceSec 가 처음 화면에 나온 프레임부터 지금(ps[i] 의 f 프레임)까지 화면 초
//   같은 촬영 갈래(take · run)로 이어진 구간만 거슬러 찾는다 · 느린 재생 → 정지로 넘어가도 거꾸로 가지 않는다(리뷰 지적 — 차단 순간 2프레임 되감김)
//   화면에 나온 적이 없으면 null
export function screenSince(ps: Placed[], i: number, f: number, fps: number, sinceSec: number): number | null {
  const same = (a: Clip, b: Clip) => a.take === b.take && a.run === b.run;
  let at: number | null = null;
  for (let j = i; j >= 0 && same(ps[j].clip, ps[i].clip); j--) {
    const c = ps[j].clip;
    if (c.hold !== undefined) { if (!c.card && Math.abs(c.from - sinceSec) < 1e-6) at = ps[j].start; }
    else if (c.from <= sinceSec && sinceSec <= c.to) at = ps[j].start + ((sinceSec - c.from) / c.speed) * fps;
  }
  return at === null ? null : (ps[i].start + f - at) / fps;
}

// 장 전환 — f 가 장 제목 카드의 첫 win 초 안이면 카드 시작 뒤 초 · 아니면 null
export function burstAge(ps: Placed[], f: number, fps: number, win: number): number | null {
  const p = ps.find((x) => x.start <= f && f < x.start + x.frames);
  if (!p || p.clip.card !== "chapter") return null;
  const a = (f - p.start) / fps;
  return a < win ? a : null;
}
