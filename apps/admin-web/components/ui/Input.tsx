import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import {
  CNIC_LENGTH,
  CNIC_PLACEHOLDER,
  PHONE_PLACEHOLDER,
  formatCnic,
  formatPhoneInput,
} from "@pickup/shared";

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

/**
 * Phone field — 11 digits, `03xxxxxxxxx`, nothing else typeable.
 *
 * Mirrors `PhoneInput` in packages/ui-native. Both exist so the rule lives in
 * one shared formatter (`formatPhoneInput`) rather than as a `maxLength` prop
 * that call sites forget, which is exactly how the four admin forms ended up
 * accepting a 15-digit number the server then rejected.
 *
 * `dir="ltr"` is forced: a phone number reads left-to-right even in Urdu.
 */
export function PhoneInput({
  value,
  onValueChange,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (next: string) => void;
}) {
  return (
    <input
      className={`${field} ${className}`}
      value={value}
      onChange={(e) => onValueChange(formatPhoneInput(e.target.value))}
      placeholder={PHONE_PLACEHOLDER}
      inputMode="numeric"
      autoComplete="tel"
      // No maxLength - see the note on the React Native PhoneInput. It caps at
      // 11 characters *before* formatPhoneInput can normalise a pasted
      // "+92 321 5000011", turning a correct paste into a wrong number.
      dir="ltr"
      {...props}
    />
  );
}

/** CNIC field — dashes inserted as you pass each boundary, `38515-1952462-5`. */
export function CnicInput({
  value,
  onValueChange,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (next: string) => void;
}) {
  return (
    <input
      className={`${field} ${className}`}
      value={value}
      onChange={(e) => onValueChange(formatCnic(e.target.value))}
      placeholder={CNIC_PLACEHOLDER}
      inputMode="numeric"
      maxLength={CNIC_LENGTH + 2}
      dir="ltr"
      {...props}
    />
  );
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
