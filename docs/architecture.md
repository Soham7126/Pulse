# Pulse — Architecture

**Stack:** React Native + Expo (development build, EAS cloud builds), TypeScript, Android only.
**Rule:** no Android Studio required. All native builds happen on EAS Build; testing on a physical Android phone.

> Library names below are the intended choices. Their APIs and Expo compatibility **must be verified against current docs in milestone M0** before building on them.

---

## 1. System overview

```
 Other apps ──notifications──▶ Android system
                                     │
                     NotificationListenerService (native)
                                     │
                          Headless JS task (RN)
                                     │
        ┌────────────────────────────▼─────────────────────────────┐
        │                     INGEST PIPELINE                       │
        │  filter → redact → dedupe → classify → time-resolve → DB  │
        └────────────────────────────┬─────────────────────────────┘
                                     │
                       expo-sqlite (local only)
                                     │
                 ┌───────────────────┼────────────────────┐
                 ▼                   ▼                    ▼
          Cat state engine     App UI (RN)          Scheduler
        (pure function)     Today / Away / Ask    briefing, recap,
                 │                                 expiry, tz-watch
                 ▼
         Widget renderer ──▶ Home-screen widget (small / medium)

  Optional (last P1 milestone):  App ──redacted text──▶ LLM proxy ──▶ LLM
  Phase 2:  App ──▶ RevenueCat SDK;  RevenueCat webhook ──▶ LLM proxy
```

## 2. Layers and responsibilities

| Layer | Responsibility | Depends on |
|-------|----------------|-----------|
| `capture` | Receive raw notifications, permission state | Native listener lib |
| `ingest` | Filter, redact, dedupe, classify, resolve times, persist | `classify`, `time`, `db` |
| `classify` | Rules engine (+ optional LLM fallback) | pure TS |
| `time` | UTC/tz math, phrase resolution, schedules | Luxon |
| `db` | Schema, migrations, queries | expo-sqlite |
| `cat` | State engine, sprite data, renderer | pure TS + react-native-svg |
| `widget` | Widget layouts, task handler, refresh | widget lib |
| `ui` | Screens and components | expo-router, zustand |
| `ai` (last) | Proxy client, prompts, response validation | `db`, `time` |
| `entitlements` | `isPro()` seam (stub in P1, RevenueCat in P2) | none in P1 |

Dependencies point downward only. `classify`, `time` and `cat` are **pure and framework-free** so they can be unit-tested without a device.

## 3. Suggested libraries (verify in M0)

| Need | Choice | Notes |
|------|--------|-------|
| Framework | Expo SDK (latest stable) + expo-dev-client | Not Expo Go |
| Build | EAS Build, profile `development` | Cloud, no local SDK |
| Notification listener | `react-native-android-notification-listener` | Headless task + permission helpers; check Expo plugin needs |
| Widget | `react-native-android-widget` | JS-defined widgets, Expo config plugin; check supported primitives (SVG widget, text, flex) |
| Storage | `expo-sqlite` | Local DB |
| Date/time | `luxon` | IANA zones, DST-safe; confirm Hermes `Intl` timezone support on device |
| Locale/timezone | `expo-localization` | Device tz and change detection |
| Local notifications | `expo-notifications` | Briefing/recap |
| Background | `expo-task-manager`/headless JS | Scheduled widget refresh |
| Sprites in-app | `react-native-svg` | Same sprite source as the widget |
| Calendar | `expo-calendar` | Smart action |
| State | `zustand` | Small |
| Tests | `jest` (+ `ts-jest`/`jest-expo`) | Pure modules first |

## 4. Data model (SQLite)

```sql
notifications (
  id                INTEGER PRIMARY KEY,
  key               TEXT,            -- Android notification key/id for updates
  package_name      TEXT NOT NULL,
  app_label         TEXT,
  title             TEXT,            -- redacted
  body              TEXT,            -- redacted
  posted_at_utc     INTEGER NOT NULL,-- epoch ms (UTC)
  tz_at_receipt     TEXT NOT NULL,   -- IANA, e.g. 'Asia/Kolkata'
  intent            TEXT NOT NULL,   -- communication|event|delivery|finance|security|shopping|work|noise
  priority          TEXT NOT NULL,   -- high|medium|low|noise
  action_required   INTEGER NOT NULL DEFAULT 0,
  action_text       TEXT,
  deadline_utc      INTEGER,         -- epoch ms, nullable
  deadline_raw      TEXT,            -- original phrase, e.g. 'tonight'
  event_start_utc   INTEGER,         -- for event intent
  sender            TEXT,
  group_key         TEXT,            -- collapse key, e.g. 'instagram:interactions'
  status            TEXT NOT NULL DEFAULT 'active', -- active|handled|archived|expired
  expires_at_utc    INTEGER,
  classifier        TEXT NOT NULL,   -- rules|llm
  confidence        REAL,
  dedupe_hash       TEXT
);
CREATE INDEX idx_notif_time    ON notifications(posted_at_utc);
CREATE INDEX idx_notif_status  ON notifications(status, priority);
CREATE INDEX idx_notif_group   ON notifications(group_key);

app_rules (
  package_name TEXT PRIMARY KEY,
  label        TEXT,
  mode         TEXT NOT NULL,        -- allow|deny|blocked (blocked = hard block)
  default_intent TEXT
);

settings (key TEXT PRIMARY KEY, value TEXT);
  -- sleep_start '23:00', sleep_end '07:00', briefing_time '08:00',
  -- recap_time '21:30', last_opened_utc, ai_enabled, widget_mode ...

cat_state_log (id INTEGER PRIMARY KEY, at_utc INTEGER, pose TEXT, reason TEXT);
```

Retention: 7 days in Phase 1 (a pruning job runs daily). Extended history is a Phase 2 Pro item.

## 5. Ingest pipeline (per notification)

1. **Filter:** package in hard-block list → drop. Package not allowed → drop. Ongoing/media/system → drop.
2. **Redact:** replace OTP-like 4-8 digit codes and long digit runs with `••••` before anything is stored.
3. **Dedupe:** by `(package, key)` update-in-place; by `dedupe_hash` of `(package, sender, text, minute bucket)`; detect summary notifications ("3 new messages") and skip counting them as items.
4. **Classify (rules):** package default intent → keyword/pattern rules → sender signals → priority. Low confidence (<0.6) flagged for LLM fallback if enabled.
5. **Resolve time:** extract phrases → absolute UTC using `tz_at_receipt` and `posted_at_utc` (see §7).
6. **Persist and set lifespan** (`expires_at_utc`).
7. **Recompute cat state → update widget** (debounced ~1s).

Every step is a pure function where possible. The orchestrating function is the only side-effecting piece.

## 6. Cat state engine

```ts
type Pose = 'sleep_curled' | 'sleep_night' | 'awake_sit' | 'alert' | 'delivery' | 'yarn';
// 'waking' is a UI-only transition, not returned by the engine.

computePose(input: {
  items: NotificationRow[];   // active items only
  nowUtc: number;
  tz: string;
  sleepWindow: { start: string; end: string }; // local HH:mm
}): { pose: Pose; reason: string; counts: Counts; topItems: NotificationRow[] }
```

Precedence (top wins): `alert` > `sleep_night` > `awake_sit` > `delivery` > `yarn` > `sleep_curled`.
Rules (thresholds are constants in one file so they can be tuned):
- `alert`: high priority, unhandled, deadline within 6h **or** unanswered person message ≥ 30 min.
- `awake_sit`: ≥1 medium/high actionable non-urgent item.
- `delivery`: delivery event whose local date == today.
- `yarn`: ≥15 collapsed noise items in the last 60 min.
- `sleep_night`: local time inside the sleep window and not `alert`.

The engine is deterministic and has no I/O, which makes it ideal for unit tests and for demo scripting.

## 7. Time architecture

**Invariants**
- Persist UTC epoch ms. Persist the IANA timezone at receipt.
- Never do arithmetic on formatted strings; use Luxon `DateTime` in a named zone.
- No hardcoded offsets or "IST". India has no DST; other users' zones do.

**Phrase resolver** `resolvePhrase(text, receivedUtc, tzAtReceipt) → { utc, raw } | null`
- "tonight" → 21:00 local of the receipt day (if received after 21:00, treat as within the next hour / end of day; documented and tested).
- "tomorrow" → next local calendar day; combined with a time if present ("tomorrow 4 PM").
- Weekday names → next occurrence.
- "in 2 hours" → receipt + 2h.
- Ambiguous → null (do not guess).
- Test cases must include: 11:50 PM receipt, midnight rollover, a DST spring-forward day (e.g. America/New_York), and travel (receipt tz ≠ current tz).

**Schedules**
- Briefing (08:00) and recap (21:30) are computed as *the next occurrence in the current device zone*, scheduled as local notifications, and **rescheduled** whenever:
  - the app foregrounds,
  - the OS timezone changes (listen via the platform time-zone-changed broadcast or an app-foreground recheck),
  - settings change.
- Sleep window is a local wall-clock range that may cross midnight.
- "Today" = local calendar day in the *current* zone for lifespan and the `delivery` state.

**Display:** all UI times formatted in the current device zone.

## 8. Widget architecture

- Widgets are rendered from JavaScript by the widget library's task handler. Verify what primitives it supports; the plan uses an **SVG-based render** of the sprite so no PNG assets are needed.
- **Scene:** wall color rect + plank floor rect + cat sprite positioned on the floor line, drawn in one SVG at integer scale.
- **Text:** the small widget has at most one line. The medium widget has a summary panel (headline, 3 rows, footer; see PRD 6.3). Both are hidden for `sleep_*`. Custom fonts are supported via the widget plugin's `fonts` option, with the system monospace as fallback.
- **Palettes:** `light` and `dark` (and `night` for `sleep_night`).
- **Update triggers:**
  1. Ingest pipeline finishing (primary),
  2. periodic refresh (system minimum interval; used for day/night and expiry),
  3. app foreground,
  4. tz change.
- **Animation:** widgets can't run JS continuously. `modules/pulse-widget` (native AppWidgetProviders) draws each sprite frame to a pixel-exact bitmap and plays the idle loop in a `ViewFlipper`, so the cat keeps moving on the home screen with no JS running. JS pushes a display-only snapshot (`src/widget/payload.ts`) when data changes. The widget redraws from its saved snapshot after a reboot. (Replaced react-native-android-widget, which rendered one static bitmap at the launcher's MAX height and got cropped on Realme.)
- **Widget data contract:** the widget reads a small precomputed JSON snapshot (`pose`, `counts`, `topItems[3]`, `palette`, `generatedAtUtc`), never the full DB.

## 9. Sprite system

```ts
type Sprite = {
  id: PoseId;
  width: 32; height: 32;
  frames: string[][];            // each frame: 32 strings of 32 chars
};
type Palette = Record<string, string>; // char -> hex; '.' = transparent
```

- Frames are authored as text grids (one character per pixel, one char per palette color). Diffable in git, no binary art pipeline.
- `renderSpriteToSvg(sprite, frameIndex, palette, scale)` merges horizontal runs into `<rect>`s with `shape-rendering="crispEdges"`. Used by both the app and the widget.
- **Skins = palettes.** Phase 1 ships one palette; Phase 2 adds more.
- Source art can be authored in Piskel/Aseprite and converted with a small script (`scripts/png-to-sprite.ts`).

**Art reference (style only):** `docs/design/cat-stock-reference.png` is a watermarked stock image. It is kept locally and gitignored. **Never trace, convert or ship it.** Redraw an original 32×32 cat that borrows only these traits:
- Chunky style: 1px near-black outline, flat fills, no anti-aliasing, no dithering.
- Big head (about half the sprite height), a compact sitting body, front paws outlined as two blocks.
- Palette roles (approximate; lock exact hexes in M4): white body, tan patches (ears/cheeks/haunch/tail), a dark-brown crown patch, pale-pink inner ears, pink cheek blush, black eyes/mouth, a soft grey ground shadow.
- Face: solid square eyes, a small "ω"-style mouth, cheek blush one row under the eyes.
- Tail curls up beside the body. That makes it a good candidate for the tail-sway/twitch idle frames.
- The grey floor shadow goes on the scene's floor line so every pose sits on the same baseline.

Make it clearly our own: a different patch layout, ear shape and tail curve, so it is not a copy.

## 10. AI layer (last Phase 1 milestone)

```
App ──HTTPS──▶ Proxy (serverless) ──▶ LLM
```
- Proxy holds the API key, validates request schema, rate-limits per install ID, returns JSON only.
- App sends **only** redacted, trimmed fields (`package`, `intent`, `text ≤ 300 chars`, timestamps) and never notifications from blocked/denied apps.
- Uses: (a) structured extraction for low-confidence items, (b) briefing prose, (c) Ask.
- **Ask flow:** parse the question → choose a time window and filters locally → fetch matching rows from SQLite → send rows + question → render the answer.
- Responses are validated against a schema; on failure or offline, fall back to rule-based output.
- Phase 1: ungated (`isPro()` stub true). Phase 2: RevenueCat webhook lets the proxy reject non-Pro users.

## 11. Entitlements seam (Phase 2 prep)

```ts
// lib/entitlements.ts — Phase 1
export const isPro = (): boolean => __DEV__ ? true : true; // replaced in Phase 2
export type Feature = 'ai_extract' | 'ask' | 'ai_briefing' | 'widget_modes' | 'skins' | 'history_unlimited';
export const canUse = (f: Feature): boolean => isPro();
```
All gated features call `canUse(...)` from day one. **No RevenueCat imports in Phase 1.**

## 12. Suggested folder structure

```
pulse/
├─ app/                    # expo-router screens
│  ├─ (tabs)/today.tsx
│  ├─ (tabs)/away.tsx
│  ├─ (tabs)/history.tsx
│  ├─ (tabs)/settings.tsx
│  └─ onboarding/
├─ src/
│  ├─ capture/             # listener wiring, permission
│  ├─ ingest/              # pipeline orchestrator
│  ├─ classify/            # rules, patterns, package map
│  ├─ time/                # luxon helpers, resolver, schedules
│  ├─ db/                  # schema, migrations, queries
│  ├─ cat/                 # state engine, sprites, renderer, palettes
│  ├─ widget/              # widget components, task handler
│  ├─ ai/                  # proxy client, prompts, schemas
│  ├─ entitlements/        # stub (P1)
│  ├─ demo/                # scripted fake notifications
│  └─ ui/                  # shared components
├─ assets/sprites/         # text-grid sprite sources
├─ scripts/                # png-to-sprite, fixtures
├─ proxy/                  # serverless function (last P1 milestone)
├─ __tests__/
├─ app.config.ts
├─ eas.json
└─ docs/  (PRD.md, features.md, architecture.md, tasks.md)
```

## 13. Package map (initial; verify on the test phone)

| App | Package (verify) |
|-----|------------------|
| WhatsApp | `com.whatsapp` |
| Gmail | `com.google.android.gm` |
| LinkedIn | `com.linkedin.android` |
| Instagram | `com.instagram.android` |
| Google Messages | `com.google.android.apps.messaging` |
| Amazon (India) | `in.amazon.mShop.android.shopping` |
| Amazon (global) | `com.amazon.mShop.android.shopping` |
| Flipkart | `com.flipkart.android` |

Hard-blocked by default: authenticator apps (e.g. `com.google.android.apps.authenticator2`), known password managers, and banking/UPI apps (list is a maintained constant plus a name-pattern heuristic). Confirm actual packages by logging what the test phone emits.

## 14. Testing strategy

- **Unit (no device):** classifier fixtures, phrase resolver, cat state engine, redaction, sprite renderer, dedupe.
- **Fixture file:** `fixtures/notifications.json` (~60 realistic samples across all apps and intents) used by classifier tests and demo mode.
- **On-device:** manual checklist per milestone (permission flow, background capture, widget update latency, reboot persistence, battery-saver behavior, timezone change).
- **Timezone tests** run under multiple `TZ` values in CI (e.g. `Asia/Kolkata`, `America/New_York`, `Pacific/Auckland`).

## 15. Security and privacy notes

- No notification text in logs, ever. Log only counts and IDs.
- DB is app-private storage; consider SQLCipher-style encryption as a stretch.
- Blocked apps are dropped **before** any persistence or network path.
- LLM calls are opt-in with a visible toggle; proxy stores nothing.
- Widget snapshot contains only what the widget displays.
