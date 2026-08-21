import { useState } from "react";
import { useRouter } from "expo-router";
import {
  CodeScene,
  GateScene,
  RouteScene,
  Tour,
  Welcome,
  useLocale,
  type TourCard,
} from "@pickup/ui-native";

/**
 * The first screen of an install.
 *
 * A hero asking for a decision, with the pitch one tap away rather than in
 * front of it. Someone reinstalling reaches the phone field immediately;
 * someone who has never heard of this can ask to be told first, which is the
 * point at which most people decide whether to bother.
 *
 * The tour deliberately does NOT mark the post-login walkthrough as seen. This
 * is a preview for someone without an account; the walkthrough is per-role and
 * introduces screens that only exist once there is one.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const { strings } = useLocale();
  const o = strings.onboarding;
  const [tour, setTour] = useState(false);

  const cards: TourCard[] = [
    { title: o.p1Title, body: o.p1Body, art: <GateScene width={220} /> },
    { title: o.p2Title, body: o.p2Body, art: <RouteScene width={220} /> },
    { title: o.p3Title, body: o.p3Body, art: <CodeScene width={220} /> },
  ];


  if (tour) return <Tour cards={cards} onDone={() => setTour(false)} />;

  return (
    <Welcome
      headline={o.p1Title}
      onSignIn={() => router.push("/login")}
      onRegister={() => router.push("/register")}
      onTour={() => setTour(true)}
    />
  );
}
