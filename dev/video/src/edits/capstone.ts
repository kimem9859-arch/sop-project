import {CHECK_SEC} from "../lib/boot.ts";
import {CTA} from "../lib/cta.ts";
import type {Clip} from "../lib/edit.ts";
import {FEATURE17} from "./feature17.ts";

// 캡스톤 본선 제출판(2026-10-16 · 설계 D83) — 예선 영상(시안 17 수정 19 · out/feature_final.mp4)을 약 1분 10초로 줄여 재활용
//   장면은 시안 17 편집표에서 그대로 가져온다(시안 17 은 바꾸지 않음 — 예선에 쓴 영상)
//   로고 → 「작업 시작」 누름(연출 · hud/StartCta) → 01 객체 탐지 → 02 판정 기준 → 03 음성 비서(단계 질문만) → 검게 끝
//   뺀 것 = 안경 쓰기 · 켜짐(가상 세계 · 점검 4줄) · 공구 질문 · 안경 벗기(사용자 「인트로는 … 로고 장면(기존 그대로)과 작업 시작 버튼을
//   누르는 장면으로 대체」·「틀린 공구 장면은 빼지 말아줘」·「음성비서는 단계 질문 장면만」·「안경 벗기 장면은 제거」·「1분 10초 안팎」)
const at = (pred: (c: Clip) => boolean) => {
  const i = FEATURE17.findIndex(pred);
  if (i < 0) throw new Error("시안 17 편집표에서 장면을 못 찾음");
  return i;
};
const LOGO = FEATURE17[at((c) => c.take === "intro_logo")];
const BOOT = FEATURE17[at((c) => c.boot === true)];   // 켜짐 장면의 원본 구간(콘솔 정면 · 손이 들어오기 전) = 작업 시작 배경
const C01 = at((c) => c.card === "chapter" && c.chapter?.no === "01");
const C03 = at((c) => c.card === "chapter" && c.chapter?.no === "03");
const VOICE2 = FEATURE17.filter((c) => c.run === "voice2");
const END_FADE = 0.8;   // 끝 — 단계 질문 뒤 검게 사라짐(시안 17 은 안경 벗기로 넘어가는 0.45초)

// 작업 시작 — 콘솔 정면을 거의 멈춘 느린 재생으로(켜짐 장면과 같은 구간 · 끝이 01 장 카드 배경과 이어짐) · 로고가 검게 사라진 뒤 나타남
const START: Clip = {take: BOOT.take, file: BOOT.file, from: BOOT.from, to: BOOT.to, speed: (BOOT.to - BOOT.from) / CTA.SEC, overlay: false,
  cta: true, fadeIn: 0.5, caption: "「작업 시작」을 누르면 정비 순서(레시피)대로 감시를 시작합니다",
  sfx: [[CTA.PRESS, "sfx_press", 0.7], [CTA.PRESS + 0.12, "sfx_boot", 0.4]]};

export const CAPSTONE: Clip[] = [
  LOGO,
  START,
  {...FEATURE17[C01], boot: CHECK_SEC},   // 켜짐 시계 = 점검 끝부터 → 버튼 스캔 · 강조 차례 그대로(lib/edit bootTimes)
  ...FEATURE17.slice(C01 + 1, C03),         // 01 객체 탐지(버튼 · 손 · 공구 · 틀린 공구) · 02 판정 기준(스침 · 경고 · 차단)
  {...FEATURE17[C03], from: VOICE2[0].from, to: VOICE2[0].from, run: "voice2"},   // 03 장 카드 — 단계 질문 첫 화면 위
  ...VOICE2.map((c) => (c.section ? {...c, section: {...c.section, no: "1"}} : c.fadeOut ? {...c, fadeOut: END_FADE} : c)),
];
