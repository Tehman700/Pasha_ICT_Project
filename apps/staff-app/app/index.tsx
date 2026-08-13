import { useState } from "react";
import { useRouter } from "expo-router";
import {
  EmptyQueueScene,
  HandoverDoneScene,
  Onboarding,
  ScanScene,
  Walkthrough,
  useLocale,
  type OnboardingCard,
  type WalkthroughStep,
} from "@pickup/ui-native";

/**
 * Staff app entry: three cards, then sign in.
 *
 * There is no "create account" here on purpose. Teachers and guards are
 * created by their school in the admin dashboard — a gate guard who could
 * self-register would be a gate guard the school never approved, which is the
 * one place in this system where self-registration would be a hole rather
 * than a feature. (Drivers self-register in the other app precisely because a
 * parent, not the school, vouches for them.)
 */
export default function StaffWelcomeScreen() {
  const router = useRouter();
  const { strings } = useLocale();
  const o = strings.onboarding;
  const w = strings.walkthrough;
  const [tour, setTour] = useState(false);

  const cards: OnboardingCard[] = [
    { title: o.s1Title, body: o.s1Body, art: <ScanScene width={220} /> },
    { title: o.s2Title, body: o.s2Body, art: <EmptyQueueScene width={200} /> },
    { title: o.s3Title, body: o.s3Body, art: <HandoverDoneScene width={200} /> },
  ];

  // The guard sequence: what the scan proves, and what to do when it fails.
  const tourSteps: WalkthroughStep[] = [
    { title: w.g1Title, body: w.g1Body, art: <ScanScene width={230} /> },
    { title: w.g2Title, body: w.g2Body, art: <HandoverDoneScene width={210} /> },
    { title: w.g3Title, body: w.g3Body, art: <EmptyQueueScene width={210} /> },
  ];

  return (
    <>
      <Onboarding cards={cards} onSignIn={() => router.push("/login")} onTour={() => setTour(true)} />
      <Walkthrough visible={tour} steps={tourSteps} onDone={() => setTour(false)} />
    </>
  );
}
