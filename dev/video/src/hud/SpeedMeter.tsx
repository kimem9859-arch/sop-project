import type {Pt} from "../lib/dets.ts";
import {SLOW_PX_S, SPEED_MAX, type SpeedRead} from "../lib/speed.ts";
import {C, FONT, easeOut} from "./theme.ts";

// 판정 기준 장면 — 손끝 확대 창(크롭) + 손끝 속도 계기(수정 18 · 사용자 「손 포인트를 크롭하여 속도감을 주고 버튼으로 빨리 가다가 멈추는 연출로
//   손 속도도 판정 기준이다라는 것을 보여 주었으면」)
//   창 = 검지 끝을 가운데에 두고 ZOOM 배(손이 없으면 판정 구역 가운데) · 빠를수록 손끝 뒤 속도선이 길고 짙다 · 느려지면 사라지고 주황 고리
//   계기 = 실제 검출로 잰 속도(lib/speed) · 「느림 기준」 선은 개념 표시(숫자 없음 — 폰 화면 픽셀 ≠ 안경 카메라 픽셀)
//   video = 같은 촬영 화면을 전체 크기로 그리는 것(Cut 의 vid · 정지 구간이면 Freeze 로 감싸 온다) · center · trail = 화면 좌표
export const METER = {x: 40, y: 430, S: 320};   // 왼쪽 단계 목록 아래 — 손 · 판정 버튼 · 자막 · 음성 알림을 가리지 않는 자리
const ZOOM = 2.2;
const TIP = "#62e6ff";
const LABEL: Record<SpeedRead["kind"], string> = {approach: "다가가는 중", fast: "빠름", slow: "느려짐 → 바로 경고", passed: "빠르게 지나감 → 경고 없음"};
const colOf = (r: SpeedRead | null) => (!r ? C.label : r.kind === "slow" ? C.warn : r.kind === "passed" ? C.done : C.info);

// age · left = 계기 장면 첫 구간부터 · 마지막 구간 끝까지 화면 초(나타남 0.25초 · 다음 절 카드 전에 사라짐 0.3초)
export const SpeedMeter: React.FC<{video: React.ReactNode; center: Pt; trail: Pt[]; read: SpeedRead | null; age: number; left: number; t: number; W: number; H: number}> =
  ({video, center, trail, read, age, left, t, W, H}) => {
    const {x, y, S} = METER;
    const a = easeOut(Math.min(1, Math.max(0, age) / 0.25)) * Math.min(1, Math.max(0, left) / 0.3);
    const col = colOf(read);
    const [cx, cy] = center;
    const toIn = ([px, py]: Pt): Pt => [(px - cx) * ZOOM + S / 2, (py - cy) * ZOOM + S / 2];
    const T = trail.map(toIn);
    // 속도선 — 움직이는 방향의 반대쪽으로 5줄 · 세기 = 기준의 0.6배부터 최대까지(느려지면 0)
    const v = read?.v ?? 0, k = Math.max(0, Math.min(1, (v - SLOW_PX_S * 0.6) / (SPEED_MAX - SLOW_PX_S * 0.6)));
    const [p0, p1] = trail.length >= 2 ? [trail[Math.max(0, trail.length - 4)], trail[trail.length - 1]] : [center, center];
    const dl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const u: Pt = dl > 1e-6 ? [(p1[0] - p0[0]) / dl, (p1[1] - p0[1]) / dl] : [1, 0], n: Pt = [-u[1], u[0]];
    const slow = read?.kind === "slow";
    const pulse = slow ? 0.5 + 0.5 * Math.sin(t * Math.PI * 6) : 0;
    const fill = Math.min(1, v / SPEED_MAX), mark = SLOW_PX_S / SPEED_MAX;
    return (
      <div style={{position: "absolute", left: x, top: y, width: S, opacity: a, transform: `scale(${0.9 + 0.1 * a})`, transformOrigin: "0 0", fontFamily: FONT}}>
        <div style={{position: "relative", width: S, height: S, borderRadius: 18, overflow: "hidden", background: "#000",
          border: `3px solid ${col}`, boxShadow: `0 0 ${(18 + 22 * pulse).toFixed(1)}px ${col}, 0 10px 28px rgba(0,0,0,0.6)`}}>
          <div style={{position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0",
            transform: `translate(${(S / 2 - cx * ZOOM).toFixed(1)}px, ${(S / 2 - cy * ZOOM).toFixed(1)}px) scale(${ZOOM})`}}>{video}</div>
          <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
            {k > 0 && [-2, -1, 0, 1, 2].map((i) => {
              const off = 16 * i, back = 26 + 8 * Math.abs(i), len = (60 + 140 * k) * (1 - 0.18 * Math.abs(i));
              const sx = S / 2 - u[0] * back + n[0] * off, sy = S / 2 - u[1] * back + n[1] * off;
              return <line key={i} x1={sx} y1={sy} x2={sx - u[0] * len} y2={sy - u[1] * len} stroke="#ffffff" strokeWidth={i === 0 ? 4 : 2.5}
                strokeLinecap="round" opacity={(0.25 + 0.55 * k) * (1 - 0.2 * Math.abs(i))} />;
            })}
            {T.slice(1).map(([qx, qy], i) => {
              const w = (i + 1) / (T.length - 1);
              return <line key={`t${i}`} x1={T[i][0]} y1={T[i][1]} x2={qx} y2={qy} stroke={TIP} strokeWidth={4 + 10 * w} strokeLinecap="round" opacity={0.15 + 0.6 * w} />;
            })}
            {slow && <circle cx={S / 2} cy={S / 2} r={24 + 6 * pulse} fill="none" stroke={C.warn} strokeWidth={5} opacity={0.9} />}
            <circle cx={S / 2} cy={S / 2} r={9} fill="#ffffff" stroke={TIP} strokeWidth={3} />
          </svg>
          <div style={{position: "absolute", left: 12, top: 8, fontSize: 20, fontWeight: 800, color: C.text, textShadow: "0 1px 4px rgba(0,0,0,0.95)"}}>손끝 확대</div>
        </div>
        <div style={{marginTop: 14, fontSize: 22, fontWeight: 800, color: C.label}}>손끝 속도</div>
        <div style={{position: "relative", height: 16, marginTop: 8, borderRadius: 8, background: "rgba(255,255,255,0.14)"}}>
          <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: `${(fill * 100).toFixed(1)}%`, borderRadius: 8, background: col,
            boxShadow: `0 0 12px ${col}`}} />
          <div style={{position: "absolute", left: `${mark * 100}%`, top: -6, width: 3, height: 28, marginLeft: -1.5, background: C.text}} />
        </div>
        <div style={{position: "relative", height: 26, marginTop: 6}}>
          <span style={{position: "absolute", left: `${mark * 100}%`, transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 18, fontWeight: 700, color: C.text}}>
            ▲ 느림 기준
          </span>
        </div>
        {/* 읽은 결과는 따로 한 줄(좁은 폭에서 「손끝 속도」와 한 줄이면 깨진다) */}
        <div style={{marginTop: 4, fontSize: 24, fontWeight: 800, color: col, whiteSpace: "nowrap"}}>{read ? LABEL[read.kind] : ""}</div>
      </div>
    );
  };
