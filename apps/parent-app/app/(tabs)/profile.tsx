import { useRouter } from "expo-router";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  ChildChip,
  DashboardHeader,
  ListRow,
  Row,
  Screen,
  Section,
  Spacer,
  T,
  colors,
  resetWalkthrough,
  signOut,
  spacing,
  useApi,
  useLocale,
  useMe,
  useMySchoolName,
} from "@pickup/ui-native";

export default function ProfileScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();

  const children = useQuery({ queryKey: ["myChildren"], queryFn: () => api.getMyChildren() });
  const me = useMe();
  const schoolName = useMySchoolName();

  return (
    <Screen>
      <DashboardHeader name={me.data?.name ?? ""} sub={schoolName} />
      <Spacer h={spacing.lg} />

      <Section title={strings.parent.profile}>
        <ListRow icon="user" title={strings.auth.phone} subtitle={me.data?.phone ?? ""} last />
      </Section>

      <Spacer h={spacing.lg} />

      <Section title={strings.parent.myChildren}>
        <View style={{ padding: spacing.base }}>
          <Row gap={6} style={{ flexWrap: "wrap" }}>
            {children.data?.map((c) => (
              <ChildChip key={c.id} name={c.name} sub={c.class_name} />
            ))}
          </Row>
        </View>
      </Section>

      <Spacer h={spacing.lg} />

      <Section title={strings.parent.privacyTitle}>
        <View style={{ padding: spacing.base }}>
          <T variant="caption" color={colors.muted}>
            {strings.parent.privacyBody}
          </T>
        </View>
      </Section>

      <Spacer h={spacing.lg} />
      <Button
        label={strings.walkthrough.replay}
        icon="shield"
        full
        onPress={async () => {
          await resetWalkthrough("parent");
          router.replace("/");
        }}
      />
      <Spacer h={spacing.xs} />
      <Button
        label={strings.parent.signOut}
        variant="danger"
        full
        onPress={async () => {
          // Clear the credential BEFORE navigating. Navigating alone left the
          // token in the keychain, so the next launch signed straight back in.
          await signOut();
          router.replace("/welcome");
        }}
      />
      <Spacer h={spacing.xl} />
    </Screen>
  );
}
