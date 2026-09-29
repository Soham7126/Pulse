# Pulse — Features

Legend: **P1** = Phase 1 (build), **P2** = Phase 2 (RevenueCat & monetization). Status: ☐ todo, ◐ in progress, ☑ done.

---

## A. Capture

| ID | Feature | Phase | Status | Acceptance |
|----|---------|-------|--------|-----------|
| A1 | Notification access onboarding (cat-guided) | P1 | ☐ | User can grant access via a friendly flow; app detects grant/revoke |
| A2 | Real notification capture (headless listener) | P1 | ☐ | Notifications from allowed apps land in the DB within 2s, app in background |
| A3 | Source routing by package name | P1 | ☐ | WhatsApp, Gmail, LinkedIn, Amazon (IN + global), Instagram, Google Messages, Flipkart mapped |
| A4 | Dedupe & update handling | P1 | ☐ | Same notification key updates a row; WhatsApp "N new messages" summaries don't double-count |
| A5 | Per-app allow/deny | P1 | ☐ | Toggling an app stops/starts capture immediately |
| A6 | Hard-blocked sensitive apps | P1 | ☐ | Banking, authenticator, password managers are never stored, not user-overridable in P1 |
| A7 | OTP / digit redaction at ingest | P1 | ☐ | 4-8 digit codes replaced with `••••` before storage |
| A8 | Delete all data | P1 | ☐ | One tap wipes DB and widget state |

## B. Understanding

| ID | Feature | Phase | Status | Acceptance |
|----|---------|-------|--------|-----------|
| B1 | Rule-based intent classifier (8 intents) | P1 | ☐ | ≥85% correct on the fixture set of ~60 sample notifications |
| B2 | Priority scoring (`high/medium/low/noise`) | P1 | ☐ | Rules per intent + sender signals; unit-tested |
| B3 | Action & deadline extraction (rules) | P1 | ☐ | "send X tonight" → action + deadline resolved in the receipt timezone |
| B4 | Smart collapsing | P1 | ☐ | 15 Instagram likes → one row "Instagram — 15 new interactions" |
| B5 | Notification lifespan | P1 | ☐ | OTP archives at 5 min; delivery until delivered/day end; message until opened/replied |
| B6 | LLM structured extraction (fallback for low-confidence rules) | P1 (last) | ☐ | Returns validated JSON; failure falls back to rules result |
| B7 | Handled state | P1 | ☐ | Opening the source app or tapping "handled" removes it from the counts |

## C. The Cat

| ID | Feature | Phase | Status | Acceptance |
|----|---------|-------|--------|-----------|
| C1 | Pulse state engine | P1 | ☐ | Pure function `(items, now, tz, prefs) → poseId`, unit-tested across precedence rules |
| C2 | Sprite data format & renderer | P1 | ☐ | Sprites are palette-indexed matrices → SVG rects, crisp at integer scales |
| C3 | 6 widget poses + `waking` (in-app) | P1 | ☐ | All 7 locked poses exist at 32×32, shared silhouette |
| C4 | In-app animated cat | P1 | ☐ | Idle loops per pose at 4-6 fps; `waking` plays on sleep → awake |
| C5 | Palette-swap system | P1 (infra) | ☐ | Swapping a palette recolors any pose; only the default palette ships |
| C6 | Cat skins as a perk | P2 | ☐ | Tabby, black, gray, Siamese, night-sky; gated by entitlement |

## D. Widget

| ID | Feature | Phase | Status | Acceptance |
|----|---------|-------|--------|-----------|
| D1 | Small widget (2×2): floor scene + cat | P1 | ☐ | Cat on a plank floor, transparent-safe, light/dark palette |
| D2 | Widget text line | P1 | ☐ | One pixel-styled line, hidden in `sleep_*` states |
| D3 | Event-driven pose swap | P1 | ☐ | Widget updates within ~5s of a state change |
| D4 | Medium widget (4×2): cat + top 3 | P1 | ☐ | Shows top 3 by priority; tap opens the app |
| D5 | Scheduled refresh | P1 | ☐ | Periodic refresh so day/night and expiry changes apply without a new notification |
| D6 | Native frame-flip idle loop | P1 (stretch) | ☐ | Only if a spike shows it's feasible via config plugin |
| D7 | Widget modes: For You / Work / Shopping / People | P2 | ☐ | Mode setting changes the widget content |

## E. App screens

| ID | Feature | Phase | Status | Acceptance |
|----|---------|-------|--------|-----------|
| E1 | Today screen | P1 | ☐ | Animated cat, counts, top items, "N notifications → M important" |
| E2 | While You Were Away | P1 | ☐ | Grouped summary since last app open (rule-based; LLM prose later) |
| E3 | Timeline/History | P1 | ☐ | Filter by intent/app; 7-day retention in P1 |
| E4 | Settings | P1 | ☐ | Apps, sleep window, briefing times, data controls, timezone display |
| E5 | Smart actions | P1 | ☐ | Add to calendar (events), Track (deliveries), Reply (deep link to the source app) |
| E6 | Demo mode | P1 | ☐ | Scripted fake notifications through the real pipeline |
| E7 | Keep-alive guide | P1 | ☐ | Battery/OEM instructions with a deep link to settings |

## F. Time

| ID | Feature | Phase | Status | Acceptance |
|----|---------|-------|--------|-----------|
| F1 | UTC storage + receipt-tz | P1 | ☐ | Every row has `received_at_utc` and `tz_at_receipt` |
| F2 | Relative phrase resolver | P1 | ☐ | "tonight/tomorrow/4 PM/Friday" resolve correctly, DST-safe, tested |
| F3 | Local-time briefing (08:00) and recap (21:30) | P1 | ☐ | Local notifications fire at local times |
| F4 | Timezone/DST change handling | P1 | ☐ | Schedules and "today" recompute on tz change |
| F5 | Sleep window | P1 | ☐ | Drives `sleep_night` and "while you were sleeping" |

## G. AI

| ID | Feature | Phase | Status | Acceptance |
|----|---------|-------|--------|-----------|
| G1 | LLM proxy (serverless) | P1 (last) | ☐ | Key never on device; rate-limited; request schema validated |
| G2 | Ask my notifications | P1 (last) | ☐ | Answers "Did anyone ask me to do something?" from local DB rows |
| G3 | AI briefing prose | P1 (last) | ☐ | Natural-language version of the rule-based briefing |
| G4 | Minimal-data policy | P1 (last) | ☐ | Redacted, trimmed text only; user toggle to disable all AI |

## H. Monetization (RevenueCat) — Phase 2

| ID | Feature | Phase | Status | Acceptance |
|----|---------|-------|--------|-----------|
| H1 | `lib/entitlements` stub | P1 | ☐ | `isPro()` returns true behind a dev flag; single seam for P2 |
| H2 | RevenueCat SDK setup | P2 | ☐ | Configured in dev build, API keys via env |
| H3 | Products: monthly + annual (+ trial) | P2 | ☐ | Visible in offerings |
| H4 | `pro` entitlement gating | P2 | ☐ | Gates G2, G3, B6, D7, C6, extended history |
| H5 | Paywall at moments of desire | P2 | ☐ | Triggered from Ask/briefing taps |
| H6 | Restore + manage subscription | P2 | ☐ | Working on a test account |
| H7 | Webhook → proxy enforcement | P2 | ☐ | Non-Pro requests rejected server-side |
| H8 | Entitlement → widget shared state | P2 | ☐ | Widget reflects Pro features after a purchase |
| H9 | Local-time display of renewal/trial dates | P2 | ☐ | UTC from RevenueCat shown in device tz |

## Free vs Pro split (planned, P2)

**Free:** capture, rules classification, cat + small widget, 7-day history, basic briefing, demo mode.
**Pro:** LLM extraction, Ask, AI briefing, medium widget modes, unlimited history, skins.
