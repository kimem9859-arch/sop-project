import type {Clip} from "../lib/edit.ts";
import {FEATURE17} from "./feature17.ts";

// 한이음 제출판(2026-10-16 · 설계 D84) — 예선 영상(시안 17 수정 19 · out/feature_final.mp4)을 한이음 공고문 「4) 시연 동영상」 조건에 맞춤
//   장면 · 자막은 시안 17 편집표 그대로(시안 17 은 바꾸지 않음) · 단계 이름 = 새 이름(최종 개발보고서 · 제작설계서도 새 이름으로 고치는 중 · 사용자)
//   ① 블라인드(학교명 · 실명 금지) — 로고 인트로에 소속 이름이 있어 뺌 → 작품 이름 제목 화면(hud/TitleCard)
//   ② 「설명은 자막 · 음성/음향/BGM 사용 불가 · 꼭 필요한 경우만 · 영상 시작 때 자막으로 표시」 — 실제 시스템이 내는 소리만 남기고
//      첫 화면 자막으로 알림 · 촬영 소리(잡음 · 누름 소리) 끔(mute)
//   ③ 「1분 30초 이내」 — 로고 5초 → 제목 화면 4초
export const HANIUM_TITLE = ["Vision AI 기반 웨어러블 연동", "작업자 Human Error 사전 예방 안전 콘솔"];   // 9/8 개발보고서 프로젝트명(두 줄)
const NOTICE = "이 영상에는 시스템 음성 알림, 차단 부저, 음성 비서 대화 소리가 있습니다";
// 남기는 소리 = 실제 시스템 출력(최종-기능현황 FR-2 — 경고 = 음성 알림 · 차단 = 부저 + 음성 알림) + 음성 비서 대화(작업자 말 · 호출 띠링 · 답)
//   뺌 = 장면 전환 · 탐지 연출 효과음 · 경고 「삐」(실제 경고엔 소리 없이 음성 알림만) · 누름 · 자물쇠 · 켜짐 · 꺼짐
const KEEP = (name: string) => name.startsWith("tts_") || name === "sfx_alarm" || name === "sfx_chime";
const TITLE_SEC = 4.0;
const SCENES = FEATURE17.filter((c) => c.take !== "intro_logo");
const TITLE: Clip = {take: SCENES[0].take, file: SCENES[0].file, from: SCENES[0].from, to: SCENES[0].from, speed: 1, overlay: false, hold: TITLE_SEC,
  projTitle: true, fadeOut: 0.5, caption: NOTICE, mute: true};

export const HANIUM: Clip[] = [TITLE, ...SCENES.map((c) => ({...c, mute: true, sfx: c.sfx?.filter(([, n]) => KEEP(n))}))];
