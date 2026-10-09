// 편집표 한 줄 = 한 촬영(take)의 원본 구간 · 배속 · 오버레이 여부 · 자막 · 배속 표기 · boot = 이 구간 시작에 HUD 켜짐
// hold = from 프레임에서 화면을 멈추는 초(to = from) — 탐지 연출 동안 배경을 멈추고 흐리게(10/9 초안 피드백) · intro = 그 동안의 연출(end = 끝맺음 요약)
// chapter = 이 구간 시작에 장 제목(기능 소개 영상)
export type Clip = {take: string; file: string; from: number; to: number; speed: number; overlay: boolean;
  caption?: string; badge?: string; boot?: boolean; hold?: number; intro?: "buttons" | "hand" | "end";
  chapter?: {no: string; title: string; desc: string}};
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
