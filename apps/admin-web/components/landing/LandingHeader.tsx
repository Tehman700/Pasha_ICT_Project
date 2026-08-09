"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale";
import { Wordmark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export function LandingHeader() {
  const { strings, locale, toggle } = useLocale();
  const l = strings.landing;

  return (
    <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 tablet:px-10 border-b border-hairline bg-canvas/90 backdrop-blur">
      <Link href="/">
        <Wordmark />
      </Link>

      <nav className="ms-auto flex items-center gap-2 tablet:gap-3">
        <Link
          href="/apps"
          className="hidden tablet:inline-flex type-body-sm text-body hover:text-ink h-9 items-center px-3"
        >
          {l.navApps}
        </Link>
        <button
          onClick={toggle}
          className="type-body-sm text-body hover:text-ink border border-hairline-strong rounded-md h-9 px-3 bg-surface-card transition-colors"
          aria-label="Toggle language"
        >
          {locale === "en" ? "اردو" : "English"}
        </button>
        <Link href="/#demo">
          <Button variant="secondary">{l.navRegister}</Button>
        </Link>
        <Link href="/login">
          <Button variant="primary">{l.navLogin}</Button>
        </Link>
      </nav>
    </header>
  );
}
