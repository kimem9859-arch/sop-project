// 선 아이콘 — 24 격자 · 같은 굵기(2) · 둥근 끝 · 이모지를 아이콘으로 쓰지 않는다
type P = {size?: number; color: string};
const Svg: React.FC<P & {children: React.ReactNode}> = ({size = 28, color, children}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" style={{flex: "none"}}>{children}</svg>
);
export const IconWarn: React.FC<P> = (p) => (
  <Svg {...p}><path d="M12 3.5 21.5 20h-19z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.2" r="0.6" fill={p.color} /></Svg>
);
export const IconStop: React.FC<P> = (p) => (
  <Svg {...p}><path d="M8.2 2.5h7.6l5.7 5.7v7.6l-5.7 5.7H8.2l-5.7-5.7V8.2z" /><path d="M7.5 12h9" /></Svg>
);
export const IconCheck: React.FC<P> = (p) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const IconMic: React.FC<P> = (p) => (
  <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0" /><path d="M12 17.5V21" /></Svg>
);
export const IconWrench: React.FC<P> = (p) => (
  <Svg {...p}><path d="M14.7 6.3a4 4 0 0 0-5.3 5.2L3.5 17.4a1.5 1.5 0 0 0 2.1 2.1l5.9-5.9a4 4 0 0 0 5.2-5.3l-2.4 2.4-2.1-.4-.4-2.1z" /></Svg>
);
export const IconSpeaker: React.FC<P> = (p) => (
  <Svg {...p}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 6.5a7.5 7.5 0 0 1 0 11" /></Svg>
);
