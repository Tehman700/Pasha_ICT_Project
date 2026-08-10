import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { colors } from "./theme";

/**
 * Scenes for empty states and the first-run walkthrough.
 *
 * Same reasoning as the icons and the landing page's artwork: drawn from the
 * existing palette rather than sourced, so nothing on screen arrives with a
 * different visual accent. Each one depicts the specific thing its screen is
 * about — a gate, a route, a code being read — not a generic "empty box"
 * mascot that would say nothing.
 *
 * Every illustration takes a `width` and scales by aspect ratio, so a screen
 * can size it without the drawing distorting.
 */

const INK = colors.ink;
const SOFT = colors.hairlineStrong;
const CANVAS = colors.canvasSoft;
const PRIMARY = colors.primary;

type Props = { width?: number };

function frame(width: number, ratio = 0.72) {
  return { width, height: Math.round(width * ratio) };
}

/** A gate with a verified collector — the product in one picture. */
export function GateScene({ width = 240 }: Props) {
  const { width: w, height: h } = frame(width);
  return (
    <Svg width={w} height={h} viewBox="0 0 240 174">
      <Rect width={240} height={174} rx={16} fill={CANVAS} />
      <Rect x={62} y={30} width={9} height={110} rx={4.5} fill={INK} />
      <Rect x={169} y={30} width={9} height={110} rx={4.5} fill={INK} />
      <Rect x={71} y={80} width={98} height={9} rx={4.5} fill={PRIMARY} />
      <Circle cx={120} cy={110} r={18} fill={INK} />
      <Path d="M99 148c3-14 14-21 21-21s18 7 21 21" stroke={INK} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Circle cx={141} cy={97} r={12} fill={PRIMARY} />
      <Path d="M136 97l3.5 3.5L147 93" stroke={colors.onPrimary} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** A route with an ETA bubble — "on my way". */
export function RouteScene({ width = 240 }: Props) {
  const { width: w, height: h } = frame(width);
  return (
    <Svg width={w} height={h} viewBox="0 0 240 174">
      <Rect width={240} height={174} rx={16} fill={CANVAS} />
      <Path d="M28 140C70 96 100 132 138 84S196 40 210 34" stroke={SOFT} strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" fill="none" />
      <Circle cx={28} cy={140} r={8} fill={INK} />
      <Rect x={196} y={22} width={12} height={28} rx={6} fill={INK} />
      <Circle cx={202} cy={26} r={4} fill={CANVAS} />
      <Circle cx={118} cy={102} r={9} fill={PRIMARY} />
      <Rect x={74} y={146} width={92} height={22} rx={11} fill={colors.surfaceCard} stroke={SOFT} strokeWidth={1.5} />
    </Svg>
  );
}

/** A rotating code on a phone. */
export function CodeScene({ width = 240 }: Props) {
  const { width: w, height: h } = frame(width);
  const cells = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if ((r * 7 + c * 3) % 5 < 2) {
        cells.push(<Rect key={`${r}-${c}`} x={99 + c * 9} y={54 + r * 9} width={7} height={7} fill={INK} />);
      }
    }
  }
  return (
    <Svg width={w} height={h} viewBox="0 0 240 174">
      <Rect width={240} height={174} rx={16} fill={CANVAS} />
      <Rect x={86} y={26} width={68} height={122} rx={12} fill={INK} />
      <Rect x={94} y={44} width={52} height={52} rx={3} fill={colors.canvas} />
      {cells}
      <Circle cx={120} cy={120} r={11} fill={PRIMARY} />
      <Path d="M115 120l3.5 3.5L126 116" stroke={colors.onPrimary} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** Scanning a code at the gate. */
export function ScanScene({ width = 240 }: Props) {
  const { width: w, height: h } = frame(width);
  return (
    <Svg width={w} height={h} viewBox="0 0 240 174">
      <Rect width={240} height={174} rx={16} fill={CANVAS} />
      <Rect x={54} y={34} width={132} height={106} rx={14} fill={INK} />
      <Path d="M78 62V52a6 6 0 0 1 6-6h10M146 46h10a6 6 0 0 1 6 6v10M162 112v10a6 6 0 0 1-6 6h-10M94 128H84a6 6 0 0 1-6-6v-10" stroke={colors.canvas} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Line x1={78} y1={87} x2={162} y2={87} stroke={PRIMARY} strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

/** Nobody in the queue yet. */
export function EmptyQueueScene({ width = 200 }: Props) {
  const { width: w, height: h } = frame(width, 0.62);
  return (
    <Svg width={w} height={h} viewBox="0 0 200 124">
      <Rect width={200} height={124} rx={14} fill={CANVAS} />
      {[52, 88, 124].map((x, i) => (
        <Circle key={x} cx={x} cy={58} r={13} fill="none" stroke={SOFT} strokeWidth={2.5} strokeDasharray={i === 0 ? undefined : "4 6"} />
      ))}
      <Path d="M40 92h120" stroke={SOFT} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

/** A handover just completed. */
export function HandoverDoneScene({ width = 200 }: Props) {
  const { width: w, height: h } = frame(width, 0.62);
  return (
    <Svg width={w} height={h} viewBox="0 0 200 124">
      <Rect width={200} height={124} rx={14} fill={CANVAS} />
      <Circle cx={100} cy={62} r={34} fill={PRIMARY} />
      <Path d="M85 62l10 10 21-21" stroke={colors.onPrimary} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** Who may collect — a parent granting access. */
export function CollectorsScene({ width = 240 }: Props) {
  const { width: w, height: h } = frame(width);
  return (
    <Svg width={w} height={h} viewBox="0 0 240 174">
      <Rect width={240} height={174} rx={16} fill={CANVAS} />
      <Circle cx={78} cy={78} r={22} fill={INK} />
      <Path d="M52 126c4-17 16-25 26-25s22 8 26 25" stroke={INK} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Path d="M118 87h30" stroke={SOFT} strokeWidth={4} strokeLinecap="round" />
      <Path d="M144 78l10 9-10 9" stroke={PRIMARY} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={186} cy={78} r={22} fill="none" stroke={PRIMARY} strokeWidth={3} strokeDasharray="5 6" />
      <Path d="M160 126c4-17 16-25 26-25s22 8 26 25" stroke={SOFT} strokeWidth={5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
