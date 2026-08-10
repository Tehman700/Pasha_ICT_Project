import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "./theme";

/**
 * The icon set, drawn rather than imported.
 *
 * An icon font or a package would be a megabyte of glyphs to use fifteen of,
 * and would arrive with its own visual language — rounded-cartoon or
 * thin-line — that fights design.md's flat, hairline-weight system. These are
 * built on the same 24-unit grid with the same 2px stroke as the gate mark, so
 * a button icon and the app icon read as one hand.
 *
 * Stroke, not fill, and `currentColor`-style inheritance via the `color` prop,
 * so an icon inside a primary button takes the button's foreground without a
 * per-variant copy of each icon.
 */

export type IconName =
  | "car"
  | "qr"
  | "check"
  | "clock"
  | "people"
  | "calendar"
  | "bell"
  | "user"
  | "gate"
  | "map"
  | "scan"
  | "hand"
  | "chevron"
  | "plus"
  | "shield";

const PATHS: Record<IconName, (c: string) => React.ReactNode> = {
  car: (c) => (
    <>
      <Path d="M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5L21 13" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x={3} y={13} width={18} height={5} rx={1.5} stroke={c} strokeWidth={2} fill="none" />
      <Circle cx={7.5} cy={18} r={1.5} fill={c} />
      <Circle cx={16.5} cy={18} r={1.5} fill={c} />
    </>
  ),
  qr: (c) => (
    <>
      <Rect x={3} y={3} width={7} height={7} rx={1.5} stroke={c} strokeWidth={2} fill="none" />
      <Rect x={14} y={3} width={7} height={7} rx={1.5} stroke={c} strokeWidth={2} fill="none" />
      <Rect x={3} y={14} width={7} height={7} rx={1.5} stroke={c} strokeWidth={2} fill="none" />
      <Path d="M14 14h3v3h-3zM19 19h2v2h-2z" fill={c} />
    </>
  ),
  check: (c) => (
    <Path d="M4 12.5l5 5L20 6.5" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  clock: (c) => (
    <>
      <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={2} fill="none" />
      <Path d="M12 7v5l3.5 2" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  people: (c) => (
    <>
      <Circle cx={9} cy={8} r={3.5} stroke={c} strokeWidth={2} fill="none" />
      <Path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M16 5.5a3.5 3.5 0 0 1 0 6.9M17.5 14.8c2.1.7 3.5 2.5 3.5 5.2" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  ),
  calendar: (c) => (
    <>
      <Rect x={3} y={5} width={18} height={16} rx={2} stroke={c} strokeWidth={2} fill="none" />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  ),
  bell: (c) => (
    <>
      <Path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z" stroke={c} strokeWidth={2} strokeLinejoin="round" fill="none" />
      <Path d="M10 19a2 2 0 0 0 4 0" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  ),
  user: (c) => (
    <>
      <Circle cx={12} cy={8} r={3.8} stroke={c} strokeWidth={2} fill="none" />
      <Path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  ),
  gate: (c) => (
    <>
      <Rect x={4} y={4} width={3} height={16} rx={1.5} fill={c} />
      <Rect x={17} y={4} width={3} height={16} rx={1.5} fill={c} />
      <Rect x={7} y={10.5} width={10} height={3} rx={1.5} fill={colors.primary} />
    </>
  ),
  map: (c) => (
    <>
      <Path d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" stroke={c} strokeWidth={2} strokeLinejoin="round" fill="none" />
      <Path d="M9 4v13M15 6.5v13" stroke={c} strokeWidth={2} fill="none" />
    </>
  ),
  scan: (c) => (
    <>
      <Path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M3 12h18" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  ),
  hand: (c) => (
    <Path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 6.5-6 6.5S5 18 5 14v-2a1.5 1.5 0 0 1 3 0" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  chevron: (c) => (
    <Path d="M9 5l7 7-7 7" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  plus: (c) => (
    <Path d="M12 5v14M5 12h14" stroke={c} strokeWidth={2.5} strokeLinecap="round" fill="none" />
  ),
  shield: (c) => (
    <>
      <Path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z" stroke={c} strokeWidth={2} strokeLinejoin="round" fill="none" />
      <Path d="M9 12l2 2 4-4" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {PATHS[name](color)}
    </Svg>
  );
}
