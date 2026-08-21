import { useState } from "react";
import { useRouter } from "expo-router";
import {
  EmptyQueueScene,
  HandoverDoneScene,
  ScanScene,
  Tour,
  Welcome,
  useLocale,
  type TourCard,
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
  const [tour, setTour] = useState(false);

  const cards: TourCard[] = [
    { title: o.s1Title, body: o.s1Body, art: <ScanScene width={220} /> },
    { title: o.s2Title, body: o.s2Body, art: <EmptyQueueScene width={200} /> },
    { title: o.s3Title, body: o.s3Body, art: <HandoverDoneScene width={200} /> },
  ];


  if (tour) return <Tour cards={cards} onDone={() => setTour(false)} />;

  // No "create account". Teachers and guards are created by their school in
  // the admin dashboard - a gate guard who could self-register would be a gate
  // guard the school never approved.
  return (
    <Welcome
      headline={o.s1Title}
      onSignIn={() => router.push("/login")}
      onTour={() => setTour(true)}
    />
  );
}
