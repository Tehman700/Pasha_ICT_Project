import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

/** design.md `text-input`: white surface, 8px radius, 12×16 padding, 44px height. */

const field =
  "w-full h-11 px-4 bg-surface-card text-ink rounded-md border border-hairline-strong " +
  "placeholder:text-muted-soft focus:border-primary outline-none transition-colors";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${field} ${className}`} {...props} />;
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${field} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="type-label text-muted block mb-2">{label}</span>
      {children}
      {hint ? <span className="type-caption text-muted block mt-1.5">{hint}</span> : null}
    </label>
  );
}
