"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useFadeIn } from "@/lib/gsap";

/**
 * Classroom display pairing.
 *
 * Runs on a wall-mounted tablet in kiosk mode. Ink-inverted because this
 * screen is read from across a room, not at arm's length.
 *
 * Built as a web route rather than a React Native screen: pairing a display
 * becomes "open a URL and enter a code" instead of "install an APK, then
 * pair it".
 */
export default function DisplayPairPage() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const [code, setCode] = useState("");
  const ref = useFadeIn<HTMLDivElement>();

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api.listClasses() });

  return (
    <div className="min-h-screen bg-inv-canvas text-inv-text flex items-center justify-center px-8">
      <div ref={ref} className="w-full max-w-2xl text-center">
        <p className="type-label text-inv-muted mb-6">{strings.common.appName}</p>
        <h1 className="text-[64px] leading-[1.1] tracking-[-1.9px] font-normal mb-4">
          {strings.display.pairTitle}
        </h1>
        <p className="text-[20px] text-inv-muted mb-12">{strings.display.pairPrompt}</p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          dir="ltr"
          className="w-full max-w-md mx-auto block text-center bg-inv-canvas-soft text-inv-text
                     border border-inv-hairline rounded-lg h-20 text-[40px] tracking-[0.4em]
                     font-[family-name:var(--font-jetbrains)] outline-none
                     focus:border-primary transition-colors placeholder:text-inv-muted/40"
        />

        <div className="mt-12">
          <p className="type-label text-inv-muted mb-4">Or pick a class directly</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {classes.data?.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/display/${c.id}`)}
                className="h-12 px-6 rounded-md border border-inv-hairline text-inv-text
                           text-[16px] hover:bg-inv-canvas-soft hover:border-primary transition-colors"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
