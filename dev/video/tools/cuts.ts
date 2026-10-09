// 사용: node tools/cuts.ts <timeline.json> <sync.json> — 편집표를 쓰기 위한 사건 시각표(영상 초)
import {readFileSync} from "node:fs";
const [a, b] = process.argv.slice(2);
const tl = JSON.parse(readFileSync(a, "utf8"));
const sy = JSON.parse(readFileSync(b, "utf8"));
const show = new Set(["run_start", "press", "step_done", "sub", "wrong_tool", "state", "release", "run_end",
  "wake", "stt", "answer", "alert", "play_start", "play_end"]);
for (const e of tl.events as {t: number; kind: string; d: Record<string, unknown>}[]) {
  if (!show.has(e.kind)) continue;
  if (e.kind === "stt" && !e.d.text) continue;
  if (e.kind === "state" && !["WARNING", "BLOCK", "IDLE"].includes(String(e.d.new))) continue;
  console.log(`${((e.t - sy.offsetMs) / 1000).toFixed(2).padStart(8)}  ${e.kind.padEnd(10)} ${JSON.stringify(e.d)}`);
}
