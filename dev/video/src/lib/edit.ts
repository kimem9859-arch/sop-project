import type {CalloutDef} from "./callout.ts";

// 편집표 한 줄 = 한 촬영(take)의 원본 구간 · 배속 · 오버레이 여부 · 자막 · 배속 표기 · boot = 이 구간 시작에 HUD 켜짐
// hold = from 프레임에서 화면을 멈추는 초(to = from) — 탐지 연출 동안 배경을 멈추고 흐리게(10/9 초안 피드백) · intro = 그 동안의 연출(end = 끝맺음 요약)
// chapter · section = 이 구간 시작에 장 · 절 제목(기능 소개 영상) · run = 같은 촬영의 다른 연출 기록(절마다 따로 꾸밀 때)
// intro tool = 공구 탐지 연출 · overlap = 손·공구 겹침(쥠 판정 시작) 강조 · dwell = 머묾 타이머를 멈춘 화면에서 채움(경고 절) · callout = 사람이 짚은 표시(타워램프)
export type Clip = {take: string; file: string; from: number; to: number; speed: number; overlay: boolean;
  caption?: string; badge?: string; boot?: boolean; hold?: number; intro?: "buttons" | "hand" | "tool" | "overlap" | "dwell" | "end";
  chapter?: {no: string; title: string; desc: string}; section?: {no: string; title: string; desc: string}; run?: string;
  callout?: CalloutDef; card?: "chapter" | "section"; tip?: boolean};
// card = 장 · 절 제목 카드(정지 구간 · 화면을 어둡게 하고 제목만) — 시안 2 피드백 「절 제목은 따로 독립 제목 카드로」
// tip = 검지 끝 빛 꼬리(판정 장면 · 시안 8)
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
