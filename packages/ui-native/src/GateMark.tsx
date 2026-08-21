import Svg, { Line } from "react-native-svg";
import { colors } from "./theme";

/**
 * The Rukhsat mark: two posts and a boom barrier.
 *
 * Traced from apps/admin-web/app/icon.svg, with the barrier extended past the
 * posts rather than sitting between them. The dashboard's version reads as a
 * capital H once it is bigger than a favicon — and Rukhsat starts with an R,
 * so the letterform is noise. Crossing the posts is what makes it a gate.
 *
 * Drawn as round-capped strokes, not rounded rects: a 9-wide stroke with round
 * caps extends 4.5 past each endpoint, which is the same capsule in a third of
 * the geometry.
 */
export function GateMark({
  size = 72,
  post = colors.canvas,
  bar = colors.ink,
}: {
  size?: number;
  /** Post colour. Cream on the orange hero, ink on cream surfaces. */
  post?: string;
  /** The barrier. Must contrast with [post] or the mark collapses into an H. */
  bar?: string;
}) {
  // 56x56 viewbox: the 52x52 glyph with 2 units of padding.
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Line x1={14.5} y1={6.5} x2={14.5} y2={49.5} stroke={post} strokeWidth={9} strokeLinecap="round" />
      <Line x1={41.5} y1={6.5} x2={41.5} y2={49.5} stroke={post} strokeWidth={9} strokeLinecap="round" />
      <Line x1={6.5} y1={28.5} x2={49.5} y2={28.5} stroke={bar} strokeWidth={9} strokeLinecap="round" />
    </Svg>
  );
}
