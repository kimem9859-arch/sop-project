import type {CalloutDef} from "./callout.ts";

// 편집표 한 줄 = 한 촬영(take)의 원본 구간 · 배속 · 오버레이 여부 · 자막 · 배속 표기 · boot = 이 구간 시작에 HUD 켜짐
// hold = from 프레임에서 화면을 멈추는 초(to = from) — 탐지 연출 동안 배경을 멈추고 흐리게(10/9 초안 피드백) · intro = 그 동안의 연출(end = 끝맺음 요약)
// chapter · section = 이 구간 시작에 장 · 절 제목(기능 소개 영상) · run = 같은 촬영의 다른 연출 기록(절마다 따로 꾸밀 때)
// intro tool = 공구 탐지 연출 · overlap = 손·공구 겹침(쥠 판정 시작) 강조 · dwell = 머묾 타이머를 멈춘 화면에서 채움(경고 절) · callout = 사람이 짚은 표시(타워램프)
export type Clip = {take: string; file: string; from: number; to: number; speed: number; overlay: boolean;
  caption?: string; badge?: string; boot?: boolean; hold?: number; intro?: "buttons" | "hand" | "tool" | "overlap" | "dwell" | "end";
  chapter?: {no: string; title: string; desc: string}; section?: {no: string; title: string; desc: string}; run?: string;
  callout?: CalloutDef; card?: "chapter" | "section"; tip?: boolean; fadeOut?: number; fadeIn?: number;
  subs?: [number, number, string][]; sfx?: [number, string, number?][]};
// card = 장 · 절 제목 카드(정지 구간 · 화면을 어둡게 하고 제목만) — 시안 2 피드백 「절 제목은 따로 독립 제목 카드로」
// tip = 검지 끝 빛 꼬리(판정 장면 · 시안 8) · fadeOut · fadeIn = 끝 · 처음 몇 초 동안 검은 화면으로 사라짐 · 검은 화면에서 나타남(로고 인트로 → 안경 장면 · 시안 11 · 12)
// subs = 구간 안 자막 [시작, 끝, 문장](구간 시작부터 화면 초) — 한 구간 안에서 문장이 바뀔 때 · 구간 전체 한 문장이면 caption
// sfx = 구간 안 소리 [시작, 이름(public/audio/<이름>.wav), 음량?](구간 시작부터 화면 초 · 시안 14 효과음 · TTS)
export type Placed = {clip: Clip; start: number; frames: number};

export function place(clips: Clip[], fps: number): Placed[] {
  let start = 0;
  return clips.map((clip) => {
    const ok = clip.hold !== undefined ? clip.hold > 0 : clip.to > clip.from && clip.speed > 0;
    if (!ok) throw new Error(`잘못된 구간 ${clip.take} ${clip.from}~${clip.to} ×${clip.speed} 정지 ${clip.hold ?? "-"}`);
    const frames = Math.round((clip.hold ?? (clip.to - clip.from) / clip.speed) * fps);
    const p = {clip, start, frames};
    start += frames;
    return p;
  });
}
export const srcSec = (c: Clip, local: number, fps: number) => (c.hold !== undefined ? c.from : c.from + (local / fps) * c.speed);
export const totalFrames = (ps: Placed[]) => ps.reduce((s, p) => s + p.frames, 0);

// 켜짐 시계 — 구간마다 시작 시점의 켜짐 초(at)와 그 구간에서 흐르는지(runs) · boot 구간 앞은 null
// 제목 카드(card) 동안은 멈춘다 — 점검 목록과 버튼 탐지 사이에 장 · 절 제목 카드를 끼워도 켜짐 순서가 이어진다
export function bootTimes(ps: Placed[], fps: number): ({at: number; runs: boolean} | null)[] {
  let t: number | null = null;
  return ps.map((p) => {
    if (p.clip.boot && t === null) t = 0;
    if (t === null) return null;
    const out = {at: t, runs: !p.clip.card};
    if (out.runs) t += p.frames / fps;
    return out;
  });
}

// 자막 트랙 — 구간마다 caption(구간 전체) · subs(구간 안 화면 초)를 편집 전체 프레임으로 펴고, 바로 이어지는 같은 문장은 하나로 묶는다
//   (같은 문장이 정지 구간 → 재생 구간으로 이어질 때 깜빡이지 않게 · 시안 13 「장면에 맞는 자막」) · 제목 카드 구간에는 자막 없음
export type Cue = {start: number; end: number; text: string};
export function captionTrack(ps: Placed[], fps: number): Cue[] {
  const out: Cue[] = [];
  for (const p of ps) {
    if (p.clip.card) continue;
    const segs: Cue[] = p.clip.caption ? [{start: p.start, end: p.start + p.frames, text: p.clip.caption}] : [];
    for (const [a, b, text] of p.clip.subs ?? [])
      segs.push({start: p.start + Math.round(a * fps), end: Math.min(p.start + p.frames, p.start + Math.round(b * fps)), text});
    for (const c of segs) {
      const last = out[out.length - 1];
      if (last && last.end === c.start && last.text === c.text) last.end = c.end;
      else if (c.end > c.start) out.push({...c});
    }
  }
  return out;
}

// 소리 트랙 — 구간마다 sfx 를 편집 전체 프레임으로 편다 · 구간 길이 밖의 소리는 버린다(편집이 바뀌어 구간이 짧아졌을 때)
export type Sound = {frame: number; name: string; volume: number};
export function sfxTrack(ps: Placed[], fps: number): Sound[] {
  return ps.flatMap((p) => (p.clip.sfx ?? [])
    .filter(([at]) => at >= 0 && Math.round(at * fps) < p.frames)
    .map(([at, name, volume]) => ({frame: p.start + Math.round(at * fps), name, volume: volume ?? 1})));
}
