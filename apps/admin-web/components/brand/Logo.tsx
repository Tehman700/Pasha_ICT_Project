/**
 * The Rukhsat mark.
 *
 * A wordmark, not a pictogram — design.md's whole visual language is
 * typographic (Inter at 400 weight, negative tracking, one scarce accent
 * colour), so a literal icon (a gate, a car, a child) would be the first
 * thing on the page that didn't come from the system it's representing.
 *
 * The mark is the gate itself: two ink strokes standing for the posts, one
 * orange stroke for the barrier — closed by default, the way a real gate is
 * closed until a verified handover opens it. It reads at 24px in a browser
 * tab and doesn't fight the wordmark for attention next to it.
 */

export function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="6" y="5" width="3" height="22" rx="1.5" fill="var(--color-ink)" />
      <rect x="23" y="5" width="3" height="22" rx="1.5" fill="var(--color-ink)" />
      <rect x="9" y="14.5" width="14" height="3" rx="1.5" fill="var(--color-primary)" />
    </svg>
  );
}

/**
 * A home-screen-style icon tile for one of the two apps, built from the
 * same two-post-and-a-barrier mark as the wordmark rather than a fresh
 * logo — so a judge who has seen the web dashboard recognises the phone
 * app icon as the same product, not a different one.
 *
 * The two variants reuse a colour split that already exists everywhere
 * else in this system: staff/guard surfaces are ink-inverted (see
 * `colors.inverted` in packages/shared — the guard verdict screen and the
 * classroom display both work this way, for legibility in direct sun and
 * across a room). Parent stays on the cream canvas that's the default
 * everywhere else. Neither is a new colour — both come straight out of
 * the existing token set.
 */
export function AppIcon({
  variant,
  size = 96,
}: {
  variant: "parent" | "staff";
  size?: number;
}) {
  const inverted = variant === "staff";
  const tile = inverted ? "var(--color-ink)" : "var(--color-canvas)";
  const post = inverted ? "var(--color-inv-text)" : "var(--color-ink)";

  return (
    <svg width={size} height={size} viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <rect width="96" height="96" rx="21.5" fill={tile} />
      <rect x="30" y="22" width="9" height="52" rx="4.5" fill={post} />
      <rect x="57" y="22" width="9" height="52" rx="4.5" fill={post} />
      <rect x="34" y="44" width="28" height="9" rx="4.5" fill="var(--color-primary)" />
    </svg>
  );
}

export function Wordmark({
  className = "",
  markSize = 28,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={markSize} />
      <span className="type-title-md text-ink tracking-tight">
        Rukhsat
        <span className="text-primary">.</span>
      </span>
    </span>
  );
}
