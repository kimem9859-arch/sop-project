import type {CalloutDef} from "./callout.ts";

// 편집표 한 줄 = 한 촬영(take)의 원본 구간 · 배속 · 오버레이 여부 · 자막 · 배속 표기 · boot = 이 구간 시작에 HUD 켜짐
// hold = from 프레임에서 화면을 멈추는 초(to = from) — 탐지 연출 동안 배경을 멈추고 흐리게(10/9 초안 피드백) · intro = 그 동안의 연출(end = 끝맺음 요약)
// chapter · section = 이 구간 시작에 장 · 절 제목(기능 소개 영상) · run = 같은 촬영의 다른 연출 기록(절마다 따로 꾸밀 때)
// intro tool = 공구 탐지 연출 · overlap = 손·공구 겹침(쥠 판정 시작) 강조 · dwell = 머묾 타이머를 멈춘 화면에서 채움(경고 절) · callout = 사람이 짚은 표시(타워램프)
export type Clip = {take: string; file: string; from: number; to: number; speed: number; overlay: boolean;
  caption?: string; badge?: string; boot?: boolean | number; hold?: number; intro?: "buttons" | "hand" | "tool" | "overlap" | "dwell" | "end";
  chapter?: {no: string; title: string; desc: string}; section?: {no: string; title: string; desc: string}; run?: string;
  callout?: CalloutDef; card?: "chapter" | "section"; tip?: boolean; fadeOut?: number; fadeIn?: number;
  subs?: [number, number, string][]; sfx?: [number, string, number?][];
  sound?: boolean; hud?: number; quiet?: boolean; noTool?: boolean; hideBtn?: string[]; spot?: string; dim?: [number, number];
  focus?: "hand" | "tool" | "overlap"; factFrom?: string; factGauge?: boolean; shutdown?: number; meter?: boolean; cta?: {panel: boolean}; projTitle?: string[]; mute?: boolean; note?: string};
// card = 장 · 절 제목 카드(정지 구간 · 화면을 어둡게 하고 제목만) — 시안 2 피드백 「절 제목은 따로 독립 제목 카드로」
// tip = 검지 끝 빛 꼬리(판정 장면 · 시안 8) · fadeOut · fadeIn = 끝 · 처음 몇 초 동안 검은 화면으로 사라짐 · 검은 화면에서 나타남(로고 인트로 → 안경 장면 · 시안 11 · 12)
// subs = 구간 안 자막 [시작, 끝, 문장](구간 시작부터 화면 초) — 한 구간 안에서 문장이 바뀔 때 · 구간 전체 한 문장이면 caption
// sfx = 구간 안 소리 [시작, 이름(public/audio/<이름>.wav), 음량?](구간 시작부터 화면 초 · 시안 14 효과음 · TTS)
// 시안 17 — sound = 배속이어도 원본 소리를 낸다(로고 · 렌더 때 음 높이는 유지된다) · hud = HUD 기록 시계를 이 초부터 화면 초로 흘린다
//   (정지 · 느린 재생 중에도 음성비서 연출이 실제 속도로 — 없으면 원본 초) · quiet = 공구 인식 연출 동안 단계 목록 · 대기 시간 숨김
//   noTool = 공구 박스를 그리지 않음 · hideBtn = 그리지 않을 버튼 박스(공구함의 빨간 손잡이가 EMO 로 잡히는 것)
//   intro 는 정지(hold) 구간뿐 아니라 재생 구간에도 쓴다 — 재생 중 탐지 연출(시안 17 「영상을 계속 재생한 상태에서」)
//   spot = 판정 장면 — 배경만 흐리고 어둡게 · 손과 이 버튼(판정 구역)은 선명(시안 17 2차 피드백)
//   dim = [시작, 끝](구간 안 화면 초) 동안 영상 전체를 흐리고 어둡게 — 음성비서 호출 ~ 답 직전(시안 17 2차 피드백 · UI 는 위라 선명)
//   focus = 탐지 연출(intro) 없이 배경만 흐리고 어둡게 · 이 주인공(손 · 공구 · 둘 다)은 선명 — 탐지 연출 앞뒤 재생 구간이 끊기지 않게(시안 17 3차)
//   factFrom = 사실 카드 「검출 결과」 빛줄기를 낼 버튼(시안 17 3차 피드백 「B2 가 아닌 B1 에서 시작」)
//   factGauge = 대기 시간 UI 에서도 사실 카드로 빛줄기(시안 17 4차 · 단계 질문) · shutdown = 이 구간 시작 뒤 몇 초에 HUD 꺼짐 연출(안경 벗기 · 시안 17 4차)
//   meter = 손끝 확대 창 + 손끝 속도 계기(판정 장면 · spot 버튼 기준 · hud/SpeedMeter · 수정 18)
//   cta = 「작업 시작」 누름 화면(hud/StartCta · 시간표 CTA · 캡스톤 D83) · panel = 누른 직후 단계 목록(캡스톤) · 아니면 켜짐 점검 뒤(한이음 D84)
//   projTitle = 작품 이름 제목 화면의 줄들(hud/TitleCard · 한이음 D84) · mute = 촬영 소리 끔(한이음 「음성/음향 사용 불가」 · D84)
//   note = 이 구간 시작에 오른쪽 아래 글씨를 잠깐(noteTrack · 늘 떠 있는 표기 대신 장면마다 그 장면의 사실만 · 한이음 D84 ⑥)
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
// boot 가 숫자면 켜짐 시계를 그 초부터 — 켜짐 장면을 빼고 장 카드에서 바로 버튼 탐지로(캡스톤 D83 · boot: CHECK_SEC)
export function bootTimes(ps: Placed[], fps: number): ({at: number; runs: boolean} | null)[] {
  let t: number | null = null;
  return ps.map((p) => {
    if (p.clip.boot !== undefined && p.clip.boot !== false && t === null) t = p.clip.boot === true ? 0 : p.clip.boot;
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

// 알림 글씨 트랙 — note 가 있는 구간 시작부터 sec 초 · 다음 알림 · 다음 제목 카드가 오면 거기서 끊고 편집 끝을 넘지 않는다(그 밖의 구간 경계는 넘어 이어짐)
export function noteTrack(ps: Placed[], fps: number, sec: number): Cue[] {
  const end = totalFrames(ps);
  const starts = ps.filter((p) => p.clip.note).map((p) => ({start: p.start, text: p.clip.note!}));
  const cardAt = (f: number) => ps.find((p) => p.clip.card && p.start > f)?.start ?? end;
  return starts.map((n, i) => ({...n, end: Math.min(n.start + Math.round(sec * fps), starts[i + 1]?.start ?? end, cardAt(n.start), end)}));
}

// 소리 트랙 — 구간마다 sfx 를 편집 전체 프레임으로 편다 · 구간 길이 밖의 소리는 버린다(편집이 바뀌어 구간이 짧아졌을 때)
export type Sound = {frame: number; name: string; volume: number};
export function sfxTrack(ps: Placed[], fps: number): Sound[] {
  return ps.flatMap((p) => (p.clip.sfx ?? [])
    .filter(([at]) => at >= 0 && Math.round(at * fps) < p.frames)
    .map(([at, name, volume]) => ({frame: p.start + Math.round(at * fps), name, volume: volume ?? 1})));
}
