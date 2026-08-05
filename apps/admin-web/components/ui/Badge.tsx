/**
 * Small uppercase pill. design.md `badge-pill`: surface-strong background,
 * ink text, caption-uppercase type, pill radius, 4×10 padding.
 */

type Tone = "neutral" | "success" | "error" | "primary" | "ink";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-strong text-ink",
  success: "bg-success/12 text-success",
  error: "bg-error/12 text-error",
  primary: "bg-primary/12 text-primary",
  ink: "bg-ink text-canvas",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center type-label rounded-full px-2.5 py-1 whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
