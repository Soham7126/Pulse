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
- Quirk: Expo native functions check how many arguments they get when called. Passing one directly as a handler (`onPress={Mod.fn}`) forwards the press event and throws "Received 1 arguments, but 0 was expected". TypeScript doesn't catch it, so always wrap: `onPress={() => Mod.fn()}`.
- Not yet handled (M1): `onNotificationRemoved`, ongoing/media filtering (flags are already passed), hard-block before the JS hop.

### Device result (Realme, Android 14, 2026-09-29)
- Real notifications reach the JS headless task: `count=1 pkg=com.whatsapp`, `count=2 pkg=com.whatsapp`, `count=3 pkg=com.antivirus`. Logs held only counts and packages.
- The listener process stays bound by the system (`PulseNotificationListenerService` connection flagged FGS), and `startService` from the callback was **not** blocked.
- **WhatsApp posts 2 notifications for 1 message** (10 ms apart: the message plus a group summary). M1/M2 dedupe must skip summary notifications (`FLAG_GROUP_SUMMARY` in `flags`).

### To verify on device
- [ ] `startService` from the listener callback isn't blocked by background-start limits while the app is swiped away. If `PulseListener` logs "headless start blocked", the fallback is to buffer natively and drain on the next JS wake.
- [ ] Headless task runs with the app closed (widget counter bumps).
- [ ] The Android 13+ "restricted settings" flow for sideloaded APKs.

## Widget (react-native-android-widget 0.22.1)

- Config plugin options (from installed `config-plugin.type.d.ts`): `widgets[{ name, label, description, minWidth:'Ndp', minHeight:'Ndp', targetCellWidth, targetCellHeight, maxResizeWidth, maxResizeHeight, previewImage, resizeMode, widgetFeatures, updatePeriodMillis (min 1_800_000), packageName }]`, plus `fonts`.
- Primitives: FlexWidget, OverlapWidget, ListWidget, ImageWidget, TextWidget, IconWidget, SvgWidget.
- **SvgWidget** takes a raw SVG string (`svg` prop). The native side uses AndroidSVG 1.4 → `PictureDrawable`. AndroidSVG supports `shape-rendering="crispEdges"`, which fits the sprite plan (arch §8). The spike widget draws a test wall/floor/block to confirm it's crisp.
- **Quirk: React Compiler breaks widgets.** SDK 57 enables `experiments.reactCompiler`, which turns widget components into hook-using code. The renderer then throws "Invalid Hook Call detected in HelloWidget". Every widget component file must start with the `'use no memo';` directive. It works per file, so the compiler stays on for the app.
- `requestWidgetUpdate({ widgetName, renderWidget })` is called from the headless notification task.
- `renderWidget` accepts `{ light, dark }` for dark mode (0.19+).
- `requestPinWidget` (0.22) can show the launcher's add-widget prompt. Possible onboarding nicety later.
- Last explicit RN compatibility note is 0.83. RN 0.86 is unverified until the build succeeds.

## OEM / device

- Phone: **Realme Narzo 50 Pro 5G, Android 14 (Realme UI)**. It replaced the Micromax IN Note 1.
  - `adb install -r` (streamed) **succeeded with no Play Protect block**. Dev client connects via `adb reverse tcp:8081 tcp:8081` + `exp+pulse://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`. Logs show `fabric: true` (New Arch).
  - Even after the ADB install, `ACCESS_RESTRICTED_SETTINGS` was `deny` (installer `pc`), so restricted settings still apply.
  - Android 13+ **restricted settings** greys out notification access for sideloaded apps. Fix: App info → ⋮ → "Allow restricted settings".
  - Realme/ColorOS battery management is aggressive and can kill the listener. Needed: App info → Battery → allow background activity + **Auto launch** on, and lock Pulse in recents. This belongs in the E7 keep-alive guide.
- Build 2 (`68b64c12`) succeeded. The dev APK is ~240 MB (all ABIs).
- **Install blocker:** installing from the browser is blocked by Play Protect *enhanced fraud protection* (India pilot): "This app can request access to sensitive data…". It targets internet-sideloaded APKs that request sensitive permissions, and `BIND_NOTIFICATION_LISTENER_SERVICE` is one of them. It can't be overridden from the dialog. Workaround: `adb install` over USB (not an internet sideload source). Alternative: turn Play Protect scanning off temporarily and back on afterwards. **Demo impact:** anyone installing the M9 release APK from a link will hit the same block. Plan on ADB or a Play Console internal-testing track.
- Battery setting used: _TBD_.

## Decision gate

- Listener: **GO**. The local Expo module delivers real notifications to the headless JS task on Android 14 (Realme).
- Widget: **GO**. react-native-android-widget 0.22.1 renders and updates from the headless task (after the `'use no memo'` fix).

## AI layer (pulled forward from M8, 2026-09-30)

Decisions (user):
- **Provider: OpenAI GPT-4o** (PRD open question 4). Called through the **Responses API** with strict JSON-schema output and `store: false`.
- **Proxy: Cloudflare Worker** in `proxy/` (`wrangler.jsonc`). The key lives only in the Worker (`npx wrangler secret put OPENAI_API_KEY`), never in the app. The app reads the Worker URL from `EXPO_PUBLIC_AI_PROXY_URL` in `.env` (public, not a secret).
- **Classifier: GPT-4o for every allowed notification** (overrides the PRD's "rules first" default). While AI is off, offline or failing, rows keep the source-app fallback (`bucketFor`) and are retried later (`classifyPending` runs after each capture and whenever the app opens).
- **AI toggle** (Ask Pulse tab) is **off by default** (PRD §9 opt-in). Nothing leaves the phone until it's on.

Contract: `src/ai/contract.ts` is shared by the app and the Worker. It validates requests (Worker side) and responses (app side). Only `{id, app, sender, redacted text ≤300 chars, local time}` is sent. Never the notification key or package name (see `__tests__/ai-payload.test.ts`).

Proxy abuse limits: per-install and per-IP, 120 requests / 10 min per isolate (in-memory; move to KV if abused), 64 KB body cap, no logging of bodies. Also set a monthly spend limit on the OpenAI project. Phase 2's RevenueCat webhook is the real gate.

Reply: `NotificationListener.reply(key, text)` fires the source notification's inline-reply `RemoteInput` action (like replying from the shade). It only works while that notification is still showing; otherwise the UI offers "Share draft".

## Widget rewrite: native, continuously animated (2026-09-30)

- **Problem with react-native-android-widget:** it renders the whole widget as one bitmap sized by the launcher's portrait `OPTION_APPWIDGET_MAX_HEIGHT`, and shows it with `scaleType="matrix"` (no scaling). The Realme launcher reports 175 dp while the real slot is 146 dp (measured: bitmap 756×525 px at 480 dpi vs 756×438 px on screen), so the bottom was cropped. It also can't animate.
- **Now:** a local module `modules/pulse-widget` with two AppWidgetProviders and XML layouts (real TextViews, bundled Plus Jakarta Sans / JetBrains Mono in `res/font`). The cat room is drawn per frame by `SceneRenderer` with nearest-neighbour pixels and played by a `ViewFlipper` (5 fps awake, 2 fps asleep). Row count follows `OPTION_APPWIDGET_MIN_HEIGHT` (≥170 dp: 3, ≥135 dp: 2, otherwise 1); the providers log min/max heights to calibrate.
- Taps: a row deep-links to `pulse://notification/<id>`; everything else opens the app.
- **User-visible:** the old widgets (PulseSmall/PulseMedium from the library) disappear with this build; add the new ones again.

## RevenueCat (Phase 2, 2026-09-30)

- SDK: react-native-purchases / -ui 10.10.2 (Test Store needs ≥ 9.5.4). No config plugin; needs a dev build.
- Dashboard (user): Test Store, product `pro_monthly` ($5/mo), entitlement `pro`, `default` offering with a monthly package, RevenueCat Paywall attached.
- Key: public SDK key in `.env.local` (gitignored) as `EXPO_PUBLIC_REVENUECAT_API_KEY`. **Test Store keys (`test_…`) are dev-only: the SDK crashes in production with one.** Swap in the Google Play public key (and connect Play Console) before any release build.
- The headless task can't call the SDK, so `pro` is cached in SQLite (`pro_active`) by the app's CustomerInfo listener and read via `canUse()`.
- Not done yet: server-side enforcement (H7, RevenueCat webhook → proxy). The proxy currently trusts the app.
