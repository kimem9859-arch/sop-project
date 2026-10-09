// 편집표 한 줄 = 한 촬영(take)의 원본 구간 · 배속 · 오버레이 여부 · 자막 · 배속 표기 · boot = 이 구간 시작에 HUD 켜짐
export type Clip = {take: string; file: string; from: number; to: number; speed: number; overlay: boolean;
  caption?: string; badge?: string; boot?: boolean};
export type Placed = {clip: Clip; start: number; frames: number};

export function place(clips: Clip[], fps: number): Placed[] {
  let start = 0;
  return clips.map((clip) => {
    if (!(clip.to > clip.from) || !(clip.speed > 0)) throw new Error(`잘못된 구간 ${clip.take} ${clip.from}~${clip.to} ×${clip.speed}`);
    const frames = Math.round(((clip.to - clip.from) / clip.speed) * fps);
    const p = {clip, start, frames};
    start += frames;
    return p;
  });
}
export const srcSec = (c: Clip, local: number, fps: number) => c.from + (local / fps) * c.speed;
export const totalFrames = (ps: Placed[]) => ps.reduce((s, p) => s + p.frames, 0);
