import {loadFont} from "@remotion/fonts";
import {cancelRender, continueRender, delayRender, staticFile} from "remotion";

// Pretendard — 시연 프로그램(`Rpi5/Demo/config.py` UI_FONT_FAMILY)·발표 자료와 같은 글꼴 · OFL(public/fonts/LICENSE.txt)
// 🔴 맨 위 await 는 묶기 대상(chrome85)이 지원하지 않는다(2026-10-09 실측) — delayRender 로 다 불러올 때까지 렌더를 기다린다
const WEIGHTS = [["Regular", "400"], ["SemiBold", "600"], ["Bold", "700"], ["ExtraBold", "800"]] as const;
const handle = delayRender("Pretendard 글꼴");

Promise.all(
  WEIGHTS.map(([name, weight]) =>
    loadFont({family: "Pretendard", url: staticFile(`fonts/Pretendard-${name}.woff2`), weight}),
  ),
).then(() => continueRender(handle), (e) => cancelRender(e));
