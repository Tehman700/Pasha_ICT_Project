import { useEffect, useState } from "react";
import {
  CodeScene,
  CollectorsScene,
  GateScene,
  RouteScene,
  Walkthrough,
  hasSeenWalkthrough,
  markWalkthroughSeen,
  useLocale,
  type WalkthroughStep,
} from "@pickup/ui-native";

/**
 * Four cards, shown once, the first time a collector reaches the home screen.
 *
 * Ordered as the product actually works rather than as a feature list: what
 * the gate guarantees, then the one action a collector takes, then the code
 * they show, and only then delegation — which is the thing nobody discovers
 * on their own and the thing the whole safety model rests on.
 */
export function ParentWalkthrough() {
  const { strings } = useLocale();
  const w = strings.walkthrough;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasSeenWalkthrough("parent").then((seen) => {
      if (!cancelled && !seen) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const steps: WalkthroughStep[] = [
    { title: w.p1Title, body: w.p1Body, art: <GateScene width={230} /> },
    { title: w.p2Title, body: w.p2Body, art: <RouteScene width={230} /> },
    { title: w.p3Title, body: w.p3Body, art: <CodeScene width={230} /> },
    { title: w.p4Title, body: w.p4Body, art: <CollectorsScene width={230} /> },
  ];

  return (
    <Walkthrough
      visible={visible}
      steps={steps}
      onDone={async () => {
        setVisible(false);
        await markWalkthroughSeen("parent");
      }}
    />
  );
}
