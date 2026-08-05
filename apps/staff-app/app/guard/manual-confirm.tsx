import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
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
  radius,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import type { FallbackReason } from "@pickup/shared";

/**
 * Manual fallback — confirm.
 *
 * The guard picks who is physically present from the child's AUTHORIZED
 * collectors only. Manual does not mean unchecked: authorization is still
 * enforced, a reason is required, and the record carries the guard's identity,
 * the device, and the timestamp.
 */
export default function ManualConfirmScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();

  const [collector, setCollector] = useState<string | null>(null);
  const [reason, setReason] = useState<FallbackReason | null>(null);

  const students = useQuery({ queryKey: ["students"], queryFn: () => api.listStudents() });
  const auths = useQuery({
    queryKey: ["authorizations", studentId],
    queryFn: () => api.listAuthorizations({ studentId }),
  });

  const child = students.data?.find((s) => s.id === studentId);
  const allowed = auths.data?.filter((a) => !a.revoked_at) ?? [];

  const reasons: [FallbackReason, string][] = [
    ["phone_dead", strings.staff.reasonPhoneDead],
    ["no_app", strings.staff.reasonNoApp],
    ["scan_failed", strings.staff.reasonScanFailed],
    ["other", strings.staff.reasonOther],
  ];

  const canConfirm = !!collector && !!reason;

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

      {students.isLoading ? (
        <Loading />
      ) : (
        <>
          <T variant="displaySm" color={colors.inverted.text}>
            {child?.name}
          </T>
          <T variant="bodySm" color={colors.inverted.textMuted}>
            {child?.class_name}
          </T>

          <Spacer h={spacing.lg} />
          <T variant="captionUppercase" color={colors.inverted.textMuted}>
            {strings.staff.whoIsCollecting}
          </T>
          <Spacer h={spacing.sm} />

          {allowed.length === 0 ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.inverted.errorOnInk,
                borderRadius: radius.lg,
                padding: spacing.base,
              }}
            >
              <T variant="bodySm" color={colors.inverted.errorOnInk}>
                {strings.staff.notAuthorized}. Call the office — do not hand over.
              </T>
            </View>
          ) : (
            allowed.map((a) => {
              const on = collector === a.collector_user_id;
              return (
                <View key={a.id} style={{ marginBottom: spacing.xs }}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: on ? colors.primary : colors.inverted.hairline,
                      backgroundColor: on ? colors.inverted.canvasSoft : "transparent",
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
                        <T variant="titleSm" color={colors.inverted.text}>
                          {a.collector_name}
                        </T>
                        <T variant="caption" color={colors.inverted.textMuted}>
                          {a.collector_role === "driver"
                            ? strings.role.driver
                            : `Authorized by ${a.granted_by_name}`}
                        </T>
                      </View>
                      <Button
                        label={on ? "✓" : strings.common.confirm}
                        variant={on ? "primary" : "secondary"}
                        onPress={() => setCollector(on ? null : a.collector_user_id)}
                      />
                    </Row>
                  </View>
                </View>
              );
            })
          )}

          <Spacer h={spacing.lg} />
          <T variant="captionUppercase" color={colors.inverted.textMuted}>
            {strings.staff.reason}
          </T>
          <Spacer h={spacing.sm} />
          <Row gap={spacing.xs} style={{ flexWrap: "wrap" }}>
            {reasons.map(([key, label]) => (
              <Button
                key={key}
                label={label}
                variant={reason === key ? "primary" : "secondary"}
                onPress={() => setReason(key)}
              />
            ))}
          </Row>

          <Spacer h={spacing.lg} />
          <Button
            label={strings.staff.confirmHandover}
            variant="primary"
            large
            full
            disabled={!canConfirm}
            onPress={() => router.replace("/guard/scanner")}
          />
          <Spacer h={spacing.sm} />
          <T variant="caption" color={colors.inverted.textMuted} align="center">
            Recorded as a manual handover with your name and this device, and
            flagged for the school to review.
          </T>
        </>
      )}
    </Screen>
  );
}
