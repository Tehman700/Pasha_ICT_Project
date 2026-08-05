/**
 * Table primitives.
 *
 * Hairline dividers only — no zebra striping, no shadows. Wide tables scroll
 * inside their own container so the page body never scrolls horizontally.
 */

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-hairline rounded-lg bg-surface-card">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-hairline">
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  align = "start",
}: {
  children?: React.ReactNode;
  align?: "start" | "end";
}) {
  return (
    <th
      className={`type-label text-muted font-semibold px-5 py-3.5 whitespace-nowrap ${align === "end" ? "text-end" : "text-start"}`}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`border-b border-hairline-soft last:border-0 hover:bg-canvas-soft transition-colors ${className}`}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = "start",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  return (
    <td
      className={`px-5 py-4 type-body-sm text-body align-middle ${align === "end" ? "text-end" : "text-start"} ${className}`}
    >
      {children}
    </td>
  );
}
