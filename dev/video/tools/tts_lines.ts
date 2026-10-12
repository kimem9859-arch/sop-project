// 음성 TTS 문장을 JSON 으로 — tools/tts.py 가 읽는다(문장은 각자 한 곳: 답 = 편집표 TTS_LINES · 음성 알림 = lib/alerts ALERT_TEXT)
import {TTS_LINES} from "../src/edits/feature.ts";
import {ALERT_TEXT} from "../src/lib/alerts.ts";
import {TTS17_LINES, WORKER_LINES} from "../src/edits/feature17.ts";
// warn2 · block2 = 시안 17(2단계 차례에서 B3 경고 · 차단) · step1 = 시안 17 단계 질문 답(1단계 대기) · tool_quick = 공구 질문 즉답(수정 17)
//   · w_* = 작업자 호출 · 질문(제미나이 남성 · tools/tts_gemini.py)
console.log(JSON.stringify({...TTS_LINES, warn: ALERT_TEXT.alert_warn_B1, block: ALERT_TEXT.alert_block_B1,
  warn2: ALERT_TEXT.alert_warn_B2, block2: ALERT_TEXT.alert_block_B2, ...TTS17_LINES, ...WORKER_LINES}));
