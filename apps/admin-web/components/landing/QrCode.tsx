"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Generated entirely client-side, offline — no third-party QR API, no
 * network call, nothing that could silently fail if a venue's Wi-Fi is bad
 * on the day this actually gets used in front of judges.
 */
export function QrCode({ value, size = 148 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size * 2, // 2x for crisp rendering on high-DPI phone cameras
      margin: 1,
      color: { dark: "#26251e", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className="bg-canvas-soft border border-hairline rounded-md animate-pulse"
        style={{ width: size, height: size }}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={dataUrl}
      alt="QR code"
      width={size}
      height={size}
      className="border border-hairline rounded-md bg-white p-2"
    />
  );
}
