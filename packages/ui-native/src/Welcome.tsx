import { Pressable, StatusBar, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Spacer, T } from "./components";
import { GateMark } from "./GateMark";
import { colors, spacing } from "./theme";
import { useLocale } from "./providers";

/**
 * The first screen of an install: a full-bleed orange hero, then three ways in.
 *
 * The orange ground is the one place the accent is allowed to cover a whole
 * screen. Everywhere else it stays scarce, because that scarcity is what makes
 * an orange control read as the thing to press. A wallpaper is not an action,
 * so it spends nothing.
 *
 * The tour used to live *inside* this screen as a carousel the user had to
 * swipe through. It is now behind its own button: someone reinstalling the app
 * reaches the phone field in one tap, and someone who wants the pitch can ask
 * for it.
 */
export function Welcome({
  headline,
  onSignIn,
  onRegister,
  onTour,
  registerLabel,
}: {
  /** One line. Each app passes its own - this is the promise, not a feature. */
  headline: string;
  onSignIn: () => void;
  onRegister?: () => void;
  onTour?: () => void;
  registerLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const { strings } = useLocale();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.primary,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + spacing.base,
        paddingHorizontal: spacing.lg,
      }}
    >
      {/*
        The app sets dark status-bar icons app-wide in _layout, which is right
        for the cream screens but leaves the clock nearly unreadable on orange.
        React Native's StatusBar keeps a stack of props, so this wins while the
        hero is mounted and pops back to dark the moment it unmounts - the next
        screen does not have to know about it.

        RN's StatusBar rather than expo-status-bar so this stays inside the
        shared package's existing peer dependencies.
      */}
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {/* Cream posts, ink barrier. Orange on orange would vanish. */}
        <GateMark size={96} post={colors.canvas} bar={colors.ink} />
        <Spacer h={spacing.lg} />
        <T variant="displaySm" color={colors.onPrimary} align="center">
          {headline}
        </T>
      </View>

      <View style={{ gap: spacing.sm }}>
        {onTour ? (
          <Button
            label={strings.walkthrough.takeTour}
            variant="secondary"
            large
            full
            onPress={onTour}
          />
        ) : null}

        <Button label={strings.auth.signIn} variant="ink" large full onPress={onSignIn} />

        {onRegister ? (
          <Pressable
            onPress={onRegister}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ alignItems: "center", paddingVertical: spacing.sm }}
          >
            <T variant="bodySm" color={colors.onPrimary}>
              {registerLabel ?? strings.register.createAccount}
            </T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
