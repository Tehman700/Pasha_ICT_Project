"use client";

import { useLocale } from "@/lib/locale";
import { GuidedTour, type TourStep } from "./GuidedTour";

/**
 * The six-step arrow walkthrough over the real admin nav.
 *
 * Auto-launches once (localStorage-gated inside GuidedTour) and can be
 * relaunched from the "Take the tour" button in Shell's header, which fires
 * a plain DOM event — GuidedTour listens for it directly, so this component
 * stays a pure step-list and doesn't need to know how the button works.
 */
export function DashboardTour({ autoStart }: { autoStart: boolean }) {
  const { strings } = useLocale();
  const t = strings.tour;

  const steps: TourStep[] = [
    { target: "nav-queue", title: t.step1Title, body: t.step1Body, side: "right" },
    { target: "nav-students", title: t.step2Title, body: t.step2Body, side: "right" },
    { target: "nav-drivers", title: t.step3Title, body: t.step3Body, side: "right" },
    { target: "nav-devices", title: t.step4Title, body: t.step4Body, side: "right" },
    { target: "nav-audit", title: t.step5Title, body: t.step5Body, side: "right" },
    { target: "tour-button", title: t.step6Title, body: t.step6Body, side: "bottom" },
  ];

  return <GuidedTour steps={steps} autoStart={autoStart} />;
}
