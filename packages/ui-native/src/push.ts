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
import type { PickupApi } from "@pickup/shared";

export type PushStatus =
  | "registered"
  | "denied"
  | "unsupported" // simulator, Expo Go, or a build with no Firebase config
  | "error";

/** Matches the `channel_id` the backend sets on every message it sends. */
export const CHANNEL_ID = "rukhsat-pickup";

/**
 * `expo-notifications` is loaded lazily, and this is not a style preference.
 *
 * Expo Go dropped Android remote-notification support in SDK 53, and the
 * module throws the moment it is imported. Because `ui-native/index.ts`
 * re-exports this file, a top-level import ran that throw during the first
 * import of the app's root layout — before any UI existed, so the whole app
 * showed a red error screen instead of a login form. Every screen died over a
 * feature only two of them use.
 *
 * Deferring the require to the point of use keeps the app fully working in
 * Expo Go: everything renders, and only push degrades to "unsupported". In a
 * development build or a store APK the module resolves normally and push
 * behaves exactly as before.
 */
function notifications(): typeof import("expo-notifications") | null {
  // Expo Go is checked BEFORE the require, not inside a try/catch around it.
  //
  // `expo-notifications` throws from its own module initialiser under Expo Go
  // (Android remote notifications were removed in SDK 53), and Metro surfaces
  // that as an uncaught error rather than letting a surrounding catch handle
  // it — so the app died on a red screen despite the try block. The only
  // reliable fix is never to evaluate the module here at all.
  //
  // `appOwnership === "expo"` is set only by the Expo Go client; a development
  // build or a store APK leaves it null. Read through a require of
  // `expo-constants` inside the guard so a missing module cannot break the
  // app either — the fallback is simply to attempt the notifications require.
  try {
    const C = require("expo-constants");
    const constants = C?.default ?? C;
    if (constants?.appOwnership === "expo") return null;
    if (constants?.executionEnvironment === "storeClient") return null;
  } catch {
    // No expo-constants: fall through and let the guarded require decide.
  }

  try {
    const N = require("expo-notifications");
    if (!N || typeof N.getPermissionsAsync !== "function") return null;
    return N;
  } catch {
    return null;
  }
}

let handlerSet = false;

/**
 * A notification arriving while the app is open should still be visible.
 *
 * The default is to stay silent in the foreground, which is wrong here: a
 * parent watching the queue screen is exactly the person who needs to see
 * "handed over" the moment it happens.
 *
 * Called on first use rather than at module scope, for the reason above.
 */
function ensureHandler(): void {
  if (handlerSet) return;
  const N = notifications();
  if (!N) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerSet = true;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  const N = notifications();
  if (!N) return;
  // Without an explicit channel, Android 8+ files everything under a default
  // channel the user cannot tune — so a parent who wants pickup alerts loud
  // and nothing else has no way to say so.
  await N.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Pickup alerts",
    importance: N.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#f54e00",
  });
}

export async function register(api: PickupApi): Promise<PushStatus> {
  if (!Device.isDevice) return "unsupported";

  // Expo Go: the module is unavailable, so push simply does not exist here.
  // Reported rather than thrown — the caller shows a status, not a crash.
  const N = notifications();
  if (!N) return "unsupported";

  try {
    ensureHandler();
    await ensureChannel();

    const existing = await N.getPermissionsAsync();
    let granted = existing.granted;

    // Only prompt when the OS says we still can. Re-asking after a hard denial
    // resolves instantly to "denied" and just burns a launch.
    if (!granted && existing.canAskAgain) {
      granted = (await N.requestPermissionsAsync()).granted;
    }

    if (!granted) {
      // Clear any token from a previous install or a permission since revoked.
      await api.updateMe({ fcm_token: null }).catch(() => {});
      return "denied";
    }

    const token = await N.getDevicePushTokenAsync();
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
    // Mounted at the app root, so this hook runs on every launch — including
    // in Expo Go, where the module does not exist. A no-op there keeps the
    // root layout mounting rather than taking the whole app down.
    const N = notifications();
    if (!N) return;

    const sub = N.addPushTokenListener((token) => {
      if (typeof token.data !== "string" || !token.data) return;
      if (seen.current === token.data) return;
      seen.current = token.data;
      // Fails with 401 if nobody is signed in yet; login registers explicitly.
      void api.updateMe({ fcm_token: token.data }).catch(() => {});
    });
    return () => sub.remove();
  }, [api]);
}
