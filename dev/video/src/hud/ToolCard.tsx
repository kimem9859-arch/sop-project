import {josa} from "../lib/josa.ts";
import type {ToolView} from "../lib/uiState.ts";
import {GlitchNoise, glitchStyle} from "./Glitch.tsx";
import {IconCheck, IconWarn, IconWrench} from "./icons.tsx";
import {C, GLASS, TOOL_KO} from "./theme.ts";

// 오른쪽 위 — 공구 단계: 찾는 중 → 확인 중 → 확인 완료 · 다른 공구를 쥐면 경고
// age = 내용(단계)이 바뀐 뒤 초 — 바뀔 때마다 지지직(10/9 초안 피드백 「단계 UI 등장 효과와 동일하게 … 내용이 바뀔 때」)
export const ToolCard: React.FC<{tool: ToolView | null; age: number | null}> = ({tool, age}) => {
  if (!tool) return null;
  const want = TOOL_KO[tool.want] ?? tool.want;
  const [title, sub, col, icon] = tool.wrong
    ? [`${TOOL_KO[tool.wrong] ?? tool.wrong} — 다른 공구입니다`, `이 단계에는 ${josa(want, "이", "가")} 필요합니다 · ${josa(want, "을", "를")} 쥐세요`, C.warn, <IconWarn size={34} color={C.warn} />]
    : tool.phase === "grasped" ? [`${want} 확인 완료`, "필요한 공구를 쥐었습니다", C.done, <IconCheck size={34} color={C.done} />]
    : tool.phase === "checking" ? [`${want} 확인 중`, "쥔 공구를 확인하고 있습니다", C.current, <IconWrench size={34} color={C.current} />]
    : [`${want} 찾는 중`, `이 단계에는 ${josa(want, "이", "가")} 필요합니다`, C.info, <IconWrench size={34} color={C.info} />];
  return (
    <div style={{...GLASS, position: "absolute", right: 40, top: 110, width: 470, padding: "16px 22px", display: "flex", gap: 16, alignItems: "center",
      border: `1px solid ${col}`, ...glitchStyle(age, 9)}}>
      <GlitchNoise age={age} seed={9} color={col} />
      {icon}
      <div>
        <div style={{fontSize: 27, fontWeight: 800, color: col}}>{title}</div>
        <div style={{fontSize: 20, fontWeight: 500, color: C.label, marginTop: 2}}>{sub}</div>
      </div>
    </div>
  );
};
