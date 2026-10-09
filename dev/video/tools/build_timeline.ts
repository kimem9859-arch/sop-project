// 사용: node tools/build_timeline.ts <측정 세션 폴더> <판 번호(1부터)> <출력 timeline.json>
import {existsSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {mergeEvents, parseEvents, runs} from "../src/lib/timeline.ts";

const [dir, runArg, out] = process.argv.slice(2);
if (!dir || !runArg || !out) {
  console.error("사용: node tools/build_timeline.ts <세션 폴더> <판 번호> <출력>");
  process.exit(1);
}
const main = parseEvents(readFileSync(join(dir, "events.csv"), "utf8"), "main");
const vp = join(dir, "voice_events.csv");
const evs = mergeEvents(main, existsSync(vp) ? parseEvents(readFileSync(vp, "utf8"), "voice") : []);
const rs = runs(evs);
rs.forEach((r, i) => console.log(`판 ${i + 1}: ${((r.end - r.start) / 1000).toFixed(1)}초 · ok=${r.ok}`));
const n = Number(runArg);
const run = rs[n - 1];
if (!run) {
  console.error(`🛑 판 ${n} 없음 — 이 세션의 판 수 ${rs.length}`);
  process.exit(2);
}
const fin = Number.isFinite(run.end);
const lo = run.start - 15000; // 판 시작 전 15초(HUD 켜짐 구간) 사건도 둔다 — stateAt 은 runStart 이전을 보지 않는다
const hi = fin ? run.end + 15000 : Infinity;
writeFileSync(out, JSON.stringify({session: dir, run: n, runStart: run.start, runEnd: fin ? run.end : null,
  events: evs.filter((e) => e.t >= lo && e.t <= hi)}));
console.log(`→ ${out}`);
