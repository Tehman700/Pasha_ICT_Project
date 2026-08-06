import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/locale";
import { ApiProvider } from "@/lib/api";

/**
 * design.md specifies CursorGothic (licensed); Inter at weight 400 with
 * negative tracking is the documented substitute. JetBrains Mono covers every
 * mono surface. Noto Nastaliq Urdu is not a nicety — Inter has no Urdu glyphs
 * at all.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const nastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Rukhsat — Admin",
  description:
    "Queue and verification system for school dismissal. Admin dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${inter.variable} ${jetbrains.variable} ${nastaliq.variable} h-full`}
    >
      <body className="min-h-full bg-canvas">
        <ApiProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ApiProvider>
      </body>
    </html>
  );
}
