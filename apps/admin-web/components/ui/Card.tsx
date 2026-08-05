import type { HTMLAttributes } from "react";

/**
 * Card surface. design.md: white on cream canvas, 12px radius, 24px padding,
 * 1px hairline border, and — critically — no shadow. Hairlines plus the
 * white-on-cream contrast are the entire depth system.
 */
export function Card({
  className = "",
  padded = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div
      className={`bg-surface-card border border-hairline rounded-lg ${padded ? "p-6" : ""} ${className}`}
      {...props}
    />
  );
}

/** Section label above a card group. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="type-label text-muted mb-3">{children}</p>;
}
