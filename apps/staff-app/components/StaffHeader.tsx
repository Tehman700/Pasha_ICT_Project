import { useRouter } from "expo-router";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Row,
  Spacer,
  T,
  colors,
  signOut,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";

/**
 * Shared chrome for every staff screen.
 *
 * The name comes from `/users/me`, not from fixtures — this previously showed
 * a hardcoded fixture name, so a guard signed in as one person saw somebody
 * else's name above every screen they used.
 */
export function StaffHeader({
  role,
  back = false,
}: {
  role: "teacher" | "guard";
  back?: boolean;
}) {
  const router = useRouter();
  const api = useApi();
  const { strings, isRTL } = useLocale();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.me(), retry: false });

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <>
      <Row>
        {back ? (
          <T variant="bodySm" color={colors.body} onPress={() => router.back()}>
            {isRTL ? "→" : "←"} {strings.common.back}
          </T>
        ) : (
          <T variant="titleMd" color={colors.ink}>
            {strings.common.appName}
            <T variant="titleMd" color={colors.primary}>
              .
            </T>
          </T>
        )}
        <View style={{ flex: 1 }} />
        <Badge tone="neutral">{strings.role[role]}</Badge>
      </Row>
      <Spacer h={spacing.xs} />
      <Row>
        <T variant="caption" color={colors.mutedSoft}>
          {me.data?.name ?? ""}
        </T>
        <View style={{ flex: 1 }} />
        <T variant="caption" color={colors.error} onPress={handleSignOut}>
          {strings.parent.signOut}
        </T>
      </Row>
      <Spacer h={spacing.lg} />
    </>
  );
}
