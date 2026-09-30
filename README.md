# Pulse 🐾

**Your notifications, sorted by a pixel cat.** Pulse is an Android app that reads your notifications, works out what actually needs you, and shows it through a pixel cat on your home screen: asleep when nothing needs you, awake when something does.

Built for **RevenueCat Shipaton 2026**. Pulse AI (GPT-4o) is the premium feature, sold as **Pulse Pro** through RevenueCat.

---

## What it does

| | |
|---|---|
| **Capture** | Reads notifications from WhatsApp, Gmail, LinkedIn, Instagram, Messages, Amazon and Flipkart (other apps are opt-in), even while Pulse is closed. |
| **Privacy first** | Banking, UPI, authenticator and password apps are never read. OTPs and long numbers are masked (`••••`) before anything is saved. Everything is stored on the phone. |
| **Today** | "31 notifications → 3 need your attention", urgent/actionable cards, deliveries, and a collapsed drawer for the noise. |
| **Briefing** | "While you were away": everything since you last left the app, grouped into People, Work, Shopping and Noise. |
| **Home-screen widget** | Small (2×2) and wide (4×2) native widgets. The cat animates continuously; the wide widget lists who needs you. Tap a row to open that message. |
| **Pulse AI (Pro)** | GPT-4o sorts every notification by intent and urgency, answers questions about your notifications (**Ask Pulse**), and drafts replies you can send straight back into WhatsApp. |

## RevenueCat integration

Flow: **free user → Pulse paywall → Test Store purchase → `pro` entitlement active → Pulse AI unlocks.**

- **SDK:** `react-native-purchases` 10.10.2, configured in `src/entitlements/revenuecat.ts`.
- **Product catalog:** product `pro_monthly` ($5/month), entitlement **`pro`**, offering `default` with the `$rc_monthly` package. The demo uses the RevenueCat **Test Store**.
- **Paywall:** `src/app/paywall.tsx`. The price is read live from the current offering; *Continue* calls `Purchases.purchasePackage`; *Restore Purchases* calls `Purchases.restorePurchases`.
- **Entitlement gate:** every AI feature goes through `canUse('ai')` (`src/entitlements/index.ts`). The `pro` entitlement is cached from `CustomerInfo` so the background notification task can gate too.
- **Entry points:** the Pulse AI switch in **Apps**, sending a question in **Ask Pulse**, and **Unlock Pulse AI** on a notification's detail screen.

## Tech stack

Expo SDK 57 (development build) · React Native 0.86 (New Architecture) · TypeScript (strict) · expo-router · expo-sqlite · Luxon · RevenueCat · two local native modules in Kotlin:

- `modules/notification-listener`: a `NotificationListenerService` feeding a headless JS task, and inline replies via the notification's `RemoteInput`.
- `modules/pulse-widget`: the home-screen widgets. Pixel frames are drawn natively and animated with a `ViewFlipper`.

The AI goes through a **Cloudflare Worker** proxy (`proxy/`). The OpenAI key lives only there, never in the app.

## Project structure

```
src/app/            screens (expo-router): Today, Briefing, Ask Pulse, Apps, notification detail, paywall, onboarding
src/capture/        notification task, app map, hard-block list
src/ingest/         filtering and OTP redaction
src/ai/             proxy client, shared contract, classifier, unlock flow
src/entitlements/   RevenueCat + canUse() gate
src/cat/            sprite system (text-grid pixel art)
src/widget/         widget payload
src/db/             SQLite schema and queries
assets/sprites/     the cat, as text grids
modules/            native Kotlin modules (listener, widgets)
proxy/              Cloudflare Worker for GPT-4o
docs/               PRD, architecture, features, tasks, design references, spike notes
__tests__/          Jest unit tests
```

## Running it

### Prerequisites
- Node.js 20+ and npm
- An Android phone (the app is Android-only)
- An [Expo](https://expo.dev) account and the EAS CLI: `npm i -g eas-cli`
- A [RevenueCat](https://www.revenuecat.com) project
- For Pulse AI: a Cloudflare account and an OpenAI API key

### 1. Install
```bash
git clone https://github.com/Soham7126/Pulse.git
cd Pulse
npm install
```

### 2. RevenueCat
1. In the dashboard: **Apps and providers → Test configuration → create a Test Store**, and copy its API key.
2. **Product catalog:** create product `pro_monthly`, entitlement `pro` (with the product attached), and offering `default` (marked *Current*) with a `$rc_monthly` package.
3. Create `.env.local` in the project root (it's gitignored):
   ```
   EXPO_PUBLIC_REVENUECAT_API_KEY=test_xxxxxxxxxxxxxxxx
   ```

### 3. AI proxy (optional, needed for Pulse AI)
```bash
cd proxy
npm install
npx wrangler login
npx wrangler deploy                      # prints https://pulse-ai-proxy.<you>.workers.dev
npx wrangler secret put OPENAI_API_KEY   # paste your key as the value
cd ..
```
Then set `EXPO_PUBLIC_AI_PROXY_URL=https://pulse-ai-proxy.<you>.workers.dev` in `.env.local`. Your values there override the ones in `.env`.

### 4. Build and install the app
Pulse uses native code, so it needs a **development build**; it won't run in Expo Go.
```bash
eas login
eas init            # links the project to your Expo account (replaces extra.eas.projectId / owner in app.json)
eas build --profile development --platform android
```
Install the APK from the link EAS prints. From a PC, `adb install <file>.apk` also works.

> **India / Android 13+:** Play Protect may block installing the APK from a browser, and notification access can be greyed out for sideloaded apps. Install with `adb install`, then go to *App info → ⋮ → Allow restricted settings*.

### 5. Run
```bash
npx expo start --dev-client
```
Open Pulse on the phone, grant **notification access** when asked, and add the widget from **Apps → Add wide widget**.

### Tests
```bash
npm test            # Jest: filtering, redaction, time zones incl. a DST day, AI contract, sprites, widget payload, entitlements
npm run typecheck
```

## Demo flow (for judges)
1. **Apps:** Pulse AI shows a **PRO** badge (free user).
2. Turn on **Pulse AI**. The Pulse paywall opens with the live price.
3. **Continue**, then **Test valid purchase** in RevenueCat's Test Store sheet.
4. Apps shows **Pulse Pro · Active**. Notifications get urgency badges, **Ask Pulse** answers with sources, and a WhatsApp message's detail screen offers an AI draft with **Reply via WhatsApp**.
5. In development builds, **Reset to free (demo)** returns to a free user so the flow can be repeated.

## Privacy
- Only the app name, sender, masked text (up to 300 characters) and timestamp are sent to the AI, and only while Pulse AI is on and Pro is active.
- OpenAI is called with `store: false`. The proxy logs nothing.
- Notification text is never written to logs.

## Known limitations
- Android only.
- In **development builds**, if a notification arrives before Pulse is opened, Expo's dev launcher can refuse to start ("App react context shouldn't be created before"). Force-stop and reopen. Preview/production builds don't include the dev launcher.
- RevenueCat **Test Store keys are for development only** (the SDK crashes with one in production). Use the Google Play key for a release build.
- Server-side entitlement checks in the proxy (RevenueCat webhook) are not built yet.

## License
[MIT](LICENSE). Bundled fonts (Plus Jakarta Sans, JetBrains Mono) are licensed under the SIL Open Font License 1.1; see [`licenses/`](licenses/). The pixel cat is original artwork made for this project.
