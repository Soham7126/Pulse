# Pulse — Tasks

Work milestone by milestone. Do not start a milestone until the previous one's **exit check** passes on the real phone. Tick boxes as you go.

**Phase 1 = build only. No RevenueCat code.** Phase 2 tasks are listed at the end for planning.

---

## M0 — Setup and feasibility spike (do first, biggest risk)

- [x] Create Expo app (TypeScript, expo-router) and initialize git
- [x] Add `expo-dev-client`; configure `app.config.ts` and `eas.json` (`development` profile, Android APK) — used static `app.json`, see spike-notes
- [x] Create EAS project; run first cloud build; install the APK on the physical phone
- [x] Add the notification listener library; confirm it works with the Expo SDK (config plugin / prebuild needs) — local Expo module, see spike-notes
- [x] Add the widget library; render a hard-coded "hello" widget on the home screen
- [x] Log (count-only) that a real notification from any app reaches JS while the app is backgrounded
- [x] Record findings in `docs/spike-notes.md`: library versions, quirks, what widget primitives are supported (SVG? text? images?), OEM behavior
- [x] Decision gate: if either library fails, pick the fallback (custom Expo module or alternative lib) before continuing

**Exit check:** a real WhatsApp message triggers JS while the app is closed, and a placeholder widget is on the home screen.

## M1 — Capture

- [ ] Onboarding screen explaining notification access; deep link to the system settings screen
- [ ] Permission state detection (granted/revoked) with a re-prompt path
- [x] Headless task receives notifications; extract package, key, title, text, timestamp
- [ ] Package → app map (§13 of architecture); log the real packages the phone emits and correct the map — map done (8 packages); real-package check pending on device
- [x] Drop ongoing/system/media notifications
- [x] Hard-block list (banking, authenticator, password managers); enforced before any storage
- [ ] Per-app allow/deny settings screen (persisted)
- [x] OTP/digit redaction function + tests

**Exit check:** allowed apps appear in a raw debug list within ~2s; a blocked app never appears; OTPs are masked.

## M2 — Storage and classification

- [ ] `expo-sqlite` schema + migration runner (architecture §4)
- [ ] Ingest orchestrator (filter → redact → dedupe → classify → time → persist)
- [ ] Dedupe by `(package, key)` update-in-place and by hash; handle WhatsApp/Gmail summary notifications
- [ ] Build `fixtures/notifications.json` (~60 samples across apps/intents, incl. Indian contexts: UPI, Amazon/Flipkart delivery, Naukri/LinkedIn)
- [ ] Rules classifier: intent, priority, `action_required`, action text
- [ ] Collapsing by `group_key` (Instagram likes, WhatsApp per-chat)
- [ ] Lifespan rules + expiry job (OTP 5 min, delivery until day end, message until handled)
- [ ] Handled state (opened/tapped/"mark handled")
- [ ] 7-day retention prune job
- [ ] Unit tests: classifier accuracy target ≥85% on fixtures

**Exit check:** real notifications are classified and stored; fixture tests pass; duplicates don't double-count.

## M3 — Time core

- [ ] Add Luxon; verify timezone formatting on-device under Hermes
- [ ] Store `posted_at_utc` + `tz_at_receipt` on every row
- [ ] `resolvePhrase()` for tonight/tomorrow/weekday/"in N hours"/clock times
- [ ] Tests under `Asia/Kolkata`, `America/New_York` (DST day), `Pacific/Auckland`; 11:50 PM and midnight-rollover cases
- [ ] Settings: sleep window, briefing time, recap time (defaults 23:00-07:00, 08:00, 21:30)
- [ ] Timezone-change detection (foreground recheck + system broadcast where available)
- [ ] `isSameLocalDay`, `inSleepWindow` helpers (window may cross midnight)

**Exit check:** manually changing the phone timezone updates "today", the sleep window evaluation and schedules; tests pass in all three TZ values.

## M4 — Cat state engine and sprites (start art in parallel with M1)

- [ ] Lock the palette (wall, floor, cat white/brown/pink, line) and the light/dark/night variants
- [ ] Sprite text-grid format + `renderSpriteToSvg` with integer scaling
- [ ] Author sprites at 32×32: `sleep_curled`, `sleep_night`, `awake_sit`, `alert`, `delivery`, `yarn`, `waking`
- [ ] Author 2-4 idle frames per pose (in-app)
- [ ] Redraw the mascot as an original character (do **not** ship the watermarked stock image)
- [ ] `computePose()` pure function + thresholds constants file
- [ ] Unit tests for precedence, night window, thresholds, empty state
- [ ] Log state changes to `cat_state_log`
- [ ] Sprite gallery debug screen (all poses × palettes)

**Exit check:** gallery shows all 7 poses crisply; `computePose` tests pass; injecting fixture items changes the pose as specified.

## M5 — Widget

- [ ] Scene composer: wall + plank floor + cat on the floor line, drawn as one SVG
- [ ] Small (2×2) widget: scene + optional single text line (hidden in `sleep_*`)
- [ ] Widget snapshot JSON writer (`pose`, `counts`, `topItems[3]`, `palette`, `generatedAtUtc`)
- [ ] Ingest → recompute pose → debounce → widget update
- [ ] Scheduled refresh (day/night and expiry without new notifications)
- [ ] Light/dark/night palettes; verify on real wallpapers
- [ ] Medium (4×2) widget per `docs/design/widget-reference.png`: scene panel left; headline + top 3 rows + "N → M important" footer right (hidden in `sleep_*`); tap opens the app
- [ ] Widget survives reboot and app kill; verify on device
- [ ] Spike (time-boxed, 0.5 day): native frame-flip idle loop via config plugin; keep only if it works cleanly

**Exit check:** a real notification changes the widget cat within ~5s; calm state shows only the sleeping cat on the floor with no text.

## M6 — App UI

- [ ] Tab layout (Today / Away / History / Settings)
- [ ] Animated in-app cat with per-pose idle loops and the `waking` one-shot
- [ ] Today: cat, counts, top items, "N notifications → M important"
- [ ] Collapsed group rows with tap-to-expand
- [ ] While You Were Away (since `last_opened_utc`), grouped by intent, rule-based text
- [ ] History with filters (intent, app)
- [ ] Smart actions: Add to Calendar (event), Track (delivery deep link), Reply (open source app)
- [ ] Settings: apps, sleep window, briefing times, AI toggle, current timezone display, Delete all data
- [ ] Keep-alive/battery guide screen with a deep link to system settings

**Exit check:** the full user loop works without the debug list; nothing crashes over a 10-minute session.

## M7 — Briefing, recap, demo mode

- [ ] Rule-based briefing and recap content (counts, top item, "31 → 3")
- [ ] Local notifications at local 08:00 / 21:30; reschedule on tz/settings change
- [ ] "While you were sleeping" summary using the sleep window
- [ ] Demo mode: scripted sequences pushed through the real ingest pipeline (calm, urgent, delivery, yarn burst, night)
- [ ] Demo controls screen (hidden gesture) with reset
- [ ] Rehearse the 90-second demo script from the PRD

**Exit check:** the entire demo story runs end-to-end with demo mode alone.

## M8 — AI layer (last; cut first if time is short)

- [ ] Serverless proxy: schema validation, rate limit, key held server-side
- [ ] Redaction + minimal-data payload builder; AI toggle honored everywhere
- [ ] LLM structured extraction for low-confidence items with schema validation and rules fallback
- [ ] Ask my notifications: local filter → rows → LLM → answer
- [ ] AI briefing prose
- [ ] `canUse()` seam used at every AI entry point (stub true)
- [ ] Offline/error states verified

**Exit check:** "Did anyone ask me to do something?" answers correctly from real/demo data; airplane mode degrades gracefully.

## M9 — Polish and hand-off

- [ ] Empty/error/permission-revoked states with the cat
- [ ] Performance check (ingest under load: 100 notifications in a minute)
- [ ] Reboot and battery-saver testing on the real phone
- [ ] README with build/run instructions (EAS commands)
- [ ] Release APK build (`preview`/`production` profile)
- [ ] Record demo video
- [ ] Phase 1 retro; confirm the entitlements seam is the only P2 prep in code

---

## Phase 2 — RevenueCat (not started)

- [ ] Create RevenueCat project; connect Play Console app; create products (monthly, annual, trial)
- [ ] Set up Play Console internal test track and license testers early (approval lag)
- [ ] Define `pro` entitlement and offerings
- [ ] Add the RevenueCat React Native SDK (+ UI package) to the dev build; rebuild via EAS
- [ ] Replace the `entitlements` stub with real `isPro()`
- [ ] Paywall at moments of desire (Ask, briefing, widget modes, skins)
- [ ] Restore purchases + manage subscription
- [ ] Webhook → proxy so non-Pro requests are rejected server-side
- [ ] Persist entitlement into the widget snapshot; Pro widget modes
- [ ] Cat skins (palette packs) as a Pro perk
- [ ] Extended history for Pro
- [ ] Display renewal/trial dates in device timezone
- [ ] Sandbox purchase test on the physical device
