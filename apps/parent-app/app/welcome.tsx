import { useState } from "react";
import { useRouter } from "expo-router";
import {
  CodeScene,
  GateScene,
  Onboarding,
  RouteScene,
  Walkthrough,
  useLocale,
  type OnboardingCard,
  type WalkthroughStep,
} from "@pickup/ui-native";
import { CollectorsScene } from "@pickup/ui-native";

/**
 * The first screen of an install.
 *
 * Three cards, then sign in. "Take a quick tour" opens the same four-card
 * walkthrough a signed-in parent gets on first launch — running it here means
 * someone can understand what the app does before handing over a phone number,
 * which is the point at which most people decide whether to bother.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const { strings } = useLocale();
  const o = strings.onboarding;
  const w = strings.walkthrough;
  const [tour, setTour] = useState(false);

  const cards: OnboardingCard[] = [
    { title: o.p1Title, body: o.p1Body, art: <GateScene width={220} /> },
    { title: o.p2Title, body: o.p2Body, art: <RouteScene width={220} /> },
    { title: o.p3Title, body: o.p3Body, art: <CodeScene width={220} /> },
  ];

  const tourSteps: WalkthroughStep[] = [
    { title: w.p1Title, body: w.p1Body, art: <GateScene width={230} /> },
    { title: w.p2Title, body: w.p2Body, art: <RouteScene width={230} /> },
    { title: w.p3Title, body: w.p3Body, art: <CodeScene width={230} /> },
    { title: w.p4Title, body: w.p4Body, art: <CollectorsScene width={230} /> },
  ];

  return (
    <>
      <Onboarding
        cards={cards}
        onSignIn={() => router.push("/login")}
        onRegister={() => router.push("/register")}
        onTour={() => setTour(true)}
      />
      {/* Deliberately does NOT mark the walkthrough as seen. This is a preview
          for someone who has not signed in; the post-login run is per-role and
          introduces screens that only exist once there is an account. */}
      <Walkthrough visible={tour} steps={tourSteps} onDone={() => setTour(false)} />
    </>
  );
}
