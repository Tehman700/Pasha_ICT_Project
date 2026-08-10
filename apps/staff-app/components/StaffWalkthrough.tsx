import { useEffect, useState } from "react";
import {
  EmptyQueueScene,
  GateScene,
  HandoverDoneScene,
  ScanScene,
  Walkthrough,
  hasSeenWalkthrough,
  markWalkthroughSeen,
  useLocale,
  type WalkthroughStep,
} from "@pickup/ui-native";

/**
 * Role-specific introduction, shown once per role.
 *
 * Per role rather than per install: one phone at a school may be handed
 * between a guard and a teacher, and someone meeting the teacher screens for
 * the first time deserves the same introduction the guard got.
 *
 * The guard's last card is the manual fallback, deliberately. It is the step
 * most likely to be needed under pressure and least likely to be discovered
 * by exploring, and a guard who does not know it exists will turn a family
 * away — the exact outcome this whole system is supposed to prevent.
 */
export function StaffWalkthrough({ role }: { role: "teacher" | "guard" }) {
  const { strings } = useLocale();
  const w = strings.walkthrough;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasSeenWalkthrough(role).then((seen) => {
      if (!cancelled && !seen) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [role]);

  const steps: WalkthroughStep[] =
    role === "guard"
      ? [
          { title: w.g1Title, body: w.g1Body, art: <ScanScene width={230} /> },
          { title: w.g2Title, body: w.g2Body, art: <GateScene width={230} /> },
          { title: w.g3Title, body: w.g3Body, art: <HandoverDoneScene width={200} /> },
        ]
      : [
          { title: w.t1Title, body: w.t1Body, art: <EmptyQueueScene width={200} /> },
          { title: w.t2Title, body: w.t2Body, art: <GateScene width={230} /> },
        ];

  return (
    <Walkthrough
      visible={visible}
      steps={steps}
      onDone={async () => {
        setVisible(false);
        await markWalkthroughSeen(role);
      }}
    />
  );
}
