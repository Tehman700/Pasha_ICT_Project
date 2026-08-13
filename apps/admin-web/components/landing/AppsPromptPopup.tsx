"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap, motion } from "@/lib/gsap";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/Button";
import { AppIcon } from "@/components/brand/Logo";

const STORAGE_KEY = "rukhsat.appsPrompt.seen";
const DELAY_MS = 10_000;

/**
 * A visitor on the marketing page has no reason to know the apps exist unless
 * they scroll all the way down — most don't. This nudges toward `/apps` once,
 * ten seconds in, rather than depending on them to find the link themselves.
 *
 * localStorage-gated like GuidedTour: once per browser, not once per page
 * view, so it doesn't nag someone reading the FAQ for the third time.
 */
export function AppsPromptPopup() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { strings } = useLocale();
  const l = strings.landing;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 16, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: motion.duration.fast, ease: motion.ease.entrance },
      );
    });
    return () => ctx.revert();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    setOpen(false);
    window.localStorage.setItem(STORAGE_KEY, "1");
  }

  function goToApps() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    router.push("/apps");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end tablet:items-center justify-center p-4 tablet:p-6">
      <div className="absolute inset-0 bg-ink/45" onClick={dismiss} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={l.getAppsPopupTitle}
        className="relative w-full max-w-sm bg-surface-card border border-hairline-strong rounded-lg p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <AppIcon variant="parent" size={40} />
          <AppIcon variant="staff" size={40} />
        </div>

        <p className="type-title-md text-ink">{l.getAppsPopupTitle}</p>
        <p className="type-body-sm text-muted mt-1.5">{l.getAppsPopupBody}</p>

        <div className="flex gap-3 mt-5">
          <Button variant="primary" onClick={goToApps} className="flex-1">
            {l.navApps}
          </Button>
          <Button variant="secondary" onClick={dismiss}>
            {l.getAppsPopupDismiss}
          </Button>
        </div>
      </div>
    </div>
  );
}
