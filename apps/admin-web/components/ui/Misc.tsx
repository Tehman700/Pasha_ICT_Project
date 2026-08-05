import { Card } from "./Card";

/** Big-number tile. Ink numeral, muted label — no colour unless the number is a warning. */
export function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "error";
}) {
  const valueTone =
    tone === "success" ? "text-success" : tone === "error" ? "text-error" : "text-ink";
  return (
    <Card>
      <p className="type-label text-muted mb-3">{label}</p>
      <p className={`type-display-lg ${valueTone}`}>{value}</p>
      {sub ? <p className="type-caption text-muted mt-2">{sub}</p> : null}
    </Card>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-hairline-strong rounded-lg py-16 text-center">
      <p className="type-body text-muted">{message}</p>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div className="max-w-2xl">
        <h1 className="type-display-lg">{title}</h1>
        {subtitle ? <p className="type-body text-muted mt-2">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

/** Skeleton row for loading states — hairline-only, consistent with the depth system. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-hairline rounded-lg bg-surface-card divide-y divide-hairline-soft">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex gap-4 items-center">
          <div className="h-3 w-1/4 bg-surface-strong rounded-xs animate-pulse" />
          <div className="h-3 w-1/3 bg-hairline-soft rounded-xs animate-pulse" />
          <div className="h-3 w-1/6 bg-hairline-soft rounded-xs animate-pulse ms-auto" />
        </div>
      ))}
    </div>
  );
}
