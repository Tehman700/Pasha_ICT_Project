import { useRouter } from "expo-router";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  ChildChip,
  Divider,
  Label,
  PageTitle,
  Row,
  Screen,
  Spacer,
  T,
  colors,
  spacing,
  useApi,
  resetWalkthrough,
  signOut,
  useLocale,
} from "@pickup/ui-native";
import { fixtures } from "@pickup/shared";
import { ScreenHeader } from "../../components/ScreenHeader";

export default function ProfileScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings, locale, toggle } = useLocale();

  const children = useQuery({ queryKey: ["myChildren"], queryFn: () => api.getMyChildren() });
  const me = fixtures.currentParent;

  return (
    <Screen>
      <ScreenHeader title={strings.parent.profile} />
      <PageTitle title={me.name} subtitle={fixtures.school.name} />

      <Card>
        <Row>
          <T variant="bodySm" color={colors.muted}>
            {strings.auth.phone}
          </T>
          <View style={{ flex: 1 }} />
          <T variant="bodySm" color={colors.ink}>
            {me.phone}
          </T>
        </Row>
        <Spacer h={spacing.sm} />
        <Row>
          <T variant="bodySm" color={colors.muted}>
            {strings.parent.language}
          </T>
          <View style={{ flex: 1 }} />
          <Button
            label={locale === "en" ? "اردو" : "English"}
            onPress={toggle}
          />
        </Row>
      </Card>

      <Divider />

      <Label>{strings.parent.myChildren}</Label>
      <Spacer h={spacing.sm} />
      <Row gap={6} style={{ flexWrap: "wrap" }}>
        {children.data?.map((c) => (
          <ChildChip key={c.id} name={c.name} sub={c.class_name} />
        ))}
      </Row>

      <Divider />

      <Label>Privacy</Label>
      <Spacer h={6} />
      <T variant="caption" color={colors.muted}>
        Your location is shared only while a trip is active and the app is open.
        It is never tracked in the background. Raw location history is deleted
        after 24 hours.
      </T>

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
          router.replace("/login");
        }}
      />
    </Screen>
  );
}
