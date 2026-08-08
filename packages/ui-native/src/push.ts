/**
 * Push notification registration, shared by both apps.
 *
 * Three things this has to get right, none of them obvious:
 *
 * **Permission is asked for, not assumed.** Android 13+ requires
 * POST_NOTIFICATIONS at runtime, and a parent who declines must keep a fully
 * working app — every screen already shows live state over WebSocket, so push
 * is an enhancement, never a dependency. `register()` returns a status the UI
 * can explain rather than throwing.
 *
 * **A denied permission has to be reported to the backend.** Silently leaving
 * a stale `fcm_token` on the account means the server keeps sending to a phone
 * that will never display them. On denial we clear it.
 *
 * **The device FCM token, not the Expo push token.** The backend talks to FCM
 * v1 directly with a service account, so it needs the raw registration token
 * from `getDevicePushTokenAsync()`. `getExpoPushTokenAsync()` returns an
 * `ExponentPushToken[...]` that only Expo's relay understands — sending that
 * to FCM fails as an invalid token, and the failure looks identical to a
 * revoked permission.
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type { PickupApi } from "@pickup/shared";

export type PushStatus =
  | "registered"
  | "denied"
  | "unsupported" // simulator, or a build with no Firebase config
  | "error";

/** Matches the `channel_id` the backend sets on every message it sends. */
export const CHANNEL_ID = "rukhsat-pickup";

/**
 * A notification arriving while the app is open should still be visible.
 *
 * The default is to stay silent in the foreground, which is wrong here: a
 * parent watching the queue screen is exactly the person who needs to see
 * "handed over" the moment it happens.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  // Without an explicit channel, Android 8+ files everything under a default
  // channel the user cannot tune — so a parent who wants pickup alerts loud
  // and nothing else has no way to say so.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Pickup alerts",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#f54e00",
  });
}

export async function register(api: PickupApi): Promise<PushStatus> {
  if (!Device.isDevice) return "unsupported";

  try {
    await ensureChannel();

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;

    // Only prompt when the OS says we still can. Re-asking after a hard denial
    // resolves instantly to "denied" and just burns a launch.
    if (!granted && existing.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }

    if (!granted) {
      // Clear any token from a previous install or a permission since revoked.
      await api.updateMe({ fcm_token: null }).catch(() => {});
      return "denied";
    }

    const token = await Notifications.getDevicePushTokenAsync();
    if (typeof token.data !== "string" || !token.data) return "unsupported";

    await api.updateMe({ fcm_token: token.data });
    return "registered";
  } catch {
    // A missing google-services.json throws here. That is a build problem,
    // not something the person holding the phone can act on — fail quiet.
    return "error";
  }
}

/**
 * Keep the backend's copy of the device token current.
 *
 * Mounted at the app root, and deliberately NOT responsible for the first
 * registration — that happens in the login handler, because prompting for
 * notification permission on the login screen asks a stranger for access
 * before they know what the app does, and Android only lets you ask once.
 *
 * Rotation is not rare: it happens on app restore, on clear-data, and
 * periodically at Google's discretion. An app that registers only at first
 * launch goes silently undeliverable weeks later, which is the hardest class
 * of push bug to notice.
 */
export function usePushTokenRotation(api: PickupApi): void {
  const seen = useRef<string | null>(null);

  useEffect(() => {
    const sub = Notifications.addPushTokenListener((token) => {
      if (typeof token.data !== "string" || !token.data) return;
      if (seen.current === token.data) return;
      seen.current = token.data;
      // Fails with 401 if nobody is signed in yet; login registers explicitly.
      void api.updateMe({ fcm_token: token.data }).catch(() => {});
    });
    return () => sub.remove();
  }, [api]);
}
