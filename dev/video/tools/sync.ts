// 사용: node tools/sync.ts <영상> <timeline.json> <출력 sync.json>
// 🔒 GPIO 누름(엣지)으로만 맞추고, 차단 부저(interlock BLOCK 응답)는 검증에만 쓴다(계획서 홀드아웃)
import {spawnSync} from "node:child_process";
import {readFileSync, writeFileSync} from "node:fs";
import {fitOffset, onsets, wavPcm} from "../src/lib/sync.ts";

const [video, tlPath, out] = process.argv.slice(2);
const G2_MS = 67; // 2프레임 @30fps
const r = spawnSync("npx", ["remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", video,
  "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", "-f", "wav", "pipe:1"], {maxBuffer: 1 << 30});
if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
const {pcm} = wavPcm(r.stdout as Buffer); // 내장 ffmpeg 에 s16le 출력이 없어 WAV 로 받는다
const tl = JSON.parse(readFileSync(tlPath, "utf8"));
const inRun = (t: number) => t >= tl.runStart && (tl.runEnd === null || t <= tl.runEnd);
type E = {t: number; kind: string; d: Record<string, unknown>};
const presses = (tl.events as E[]).filter((e) => e.kind === "gpio_edge" && e.d.src === "edge" && inRun(e.t)).map((e) => e.t);
const block = (tl.events as E[]).find((e) => e.kind === "interlock" && e.d.cmd === "BLOCK" && inRun(e.t));
const on = onsets(pcm, 16000);
const fit = fitOffset(on, presses);
let holdoutMs: number | null = null;
if (block && Number.isFinite(fit.offsetMs)) {
  const bt = Number(block.d.t_ack_ms ?? block.t) - fit.offsetMs;
  const near = on.reduce((a, s) => (Math.abs(s * 1000 - bt) < Math.abs(a * 1000 - bt) ? s : a), Infinity);
  holdoutMs = Number.isFinite(near) ? bt - near * 1000 : null;
}
const worst = Math.max(0, ...fit.residualsMs.map(Math.abs));
const g2 = fit.matched >= 3 && fit.matched >= presses.length * 0.75 && worst <= G2_MS && (holdoutMs === null || Math.abs(holdoutMs) <= G2_MS);
writeFileSync(out, JSON.stringify({offsetMs: fit.offsetMs, matched: fit.matched, total: presses.length,
  residualsMs: fit.residualsMs, holdoutMs, g2}, null, 1));
console.log(`소리 시작점 ${on.length} · 누름 ${presses.length} 중 짝 ${fit.matched} · 최대 차 ${worst.toFixed(1)}ms · 🔒 부저 ${holdoutMs === null ? "없음" : holdoutMs.toFixed(1) + "ms"} → G2 소리 기준 ${g2 ? "통과" : "미달"}`);
