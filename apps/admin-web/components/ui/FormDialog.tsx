"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, motion } from "@/lib/gsap";
import { useLocale } from "@/lib/locale";
import { Button } from "./Button";

/**
 * A modal form, shared by every "Add …" button in the dashboard.
 *
 * These pages previously rendered inputs and a Save button with no handler, so
 * they looked editable and silently discarded whatever was typed. One dialog
 * means the add flows behave identically everywhere and there is one place to
 * get error handling right rather than five.
 *
 * The submit button stays enabled while a required field is empty, and the
 * form says which field is missing on submit. Disabling it instead gives a
 * dead button and no explanation, which is the same dead end the old Save
 * button was.
 */
export function FormDialog({
  open,
  title,
  description,
  submitLabel,
  busy,
  error,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 12, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: motion.duration.fast,
          ease: motion.ease.entrance,
        },
      );
    });
    return () => ctx.revert();
  }, [open]);

  // Escape closes. A modal you can only leave with the mouse is a trap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md bg-surface-card border border-hairline-strong rounded-lg p-6 max-h-[85vh] overflow-y-auto"
      >
        <p className="type-title-md text-ink">{title}</p>
        {description ? (
          <p className="type-caption text-muted mt-1.5">{description}</p>
        ) : null}

        <form
          className="space-y-4 mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {children}

          {error ? (
            <p
              role="alert"
              className="type-body-sm text-error border border-error/30 rounded-md px-3 py-2"
            >
              {error}
            </p>
          ) : null}

          <div className="flex gap-3 pt-1">
            <Button variant="primary" type="submit" disabled={busy} className="flex-1">
              {busy ? "…" : submitLabel}
            </Button>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Shared add-form state: open/close, busy, error, and a reset on close. */
export function useAddDialog() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { strings } = useLocale();

  function close() {
    setOpen(false);
    setBusy(false);
    setError(null);
  }

  /** Maps the failures these forms actually produce to something readable. */
  function fail(err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 409) setError(strings.register.phoneTaken);
    else if (status === 422) setError(strings.auth.phoneFormat);
    else setError(strings.errors.network);
  }

  return { open, setOpen, busy, setBusy, error, setError, close, fail };
}
