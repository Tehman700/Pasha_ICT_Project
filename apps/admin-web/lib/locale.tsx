"use client";

/**
 * Locale context.
 *
 * Urdu is Tier 1, not a later pass — so the toggle exists from the first
 * screen and every component reads `t` from here rather than hardcoding
 * English. Switching also flips document direction to RTL, which is what
 * surfaces layout bugs early instead of on Day 6.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dir, t, type Locale, type Strings } from "@pickup/shared";

type LocaleContextValue = {
  locale: Locale;
  strings: Strings;
  dir: "ltr" | "rtl";
  toggle: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "pickup.locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ur") setLocale(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir(locale);
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const toggle = useCallback(() => {
    setLocale((prev) => (prev === "en" ? "ur" : "en"));
  }, []);

  return (
    <LocaleContext.Provider
      value={{ locale, strings: t(locale), dir: dir(locale), toggle }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}
