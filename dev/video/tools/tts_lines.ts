// 음성 TTS 문장을 JSON 으로 — tools/tts.py 가 읽는다(문장은 각자 한 곳: 답 = 편집표 TTS_LINES · 음성 알림 = lib/alerts ALERT_TEXT)
import {TTS_LINES} from "../src/edits/feature.ts";
import {ALERT_TEXT} from "../src/lib/alerts.ts";
console.log(JSON.stringify({...TTS_LINES, warn: ALERT_TEXT.alert_warn_B1, block: ALERT_TEXT.alert_block_B1}));
