import {LIST_END} from "../lib/boot.ts";
import {CTA} from "../lib/cta.ts";
import {place, sfxTrack, type Clip} from "../lib/edit.ts";
import {FEATURE17} from "./feature17.ts";

// 한이음 제출판(2026-10-16 · 설계 D84) — 예선 영상(시안 17 수정 19 · out/feature_final.mp4)을 한이음 공고문 「4) 시연 동영상」 조건에 맞춤
//   장면 · 자막은 시안 17 편집표 그대로(시안 17 은 바꾸지 않음) · 단계 이름 = 새 이름(최종 개발보고서 · 제작설계서도 새 이름으로 고치는 중 · 사용자)
//   ① 블라인드(학교명 · 실명 금지) — 로고 인트로에 소속 이름이 있어 뺌 → 작품 이름 제목 화면(hud/TitleCard)
//   ② 「설명은 자막 · 음성/음향/BGM 사용 불가 · 꼭 필요한 경우만 · 영상 시작 때 자막으로 표시」 — 실제 시스템이 내는 소리만 남기고
//      첫 화면 자막으로 알림 · 촬영 소리(잡음 · 누름 소리) 끔(mute)
//   ③ 「1분 30초 이내」 — 로고 5초 → 제목 화면 4초
//   ④ 1차 미리보기 피드백 — 안경 쓰기 · 가상 세계 대신 「작업 시작」 누름(hud/StartCta · 단계 목록 없이) → 시스템 점검(가상 세계 없이)
//      → 단계 목록은 점검이 끝나면(「점검 완료」 띠가 걷히기 시작할 때) · 누름 소리 없음(실제 화면 터치엔 소리가 없음 · ②)
//   ⑤ 다른 참가 영상 조사 뒤(사용자 10/18) — 소리 안내에 「○초부터」(첫 소리 시각을 편집에서 계산) · 문제 제기 한 줄은 넣어 봤다가 뺌(사용자)
//   ⑥ 오른쪽 아래 글씨 = 늘 떠 있는 한 줄 대신 장면이 시작될 때 그 장면의 사실만 잠깐(note · Cut noteTrack) — 사용자 10/18
//      「모든 내용을 한번에 계속 보여주려고 하지 말고 해당 되는 장면이 나오면 잠깐 나왔다가 사라지고」
export const HANIUM_TITLE = ["Vision AI 기반 웨어러블 연동", "작업자 Human Error 사전 예방 안전 콘솔"];   // 9/8 개발보고서 프로젝트명(두 줄)
const notice = (sec: number) => `이 영상은 ${sec}초부터 시스템 음성 알림, 차단 부저, 음성 비서 대화 소리가 있습니다`;
// 남기는 소리 = 실제 시스템 출력(최종-기능현황 FR-2 — 경고 = 음성 알림 · 차단 = 부저 + 음성 알림) + 음성 비서 대화(작업자 말 · 호출 띠링 · 답)
//   뺌 = 장면 전환 · 탐지 연출 효과음 · 경고 「삐」(실제 경고엔 소리 없이 음성 알림만) · 누름 · 자물쇠 · 켜짐 · 꺼짐
const KEEP = (name: string) => name.startsWith("tts_") || name === "sfx_alarm" || name === "sfx_chime";
const TITLE_SEC = 4.0;
// 켜짐 모양 — 가상 세계 없이 점검 띠만 · 단계 목록 = 「점검 완료」 뒤 띠가 걷히기 시작할 때(지지직 등장 · Cut BOOT_OPTS → Hud)
export const HANIUM_BOOT = {world: false, panelAt: LIST_END};
const SCENES = FEATURE17.filter((c) => c.take !== "intro_logo" && c.take !== "20261011_glasses3");   // 로고 · 안경 쓰기 뺌
const BOOT = SCENES[0];   // 켜짐 장면(콘솔 정면 · 손이 들어오기 전)
const TITLE: Clip = {take: BOOT.take, file: BOOT.file, from: BOOT.from, to: BOOT.from, speed: 1, overlay: false, hold: TITLE_SEC,
  projTitle: true, fadeOut: 0.5, mute: true};
// 작업 시작 — 켜짐 장면 첫 화면에서 멈춘 채로 버튼이 나타나 눌리고 사라질 때까지 → 바로 점검이 이어짐(같은 화면에서 재생)
const START: Clip = {take: BOOT.take, file: BOOT.file, from: BOOT.from, to: BOOT.from, speed: 1, overlay: false, hold: CTA.OUT + 0.3,
  cta: {panel: false}, fadeIn: 0.5, caption: "작업 전 「작업 시작」을 눌러 감시를 시작합니다", mute: true};

// 장면별 글씨 — 절 제목 카드 다음 첫 화면에서(인식 = 실제 · 화면 = 연출 · 목소리 = AI 합성 중 그 장면에 해당하는 것만)
const START_NOTE = "작업 시작·점검 화면은 실제 동작 방식대로 그린 연출";
const NOTES: Record<string, string> = {
  "버튼": "버튼 인식은 실제 AI 모델 결과", "손": "손 인식은 실제 AI 모델 결과",
  "공구": "공구 인식은 실제 AI 모델 결과 · 쥠 판정 화면은 연출", "스침": "손 위치는 실제 인식 결과 · 판정 화면은 연출",
  "경고": "경고 화면은 연출 · 음성 알림은 AI 합성", "차단": "차단 화면은 연출 · 음성 알림은 AI 합성",
  "공구 질문": "음성 비서 화면은 연출 · 목소리는 AI 합성", "단계 질문": "음성 비서 화면은 연출 · 목소리는 AI 합성",
};
let pending: string | undefined;
const SHOTS = SCENES.map((c): Clip => {
  if (c.card === "section") pending = c.section?.title;
  const note = !c.card && pending ? NOTES[pending] : undefined;
  if (note) pending = undefined;
  return {...c, mute: true, sfx: c.sfx?.filter(([, n]) => KEEP(n)), ...(note ? {note} : {})};
});
const BODY: Clip[] = [{...START, note: START_NOTE}, ...SHOTS];
// 첫 소리 시각(초 내림 — 안내가 실제보다 늦지 않게) · 제목 자막은 길이에 영향이 없어 한 번 놓아 보고 계산한다
const FIRST = Math.floor(Math.min(...sfxTrack(place([TITLE, ...BODY], 30), 30).map((s) => s.frame)) / 30);
export const HANIUM: Clip[] = [{...TITLE, caption: notice(FIRST)}, ...BODY];
