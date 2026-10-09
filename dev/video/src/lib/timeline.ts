import {parseCsv} from "./csv.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ev = {t: number; kind: string; d: Record<string, any>; src: "main" | "voice"};
export type Run = {start: number; end: number; ok: boolean | null};

// 측정 기록 사건 파일(`t_ms,kind,data`) — 형식 정본 = Rpi5/Demo/measure/README.md
export function parseEvents(text: string, src: Ev["src"]): Ev[] {
  const [head, ...body] = parseCsv(text);
  if (!head || head.join(",") !== "t_ms,kind,data") throw new Error(`사건 파일 머리줄이 다름: ${head?.join(",")}`);
  return body.filter((r) => r.length === 3).map(([t, kind, data]) => ({t: Number(t), kind, d: data ? JSON.parse(data) : {}, src}));
}

// 🔑 줄 순서 ≠ 시각 순서(gpio_edge·interlock·stt 는 일어난 시각) — 반드시 t 로 정렬
export function mergeEvents(...lists: Ev[][]): Ev[] {
  return lists.flat().sort((a, b) => a.t - b.t);
}

// 판 = run_start ~ run_end(완주 · ok) | run_reset(초기화·EMO 해제 · ok null)
export function runs(evs: Ev[]): Run[] {
  const out: Run[] = [];
  let cur: number | null = null;
  for (const e of evs) {
    if (e.kind === "run_start") {
      if (cur !== null) out.push({start: cur, end: e.t, ok: null});
      cur = e.t;
    } else if ((e.kind === "run_end" || e.kind === "run_reset") && cur !== null) {
      out.push({start: cur, end: e.t, ok: e.kind === "run_end" ? Boolean(e.d.ok) : null});
      cur = null;
    }
  }
  if (cur !== null) out.push({start: cur, end: Infinity, ok: null});
  return out;
}
