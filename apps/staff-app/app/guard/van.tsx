import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Loading,
  Row,
  Screen,
  Spacer,
  T,
  colors,
  motion,
  radius,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";

/**
 * Van handover — one scan, many children.
 *
 * A parent handover is atomic. A van's is not: the guard scans once, then
 * confirms each child individually as they board. That partial state exists
 * nowhere else in the product.
 *
 * Speed matters operationally. A van of 12 at ~5s each is over a minute in the
 * shared lane (there is no separate van lane), so every extra tap here backs
 * up the queue behind it.
 */
export default function VanHandoverScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const [boarded, setBoarded] = useState<string[]>([]);

  const entry = useQuery({
    queryKey: ["queue"],
    queryFn: () => api.getQueue(),
  });

  const van = entry.data?.find((e) => e.collector_role === "driver");
  const children = van?.sibling_group ?? [];
  const remaining = children.length - boarded.length;
  const complete = children.length > 0 && remaining === 0;

  return (
    <Screen inverted>
      <Row>
        <T
          variant="bodySm"
          color={colors.inverted.textMuted}
          onPress={() => router.back()}
        >
          ← {strings.common.back}
        </T>
        <View style={{ flex: 1 }} />
        <Badge tone="success">{strings.staff.verified}</Badge>
      </Row>

      <Spacer h={spacing.lg} />

      <T variant="displaySm" color={colors.inverted.text}>
        {strings.staff.vanHandover}
      </T>
      <Spacer h={4} />
      <T variant="bodySm" color={colors.inverted.textMuted}>
        {van?.collector_name} · {strings.staff.confirmEachChild}
      </T>

      <Spacer h={spacing.base} />

      {/* Progress — the guard needs to know how many are left at a glance. */}
      <Row>
        <T variant="displayMd" color={colors.inverted.text}>
          {boarded.length}
        </T>
        <T variant="titleMd" color={colors.inverted.textMuted}>
          / {children.length} {strings.staff.boarded.toLowerCase()}
        </T>
        <View style={{ flex: 1 }} />
        {remaining > 0 ? (
          <T variant="titleMd" color={colors.primary}>
            {remaining} {strings.staff.remaining}
          </T>
        ) : null}
      </Row>

      <Spacer h={spacing.base} />

      {entry.isLoading ? (
        <Loading />
      ) : (
        children.map((c, i) => {
          const on = boarded.includes(c.student_id);
          return (
            <MotiView
              key={c.student_id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: motion.duration.fast * 1000,
                delay: i * motion.stagger.list * 1000,
              }}
              style={{ marginBottom: spacing.xs }}
            >
              <View
                style={{
                  backgroundColor: on ? colors.inverted.canvasSoft : "transparent",
                  borderWidth: 1,
                  borderColor: on
                    ? colors.inverted.successOnInk
                    : colors.inverted.hairline,
                  borderRadius: radius.lg,
                  padding: spacing.base,
                }}
              >
                <Row>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.pill,
                      backgroundColor: colors.inverted.hairline,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <T variant="titleMd" color={colors.inverted.text}>
                      {c.student_name}
                    </T>
                    <T variant="caption" color={colors.inverted.textMuted}>
                      {c.class_name}
                    </T>
                  </View>
                  <Button
                    label={on ? `✓ ${strings.staff.boarded}` : strings.common.confirm}
                    variant={on ? "ghost" : "primary"}
                    onPress={() =>
                      setBoarded((prev) =>
                        prev.includes(c.student_id)
                          ? prev.filter((x) => x !== c.student_id)
                          : [...prev, c.student_id],
                      )
                    }
                  />
                </Row>
              </View>
            </MotiView>
          );
        })
      )}

      <Spacer h={spacing.lg} />
      <Button
        label={complete ? strings.staff.handoverComplete : `${remaining} ${strings.staff.remaining}`}
        variant={complete ? "primary" : "secondary"}
        large
        full
        disabled={!complete}
        onPress={() => router.replace("/guard/scanner")}
      />
      <Spacer h={spacing.xs} />
      <T variant="caption" color={colors.inverted.textMuted} align="center">
        The trip only completes when every child has been handed over.
      </T>
    </Screen>
  );
}
