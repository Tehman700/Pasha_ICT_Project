import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Input,
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
 * Manual fallback — search.
 *
 * Mandatory, never optional. Dead phone, cracked camera, no signal, a
 * grandmother who has never used an app: software must never be the reason a
 * real handover cannot happen.
 *
 * Every manual handover is logged with the guard's identity and surfaces
 * flagged on the admin dashboard. That is a designed-in strength to present,
 * not a weakness to hide.
 */
export default function ManualSearchScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const [q, setQ] = useState("");

  const results = useQuery({
    queryKey: ["searchStudents", q],
    queryFn: () => api.searchStudents(q),
  });

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
        <Badge tone="error">{strings.staff.manualTitle}</Badge>
      </Row>

      <Spacer h={spacing.lg} />

      <T variant="displaySm" color={colors.inverted.text}>
        {strings.staff.searchChild}
      </T>
      <Spacer h={spacing.sm} />
      <T variant="caption" color={colors.inverted.textMuted}>
        {strings.staff.manualNote}
      </T>

      <Spacer h={spacing.base} />

      <Input
        value={q}
        onChangeText={setQ}
        placeholder="Ali, Sara, Hamza…"
        autoFocus
        style={{
          backgroundColor: colors.inverted.canvasSoft,
          borderColor: colors.inverted.hairline,
          color: colors.inverted.text,
          height: 56,
        }}
      />

      <Spacer h={spacing.base} />

      {q.trim() === "" ? (
        <T variant="caption" color={colors.inverted.textMuted}>
          Start typing a child&apos;s name.
        </T>
      ) : (
        results.data?.map((s, i) => (
          <MotiView
            key={s.id}
            from={{ opacity: 0, translateY: 8 }}
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
                borderWidth: 1,
                borderColor: colors.inverted.hairline,
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
                    {s.name}
                  </T>
                  <T variant="caption" color={colors.inverted.textMuted}>
                    {s.class_name}
                  </T>
                </View>
                <Button
                  label={strings.common.confirm}
                  variant="primary"
                  onPress={() => router.push(`/guard/manual-confirm?studentId=${s.id}`)}
                />
              </Row>
            </View>
          </MotiView>
        ))
      )}
    </Screen>
  );
}
