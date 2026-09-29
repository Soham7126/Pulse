# M0 spike notes

Status: **code ready, awaiting first EAS build + on-device test.** Go/no-go is filled in after the phone test.

## Versions (installed)

| Package | Version | Notes |
|---|---|---|
| Expo SDK | 57 (`expo ~57.0.26`) | Latest stable as of 2026-09-29; SDK 58 is beta |
| React Native | 0.86.3 | New Architecture only (Legacy removed from SDK 55) |
| React | 19.2.3 | |
| react-native-android-widget | 0.22.1 (2026-08-17) | Expo config plugin included |
| Notification listener | local Expo module `modules/notification-listener` | See below |

## Deviations from the docs

- **Routes live in `src/app/`**, not root `app/`. That is the SDK 57 template default. Non-route code sits beside it in `src/`.
- **`app.json` instead of `app.config.ts`.** Nothing is dynamic yet, and with a static file `eas init` can write `extra.eas.projectId` itself. Switch to TS when something needs to be computed.
- Removed template web/iOS deps (`react-native-web`, `expo-symbols`, `expo-glass-effect`, `@expo/ui`, …). Kept `react-dom`, `react-native-reanimated` and `react-native-worklets` pinned: expo-router pulls them in as optional peers, and unpinned npm resolves incompatible versions (ERESOLVE on react-dom 19.3).

## Notification listener

- `react-native-android-notification-listener` 5.0.1 was rejected. Last release was Dec 2022, it has a `react ^18` peer (we're on 19.2), it's a legacy bridge module, and its payload has no notification `key` or flags.
- `expo-android-notification-listener-service` 1.1.0 was rejected. It's a JS event listener only, with no documented delivery while the app is closed.
- **Chosen: local Expo module**, created with `create-expo-module --local` (Android only):
  - `PulseNotificationListenerService` (NotificationListenerService) → `startService(PulseHeadlessTaskService)` + `HeadlessJsTaskService.acquireWakeLockNow`.
  - `PulseHeadlessTaskService` (RN `HeadlessJsTaskService`) runs JS task `PulseNotification` with `{packageName, key, postTime, flags, category, title, text}`, timeout 10s, allowed in foreground.
  - Under New Arch, `HeadlessJsTaskService` uses `(application as ReactApplication).reactHost` and starts it if needed (checked in the RN 0.86 source).
  - `isPermissionGranted()` reads `Settings.Secure enabled_notification_listeners` (the same thing NotificationManagerCompat does). `openPermissionSettings()` opens `ACTION_NOTIFICATION_LISTENER_SETTINGS`.
  - The manifest (listener service, headless service, WAKE_LOCK) lives in the module and is auto-merged.
- Quirk: an Expo Modules `Function { }` lambda must return `Any?`. A bare `return@Function` (Unit) fails Kotlin compile, so use a safe call (`x?.foo()`) instead. Build 1 failed on this.
- Not yet handled (M1): `onNotificationRemoved`, ongoing/media filtering (flags are already passed), hard-block before the JS hop.

### To verify on device
- [ ] `startService` from the listener callback isn't blocked by background-start limits while the app is swiped away. If `PulseListener` logs "headless start blocked", the fallback is to buffer natively and drain on the next JS wake.
- [ ] Headless task runs with the app closed (widget counter bumps).
- [ ] The Android 13+ "restricted settings" flow for sideloaded APKs.

## Widget (react-native-android-widget 0.22.1)

- Config plugin options (from installed `config-plugin.type.d.ts`): `widgets[{ name, label, description, minWidth:'Ndp', minHeight:'Ndp', targetCellWidth, targetCellHeight, maxResizeWidth, maxResizeHeight, previewImage, resizeMode, widgetFeatures, updatePeriodMillis (min 1_800_000), packageName }]`, plus `fonts`.
- Primitives: FlexWidget, OverlapWidget, ListWidget, ImageWidget, TextWidget, IconWidget, SvgWidget.
- **SvgWidget** takes a raw SVG string (`svg` prop). The native side uses AndroidSVG 1.4 → `PictureDrawable`. AndroidSVG supports `shape-rendering="crispEdges"`, which fits the sprite plan (arch §8). The spike widget draws a test wall/floor/block to confirm it's crisp.
- `requestWidgetUpdate({ widgetName, renderWidget })` is called from the headless notification task.
- `renderWidget` accepts `{ light, dark }` for dark mode (0.19+).
- `requestPinWidget` (0.22) can show the launcher's add-widget prompt. Possible onboarding nicety later.
- Last explicit RN compatibility note is 0.83. RN 0.86 is unverified until the build succeeds.

## OEM / device

- Phone model / Android version: _TBD (from user)_.
- Battery setting used: _TBD_.

## Decision gate

- Listener: _pending device test_
- Widget: _pending device test_
