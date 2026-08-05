import type { ButtonHTMLAttributes } from "react";

/**
 * Buttons, exactly as specified in design.md §Components.
 *
 * `primary` is Cursor Orange and must stay scarce — one per view, reserved for
 * the single most important action. Anything else is `secondary` or `tertiary`.
 */

type Variant = "primary" | "secondary" | "tertiary" | "ink" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 font-medium text-[14px] leading-none " +
  "rounded-md transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  // design.md: bg primary, text on-primary, 10×18 padding, 40px height, 8px radius
  primary:
    "bg-primary text-on-primary h-10 px-[18px] hover:bg-primary-active active:bg-primary-active",
  // White card pill on cream canvas, hairline-strong border
  secondary:
    "bg-surface-card text-ink h-10 px-[18px] border border-hairline-strong hover:bg-canvas-soft",
  // Inline ink text link
  tertiary: "text-ink underline underline-offset-4 h-10 px-1 hover:text-primary",
  // Larger ink-canvas CTA — 12×20 padding, 44px height
  ink: "bg-ink text-canvas h-11 px-5 hover:bg-[#3a382f]",
  // Not in design.md. Destructive actions (revoke a collector) need to read as
  // destructive, and the semantic error token is the only honest source.
  danger:
    "bg-surface-card text-error h-10 px-[18px] border border-error/40 hover:bg-error/5",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
