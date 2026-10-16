import {AbsoluteFill, Freeze, Html5Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from "remotion";
import {BOOT_SEC, BTN_INTRO_SEC, BTN_ORDER, BTN_STEP, btnIntroAge} from "../lib/boot.ts";
import {detAt, firstHandAt, fitRect, lastBox, stableBox, tipTrail, type Box, type Dets, type Pt} from "../lib/dets.ts";
import {bootTimes, captionTrack, place, sfxTrack, srcSec, totalFrames, type Clip, type Placed} from "../lib/edit.ts";
import {burstAge, crtOff, insetSpot, meterSpan, screenSince, shake} from "../lib/fx.ts";
import {dwellAt} from "../lib/judge.ts";
import {speedRead, type SpeedRead} from "../lib/speed.ts";
import {holeMask, holesFor, spotHoles} from "../lib/mask.ts";
import type {Ev} from "../lib/timeline.ts";
import {stagedRun, type StagedEv, type StagedPress} from "../lib/staged.ts";
import {stateAt} from "../lib/uiState.ts";
import {Callout} from "../hud/Callout.tsx";
import {Breadcrumb, ChapterTitle, SectionTitle} from "../hud/ChapterTitle.tsx";
import {EndSummary} from "../hud/EndSummary.tsx";
import {ChromaFilter, INSET, PixelBurst, ZoomInset} from "../hud/Fx.tsx";
import {BTN} from "../hud/theme.ts";
import {Hud} from "../hud/Hud.tsx";
import {SpeedMeter} from "../hud/SpeedMeter.tsx";
import {StartCta} from "../hud/StartCta.tsx";
import {HudShutdown} from "../hud/HudShutdown.tsx";
import {Caption} from "../hud/Overlays.tsx";
import {SKELETON} from "../edits/skeleton.ts";
import {PRETEST, PRETEST_STAGED, PRETEST_SYNTH} from "../edits/pretest.ts";
import {FEATURE, FEATURE_STAGED, FEATURE_SYNTH} from "../edits/feature.ts";
import {FEATURE17, FEATURE17_STAGED, FEATURE17_SYNTH, FEATURE17_VIEWS} from "../edits/feature17.ts";
import {viewAt, zoomFit, zoomRect, type ViewKey} from "../lib/view.ts";
import {voiceTrack, type VoiceTrack} from "../lib/voiceLevel.ts";
import {TTS_ENV} from "../edits/ttsEnv.ts";

// 자료 묶음마다(촬영 · 연출 기록 갈래 run) — 검출 · 기록 시간표 · 시각 맞춤(영상 0초의 기록 시각) · 손 첫 등장
// handIntro · toolIntro = 편집표의 손 · 공구 탐지 정지 구간 원본 초(있으면 그 전엔 숨기고 그때 연출 · -1 = 다른 촬영에서 이미 함)
type TakeData = {dets: Dets; tl: {runStart: number; events: Ev[]}; offsetMs: number; firstHand: number | null;
  handIntro: number | null; toolIntro: number | null};
const EDITS: Record<string, Clip[]> = {skeleton: SKELETON, pretest: PRETEST, feature: FEATURE, feature17: FEATURE17};
// 측정 기록 없이 찍은 촬영 = 연출 기록(lib/staged)으로 대신(편집 → 자료 묶음) · 그 편집은 「합성」 표기도 바꿔 단다
export type Staged = {start: number; presses: StagedPress[]; first?: string; extra?: StagedEv[]};
const STAGED: Record<string, Record<string, Staged>> = {pretest: PRETEST_STAGED, feature: FEATURE_STAGED, feature17: FEATURE17_STAGED};
const SYNTH: Record<string, string> = {pretest: PRETEST_SYNTH, feature: FEATURE_SYNTH, feature17: FEATURE17_SYNTH};
// 화면 보기(확대) — 편집마다 촬영별 기준점(lib/view · 시안 17 = 안경 끝 맞춤 · 비침 · 문 구간 확대)
const VIEWS: Record<string, Record<string, ViewKey[]>> = {feature17: FEATURE17_VIEWS};
// hq = 렌더 때 검출용 사본(proxy.mp4 · 긴 변 1280) 대신 고화질 사본(hq.mp4 · 긴 변 1920)으로 — 최종 영상 화질(10/13 사용자 「고해상도로 렌더링」)
//   hq.mp4 = tools/proxy.sh <원본> hq.mp4 1920 16(사본과 같은 과정 → 프레임 시각이 같아 검출 표시가 맞는다 · 원본을 그대로 쓰면 0.05초 어긋남)
//   로고(intro_logo)는 원본이 1280 이라 원본을 그대로 hq.mp4 로 둔다 · 화면 맞춤(fit)은 검출 기준(사본 크기) 그대로
export type CutProps = {edit: string; data: Record<string, TakeData> | null; hq?: boolean};
// 편집마다 한 번 — 목소리를 따라 움직이는 물결의 세기 · 흐름(lib/voiceLevel · 프레임마다 다시 계산하지 않게)
const VOICE: Record<string, VoiceTrack> = {};
const keyOf = (c: Clip) => (c.run ? `${c.take}#${c.run}` : c.take);

export const calcCut: CalculateMetadataFunction<CutProps> = async ({props}) => {
  const clips = EDITS[props.edit];
  const data: Record<string, TakeData> = {};
  // 연출 기록 갈래(run)마다 자기 탐지 연출 구간 — 없으면 같은 촬영의 것 · 그것도 없으면 다른 촬영에서 이미 함(-1)
  const introAt = (key: string, kind: Clip["intro"]) => {
    const own = clips.find((c) => keyOf(c) === key && c.intro === kind) ?? clips.find((c) => c.take === key.split("#")[0] && c.intro === kind);
    return own ? own.from : clips.some((c) => c.intro === kind) ? -1 : null;
  };
  for (const key of new Set(clips.filter((c) => c.overlay).map(keyOf))) {
    const take = key.split("#")[0];
    const j = (f: string) => fetch(staticFile(`footage/${take}/${f}`)).then((r) => r.json());
    const st = STAGED[props.edit]?.[key];
    const [dets, tl, sy] = st ? [await j("dets.json"), stagedRun(st.start, st.presses, {first: st.first, extra: st.extra}), {offsetMs: 0}]
      : await Promise.all([j("dets.json"), j("timeline.json"), j("sync.json")]);
    const from = Math.min(...clips.filter((c) => c.overlay && keyOf(c) === key).map((c) => c.from));
    data[key] = {dets, tl, offsetMs: sy.offsetMs, firstHand: firstHandAt(dets, from), handIntro: introAt(key, "hand"), toolIntro: introAt(key, "tool")};
  }
  return {props: {...props, data}, durationInFrames: totalFrames(place(clips, 30))};
};

const BLUR_RAMP = 6; // 정지 구간 들고 날 때 흐림이 차오르는 프레임
const DWELL_FILL = 1.5; // 경고 절 정지 중 0.3초 타이머가 차는 데 걸리는 화면 초
const BLURS = new Set(["buttons", "hand", "tool", "overlap"]); // 흐림 · 어둡게를 쓰는 탐지 연출(정지 · 재생 모두 · 시안 17)
// 흐림 · 어둡게 묶음 — card = 제목 카드 · focus = 탐지 연출 · 판정 장면(주인공만 선명) · null = 없음(음성비서는 dim 창으로 따로)
//   같은 묶음(card 제외)이 이어지면 경계에서 풀지 않는다(시안 17 2차 피드백 — 공구 인식 → 겹침 · 판정 장면 재생 → 정지가 끊기지 않게)
const fxOf = (cl: Clip | undefined) => !cl ? null : cl.card ? "card" : (cl.intro && BLURS.has(cl.intro)) || cl.spot || cl.focus ? "focus" : null;
const DIM_IN = 0.3, DIM_OUT = 0.4;   // 음성비서 흐림이 차오름 · 풀림(초) — 풀림은 답이 오기 전에 끝난다
// 테크 효과(시안 8 「테크적이고 화려하게」) — 차단 순간 = 흔들림 · 붉은 번쩍임 · 색 번짐 · 살짝 당겨짐 · 장 전환 = 색 번짐 + 픽셀 조각
//   시안 9 「장 전환 효과가 너무 강한 것 같아」 → 0.3초 · 색 번짐 5 px(PixelBurst 도 옅게)
const IMPACT = 0.35, TRAIL_SEC = 0.3, BURST = 0.3, BURST_CA = 5;
const PANEL = {x: 40, y: 40, w: 440, h: 360};   // 왼쪽 위 단계 목록(확대 창이 피할 자리)

// boot0 = 이 구간 시작의 켜짐 초와 흐름 여부(lib/edit bootTimes — 제목 카드 동안 멈춤) · null = 켜짐 전
// ps · i = 편집 전체와 이 구간 순번(차단 순간의 화면 시계) · trailFrom = 검지 끝 자취를 이 원본 초부터만(절 카드 바로 뒤 — 안 보인 자취를 그리지 않게)
// views = 이 편집의 촬영별 화면 보기 기준점(없으면 원래 화면) — 영상 · 검출 좌표(fit)를 같이 확대한다
const ClipView: React.FC<{p: Placed; d: TakeData | undefined; boot0: {at: number; runs: boolean} | null; synth?: string;
  ps: Placed[]; i: number; trailFrom: number | null; views?: Record<string, ViewKey[]>; voice?: VoiceTrack; hq?: boolean}> = ({p, d, boot0, synth, ps, i, trailFrom, views, voice, hq = false}) => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const c = p.clip;
  const sec = srcSec(c, f, fps);
  const holdT = c.hold !== undefined ? f / fps : null;  // 정지 구간 안 경과 초(연출 시계)
  const introT = holdT ?? (c.intro ? f / fps : null);   // 탐지 연출 시계 — 정지 구간 또는 재생 구간(시안 17)
  // 공구 인식 동안 단계 목록 · 대기 시간 숨김 — 앞 구간이 숨김이 아니면 0.3초에 걸쳐 사라지고, 뒤 구간이 숨김이 아니면 0.3초에 걸쳐 돌아옴
  //   다른 장면(촬영 갈래)과 맞닿은 경계는 숨긴 채로 넘긴다(시안 17 3차 피드백 「쥠 확인까지 · 드라이버 장면까지 UI 꺼짐 상태를 이어줘」)
  const hushed = (x: Placed | undefined) => !x || Boolean(x.clip.quiet) || keyOf(x.clip) !== keyOf(c);
  const quiet = !c.quiet ? 0 : Math.min(hushed(ps[i - 1]) ? 1 : Math.min(1, f / (0.3 * fps)), hushed(ps[i + 1]) ? 1 : Math.min(1, (p.frames - f) / (0.3 * fps)));
  const vw = viewAt(views?.[c.take], sec);
  const fit = d ? zoomFit(fitRect(d.dets.w, d.dets.h, width, height), vw, width, height) : null;
  const rect = zoomRect(vw, width, height);
  let hud = null;
  let impact: number | null = null;   // 차단이 화면에 처음 나온 뒤 화면 초(lib/fx screenSince)
  let zone: Box | null = null;        // 판정 구역 버튼 박스 — 손이 가려도 크기 유지(시안 17 2차 피드백)
  let view = d ? detAt(d.dets, sec) : null;
  let meter: {center: Pt; trail: Pt[]; read: SpeedRead | null; age: number; left: number} | null = null;   // 손끝 확대 창 · 속도 계기(meter · 수정 18)
  const ms = c.meter ? meterSpan(ps, i, f, fps) : null;
  if (c.overlay && d && view && fit && c.intro !== "end") {
    // 공구는 공구 탐지 연출 전에는 숨긴다(손과 같게 · 시안 1 피드백 「바로 공구가 나타나면 실행하지 말고 약간의 지연」)
    if (d.toolIntro !== null && d.toolIntro >= 0 && c.intro !== "tool" && sec < d.toolIntro) view = {...view, tool: []};
    if (c.noTool) view = {...view, tool: []};
    if (c.hideBtn) view = {...view, btn: view.btn.filter((b) => !c.hideBtn!.includes(b[0]))};
    // HUD 기록 시계 — hud 가 있으면 그 초부터 화면 초로(정지 · 느린 재생에도 음성비서 연출이 실제 속도) · 없으면 원본 초
    const tMs = d.offsetMs + (c.hud !== undefined ? c.hud + f / fps : sec) * 1000;
    const boot = boot0 === null ? 1 : Math.max(0, Math.min(1, (boot0.at + (boot0.runs ? f / fps : 0)) / BOOT_SEC));
    // 손 탐지 연출 — 편집표에 손 탐지 구간이 있으면 그 구간에서만(그 전엔 숨김) · 없으면 본편 첫 등장 한 번(G3)
    //   연출 시계 = 첫 손 탐지 구간부터 원본 초 + 정지한 초(재생 중 인식 → 같은 손 정지 구간에서 이어서 뼈대 · 추적 시작 · 시안 17 3차)
    const handAge = !view.hand ? null
      : d.handIntro !== null ? (c.intro === "hand" ? sec - d.handIntro + (holdT ?? 0) : sec > d.handIntro || (sec === d.handIntro && c.hold === undefined) ? 10 : null)
      : d.firstHand !== null && sec >= d.firstHand ? sec - d.firstHand : 10;
    // 손 「인식」 길이 — 손 탐지가 재생 구간으로 시작하고 뒤에 같은 갈래의 손 정지 구간이 있으면 그 정지까지(없으면 HandSkeleton 기본)
    const hands = ps.filter((x) => keyOf(x.clip) === keyOf(c) && x.clip.intro === "hand").map((x) => x.clip);
    const handHold = hands[0] && hands[0].hold === undefined ? hands.find((x) => x.hold !== undefined) : undefined;
    const handRecog = handHold ? handHold.from - hands[0].from : undefined;
    const ui = stateAt(d.tl.events, d.tl.runStart, tMs);
    const lp = ui.lastPress && tMs - ui.lastPress.t < 1000 ? ui.lastPress.button : null;
    const pressAt = lp && !c.hideBtn?.includes(lp) && !view.btn.some((b) => b[0] === lp) ? lastBox(d.dets, sec, lp, 1) : null;
    // 경고 절 — 오답 버튼에 손가락이 닿은 순간 화면을 멈추고 그동안 0.3초 타이머를 채운다(시안 3 피드백 · 기록의 머문 시작과 같은 자리)
    //   계기 장면은 앞 계기 정지 구간만큼 더 — 정지 → 재생 경계에서 경고 카드 · 번쩍임이 다시 시작하지 않게(수정 18 리뷰)
    const uiMs = tMs + (c.hud !== undefined ? 0 : ((holdT ?? 0) + (ms?.held ?? 0)) * 1000);   // 정지 중에도 흐르는 장식 시계(hud 구간은 이미 흐름)
    // 판정 구역을 찾는 시각 — 그냥 멈춘 구간(차단 정지)만 장식 시계로 · 제목 카드 · 탐지 정지는 기록 시각 그대로
    //   (제목 카드 동안 장식 시계가 앞서 가 다음 장면의 경고 · 스침 구역이 미리 비치던 것 — 시안 4 피드백 「판정 영역 그래픽이 잠깐 나오는데」)
    //   계기 정지(meter · 수정 18)도 기록 시각 그대로 — 느려진 순간 정지 중 판정 구역이 사라졌다 다시 나오지 않게
    const plainHold = c.hold !== undefined && !c.card && !c.intro && !c.meter;
    const dw0 = dwellAt(d.tl.events, d.tl.runStart, plainHold ? uiMs : tMs);
    const dw = c.intro === "dwell" && dw0 && holdT !== null ? {...dw0, progress: Math.min(1, holdT / DWELL_FILL), done: false} : dw0;
    const zoneName = dw?.button ?? c.spot;
    if (zoneName) zone = stableBox(d.dets, sec, zoneName);
    // 차단이 화면에 나온 뒤 화면 초 — HUD 시계 구간(hud)은 그 시계가 화면 초와 같이 흐른다(시안 17 3차 — 누름 뒤 정지 화면에서 차단)
    if (ui.alert?.kind === "block") impact = c.hud !== undefined ? (tMs - ui.alert.since) / 1000 : screenSince(ps, i, f, fps, (ui.alert.since - d.offsetMs) / 1000);
    const back = trailFrom === null ? TRAIL_SEC : Math.min(TRAIL_SEC, Math.max(0, sec - trailFrom));
    if (ms && zone) {
      // 창 가운데 = 검지 끝 · 손이 없으면 판정 구역 가운데 → 손이 나타나면 원본 0.2초에 걸쳐 손끝으로 옮겨 감(튀지 않게 · 리뷰)
      const sc = (q: Pt): Pt => [fit.x + q[0] * fit.s, fit.y + q[1] * fit.s];
      const mid = sc([(zone[2] + zone[4]) / 2, (zone[3] + zone[5]) / 2]), tip = view.hand?.[8];
      const h0 = firstHandAt(d.dets, Math.max(0, sec - 1)), u = tip && h0 !== null ? Math.min(1, Math.max(0, (sec - h0) / 0.2)) : 0;
      const tc = tip ? sc(tip) : mid, e = 1 - (1 - u) ** 3;
      meter = {center: [mid[0] + (tc[0] - mid[0]) * e, mid[1] + (tc[1] - mid[1]) * e], trail: tipTrail(d.dets, sec, back).map(sc),
        read: speedRead(d.dets, sec, zone), age: ms.age, left: ms.left};
    }
    hud = <Hud ui={ui} pressAt={pressAt} dwell={dw} uiMs={uiMs} view={view} fit={fit} impact={impact}
      trail={c.tip ? tipTrail(d.dets, sec, back) : null}
      t={(p.start + f) / fps} tMs={tMs} boot={boot} handAge={handAge} W={width} H={height} badge={c.badge} synth={synth}
      toolIntro={c.intro === "tool" ? introT : null} overlap={c.intro === "overlap" ? introT : null} frozenAge={holdT} quiet={quiet} zoneBox={zone}
      handRecog={handRecog} factFrom={c.factFrom} factGauge={c.factGauge}
      voiceFx={voice ? {amp: voice.amp[p.start + f] ?? 0.3, phase: voice.phase[p.start + f] ?? 0} : undefined} />;
  }
  // 탐지 연출 동안 화면을 멈추고 배경을 흐리고 어둡게(10/9 초안 피드백) — 주인공(버튼 · 손 · 공구)은 선명하게 남긴다(시안 1 피드백)
  //   = 흐린 바탕 + 같은 정지 화면을 주인공 자리만 보이게 한 겹 더 · 들고 날 때 BLUR_RAMP 프레임에 걸쳐 · intro 없는 정지 = 그냥 멈춤
  const g = fxOf(c);
  let k = 0;
  if (g) {
    // 탐지 · 판정 장면(focus)에서 제목 카드로 넘어갈 때는 흐린 채로 이어 간다(풀렸다 다시 흐려지는 깜빡임 없이 · 시안 17 5차 — 손 절이 정지로 끝남)
    const pg = fxOf(ps[i - 1]?.clip), ng = fxOf(ps[i + 1]?.clip);
    const kin = (g !== "card" && pg === g) || (g === "card" && pg === "focus") ? 1 : f / BLUR_RAMP;
    const kout = g !== "card" && (ng === g || ng === "card") ? 1 : (p.frames - f) / BLUR_RAMP;
    k = Math.max(0, Math.min(1, kin, kout));
  } else if (c.dim) {
    // 음성비서 — 창 [a, b] 동안 · 앞 구간 창이 끝까지 이어 오면 차오름 없이 · 뒤 구간 창이 처음부터 이어 가면 풀림 없이
    const [a, b] = c.dim, tt = f / fps, dur = p.frames / fps;
    const pv = ps[i - 1], nx = ps[i + 1];
    const kin = a <= 1e-6 && pv?.clip.dim && pv.clip.dim[1] >= pv.frames / fps - 1e-6 ? 1 : (tt - a) / DIM_IN;
    const kout = b >= dur - 1e-6 && nx?.clip.dim && nx.clip.dim[0] <= 1e-6 ? 1 : (b - tt) / DIM_OUT;
    k = tt < a || tt > b ? 0 : Math.max(0, Math.min(1, kin, kout));
  }
  const dim = c.card ? 0.62 : 0.5;  // 제목 카드는 더 어둡게(글이 주인공)
  const src = staticFile(`footage/${c.take}/${hq && c.file === "proxy.mp4" ? "hq.mp4" : c.file}`);
  const fadeV = Math.max(0, Math.min(c.fadeOut ? Math.min(1, (p.frames - f) / (c.fadeOut * fps)) : 1, c.fadeIn ? Math.min(1, f / (c.fadeIn * fps)) : 1));
  // 소리 크기 = 화면 페이드와 같이(검게 사라질 때 소리도 · 시안 17 14차 로고 5초 — 소리가 들리는 중에 잘림) · 공식 문서 권장대로 숫자로 계산
  const vid = (style: React.CSSProperties) => (
    <OffthreadVideo src={src} trimBefore={Math.round(c.from * fps)} playbackRate={c.speed} muted={(c.speed !== 1 && !c.sound) || c.hold !== undefined} volume={fadeV}
      style={{position: "absolute", ...rect, objectFit: "contain", ...style}} />
  );
  // 버튼 정지 — 강조 차례가 온 버튼만 0.3초에 걸쳐 선명해진다(스캔 중에는 버튼도 배경처럼 흐림 · 시안 4 피드백)
  const bootSec = boot0 ? boot0.at + (boot0.runs ? f / fps : 0) : 0;
  const reveal = (name: string) => Math.max(0, Math.min(1, (btnIntroAge(name, bootSec) ?? -1) / 0.3));
  const holes = k > 0 && g === "focus" && view && fit ? (c.spot ? spotHoles(view, fit, zone) : holesFor(c.focus ?? c.intro, view, fit, reveal)) : [];
  const mask = holes.length ? holeMask(holes, width, height) : null;
  const portrait = d ? d.dets.h > d.dets.w : false;   // 세로 촬영 = 양옆을 같은 화면의 흐린 확대로 채움
  const layers = (
    <>
      {portrait && vid({left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(28px) brightness(0.45)"})}
      {vid({filter: k > 0 ? `blur(${(7 * k).toFixed(2)}px) brightness(${(1 - dim * k).toFixed(3)})` : undefined})}
      {mask && vid({maskImage: `url("${mask}")`, WebkitMaskImage: `url("${mask}")`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%"})}
    </>
  );
  // ⑦ 탐지 확대 창(시안 10 「추천 외에 제안한 효과」) — 버튼 정지 = 강조 차례마다 그 버튼 하나씩 · 다른 상자 · 단계 목록을 피한 자리
  //   공구 확대 창은 시안 14 에서 뺌(사용자 — 큰 공구는 일부만 보였다)
  let insets: React.ReactNode[] = [];
  if (view && fit && holdT !== null && c.intro === "buttons") {
    const R = (b: Box) => ({x: fit.x + b[2] * fit.s, y: fit.y + b[3] * fit.s, w: (b[4] - b[2]) * fit.s, h: (b[5] - b[3]) * fit.s});
    const one = (b: Box, age: number, dur: number, col: string, name: string) => {
      const r = R(b), zoom = Math.min(3, Math.max(1.3, (INSET * 0.85) / Math.max(r.w, r.h)));
      const spot = insetSpot(r, INSET + 34, [PANEL, ...view!.btn.filter((x) => x !== b).map(R)], width, height, 60);   // +34 = 아래 이름표 · 60 = 강조 고리 밖
      return <ZoomInset key={name} video={vid({})} box={b} fit={fit} spot={spot} zoom={zoom} col={col} name={name} age={age} dur={dur} W={width} H={height} />;
    };
    insets = BTN_ORDER.map((n, i) => {
      const b = view!.btn.find((x) => x[0] === n), age = btnIntroAge(n, bootSec);
      return b && age !== null ? one(b, age, i < BTN_ORDER.length - 1 ? BTN_STEP : BTN_INTRO_SEC + 0.3, BTN[n], n) : null;
    });
  }
  const hit = impact !== null && impact >= 0 && impact < IMPACT ? 1 - impact / IMPACT : 0;
  const [sx, sy] = hit > 0 ? shake(impact!, 18, IMPACT) : [0, 0];
  const caId = `ca-hit-${p.start}`;
  // 안경 벗기 종료 — 화면 전체(영상 + HUD)가 한 줄 → 점 → 검정(lib/fx crtOff · 시안 17 12차)
  const crt = c.shutdown !== undefined ? crtOff(f / fps - c.shutdown) : null;
  const crtStyle: React.CSSProperties | undefined = crt ? {transform: `scale(${crt.sx.toFixed(4)}, ${crt.sy.toFixed(4)})`, opacity: crt.op,
    filter: `brightness(${(1 + 2.5 * crt.glow).toFixed(3)})`} : undefined;
  // 끝에서 검은 화면으로 · 처음에 검은 화면에서(검은 막을 위에 덮음 — 전체 투명도는 뒤 배경이 비침)
  const fade = fadeV;   // 화면 페이드 = 소리 크기와 같은 값(위)
  return (
    <AbsoluteFill style={{background: "#000"}}>
      {hit > 0 && <ChromaFilter id={caId} dx={8 * hit} />}
      <AbsoluteFill style={hit > 0 ? {transform: `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${(1 + 0.03 * hit).toFixed(4)})`, filter: `url(#${caId})`} : crtStyle}>
        {c.hold !== undefined ? <Freeze frame={0}>{layers}</Freeze> : layers}
        {/* 제목 카드 중에도 HUD 를 그리고 배경과 함께 흐리게 · 어둡게(시안 3 피드백 「작업 단계 UI도 같이 배경과 흐려짐」·「제목이 나올 때부터 있는 게」) */}
        {c.card ? <div style={{position: "absolute", inset: 0, filter: `blur(${(7 * k).toFixed(2)}px) brightness(${(1 - dim * k).toFixed(3)})`}}>{hud}</div> : hud}
        {insets.length > 0 && <Freeze frame={0}>{insets}</Freeze>}   {/* 확대 창은 정지 구간에만 */}
        {meter && <SpeedMeter video={c.hold !== undefined ? <Freeze frame={0}>{vid({})}</Freeze> : vid({})} {...meter} t={(p.start + f) / fps} W={width} H={height} />}
        {c.callout && fit && <Callout def={c.callout} sec={sec} age={f / fps} fit={fit} />}
        {c.intro === "end" && <EndSummary age={holdT ?? 0} W={width} H={height} />}
        {c.shutdown !== undefined && <HudShutdown age={f / fps - c.shutdown} W={width} H={height} />}   {/* 안경 벗기 — HUD 꺼짐(시안 17 4차) */}
        {c.cta && <StartCta age={f / fps} W={width} H={height} synth={synth} />}   {/* 「작업 시작」 누름(캡스톤 D83) */}
      </AbsoluteFill>
      {crt && crt.glow > 0 && crt.op > 0 && (
        // 눌린 화면의 밝은 줄 · 점 빛
        <div style={{position: "absolute", left: (width * (1 - crt.sx)) / 2, width: width * crt.sx, top: height / 2 - 2, height: 4, borderRadius: 2,
          background: "#e6f6ff", opacity: crt.glow * crt.op, boxShadow: "0 0 18px #5aa8ff, 0 0 40px #5aa8ff"}} />
      )}
      {fade < 1 && <div style={{position: "absolute", inset: 0, background: "#000", opacity: 1 - fade}} />}
      {hit > 0 && <div style={{position: "absolute", inset: 0, background: "#ff2a2a", opacity: 0.42 * Math.max(0, 1 - impact! / 0.25), pointerEvents: "none"}} />}
    </AbsoluteFill>
  );
};

// 장 · 절 제목 카드 + 길잡이 — 지금 구간이 제목 카드(card)면 그 카드를 구간 길이만큼 · 길잡이는 가장 최근 장 · 절 표시로 늘
const Chapters: React.FC<{ps: Placed[]}> = ({ps}) => {
  const f = useCurrentFrame();
  const {fps, height} = useVideoConfig();
  const ch = ps.filter((p) => p.clip.chapter && p.start <= f).pop();
  const sc = ps.filter((p) => p.clip.section && p.start <= f).pop();
  if (!ch?.clip.chapter) return null;
  const sec = sc && sc.start >= ch.start ? sc.clip.section! : null;
  const cur = ps.find((p) => p.start <= f && f < p.start + p.frames);
  const age = cur ? (f - cur.start) / fps : 0, dur = cur ? cur.frames / fps : 0;
  return (
    <>
      {cur?.clip.card === "chapter" && cur.clip.chapter && <ChapterTitle ch={cur.clip.chapter} age={age} dur={dur} H={height} />}
      {cur?.clip.card === "section" && cur.clip.section && <SectionTitle sec={cur.clip.section} age={age} dur={dur} H={height} />}
      {!cur?.clip.card && cur?.clip.overlay && <Breadcrumb ch={ch.clip.chapter} sec={sec} />}   {/* 오버레이 없는 장면(안경 벗기)에는 길잡이 없음 */}
    </>
  );
};

export const Cut: React.FC<CutProps> = ({edit, data, hq}) => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  if (!data) return null;
  const ps = place(EDITS[edit], 30);
  const bt = bootTimes(ps, 30);
  const voice = (VOICE[edit] ??= voiceTrack(sfxTrack(ps, fps), TTS_ENV, totalFrames(ps), fps));
  const ba = burstAge(ps, f, fps, BURST);
  const cue = captionTrack(ps, fps).find((q) => q.start <= f && f < q.end);
  // 구간이 검게 사라질 때(fadeOut) 자막도 같이 — 검은 화면 위에 글자만 남지 않게(시안 17 5차 페이드)
  const cur = ps.find((p) => p.start <= f && f < p.start + p.frames);
  const capFade = cur?.clip.fadeOut ? Math.min(1, (cur.start + cur.frames - f) / (cur.clip.fadeOut * fps)) : 1;   // 자막 — 편집 전체 트랙(lib/edit captionTrack)   // 장 제목 카드 첫 0.3초 — 화면 전체 색 번짐 + 픽셀 조각(제목 글자는 그 위)
  return (
    <AbsoluteFill>
      {ba !== null && <ChromaFilter id="ca-burst" dx={BURST_CA * (1 - ba / BURST)} />}
      <AbsoluteFill style={ba !== null ? {filter: "url(#ca-burst)"} : undefined}>
        {ps.map((p, i) => (
          <Sequence key={i} from={p.start} durationInFrames={p.frames}>
            <ClipView p={p} d={data[keyOf(p.clip)]} boot0={bt[i]} synth={SYNTH[edit]} ps={ps} i={i} views={VIEWS[edit]} voice={voice} hq={hq}
            trailFrom={ps[i - 1]?.clip.tip && keyOf(ps[i - 1].clip) === keyOf(p.clip) ? null : p.clip.from} />
          </Sequence>
        ))}
      </AbsoluteFill>
      {ba !== null && <PixelBurst age={ba} win={BURST} W={width} H={height} />}
      {cue && <Caption text={cue.text} opacity={Math.min(1, (f - cue.start) / 8, (cue.end - f) / 8) * capFade} />}
      {/* 소리 — 효과음 · TTS(lib/edit sfxTrack · public/audio · 시안 14) */}
      {sfxTrack(ps, fps).map((s, i) => (
        <Sequence key={`sfx${i}`} from={s.frame} layout="none"><Html5Audio src={staticFile(`audio/${s.name}.wav`)} volume={s.volume} /></Sequence>
      ))}
      <Chapters ps={ps} />
      {edit === "skeleton" && (
        <div style={{position: "absolute", left: 40, bottom: 20, color: "#fff", font: "600 20px Pretendard", background: "rgba(0,0,0,.6)", padding: "4px 10px", borderRadius: 6}}>
          제작 흐름 뼈대 시험 · 10/8 영상 + 10/9 견본 기록(짝 아님)
        </div>
      )}
    </AbsoluteFill>
  );
};
