// 사용: node tools/dets_summary.ts <dets.json> — 프레임별 검출 수 분포(G1 · 프레임 손 검출률은 성능 지표가 아니다 — 수치인용 규칙)
import {readFileSync} from "node:fs";
const d = JSON.parse(readFileSync(process.argv[2], "utf8"));
const hist = (xs: (string | number)[]) => xs.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
const rows = d.rows as {btn: [string][]; tool: [string][]; hand: unknown}[];
console.log("프레임", rows.length, "· 크기", d.w, d.h, "· fps", d.fps, "· pad34", d.pad34 ?? false);
console.log("버튼 박스 수 → 프레임 수", hist(rows.map((r) => r.btn.length)));
console.log("버튼 이름", hist(rows.flatMap((r) => r.btn.map((b) => b[0]))));
console.log("공구 박스 수 → 프레임 수", hist(rows.map((r) => r.tool.length)));
console.log("공구 이름", hist(rows.flatMap((r) => r.tool.map((t) => t[0]))));
console.log("손 보인 프레임", rows.filter((r) => r.hand).length);
