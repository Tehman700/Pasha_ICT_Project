"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale";
import { Wordmark } from "@/components/brand/Logo";

export function Footer() {
  const { strings } = useLocale();
  const l = strings.landing;

  return (
    <footer className="px-6 tablet:px-10 py-10 border-t border-hairline">
      <div className="max-w-[1200px] mx-auto flex flex-col tablet:flex-row items-start tablet:items-center justify-between gap-4">
        <div>
          <Wordmark markSize={22} />
          <p className="type-caption text-muted-soft mt-2">{l.footerTagline}</p>
        </div>
        <p className="type-caption text-muted-soft max-w-md tablet:text-end">{l.footerNote}</p>
      </div>
      <div className="max-w-[1200px] mx-auto mt-6 pt-6 border-t border-hairline-soft flex gap-5">
        <Link href="/apps" className="type-caption text-body hover:text-ink underline underline-offset-4">
          {l.navApps}
        </Link>
        <Link href="/login" className="type-caption text-body hover:text-ink underline underline-offset-4">
          {l.navLogin}
        </Link>
      </div>
    </footer>
  );
}
