// 사용: node tools/stills.ts <구성 id> <출력 폴더> '<props JSON>' <프레임 …> — 한 번 묶어(bundle) 정지 화면 여러 장
import {bundle} from "@remotion/bundler";
import {renderStill, selectComposition} from "@remotion/renderer";
import {mkdirSync} from "node:fs";
import {join, resolve} from "node:path";

const [id, outDir, propsJson, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: resolve("src/index.ts")});
const inputProps = JSON.parse(propsJson);
const comp = await selectComposition({serveUrl, id, inputProps});
mkdirSync(outDir, {recursive: true});
for (const f of frames.map(Number)) {
  const output = join(outDir, `${id}_${f}.png`);
  await renderStill({serveUrl, composition: comp, frame: Math.min(f, comp.durationInFrames - 1), output, inputProps});
  console.log(output);
}
