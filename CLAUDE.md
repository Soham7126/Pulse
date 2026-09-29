# CLAUDE.md — Pulse

You are helping build **Pulse**, an Android app that reads notifications, classifies them, and shows their state through a pixel cat on a home-screen widget. Read `docs/PRD.md`, `docs/architecture.md`, `docs/features.md` and `docs/tasks.md` before starting any work.

## Current phase

**Phase 1: build only.** Follow `docs/tasks.md` milestone by milestone (M0 → M9).
**Do NOT add RevenueCat** (no SDK, no paywall, no purchase code) in Phase 1. Gated features call `canUse(...)` from `src/entitlements`, which is a stub that returns true. That seam is the only Phase 2 prep.

## Environment constraints

- React Native + Expo **development build** (never Expo Go). TypeScript strict.
- **Android Studio is not available.** Do not suggest it or local Gradle/SDK builds. Native builds use **EAS Build** in the cloud; the app runs on a **physical Android phone**.
- Android only. Do not write iOS-specific code.
- Commands you may assume: `npx expo start --dev-client`, `eas build --profile development --platform android`, `npx jest`.

## Working rules

1. **One milestone at a time.** Finish its exit check before starting the next. Say which milestone/task you are on.
2. **Verify libraries before using them.** The notification-listener and widget libraries change often. Read their current docs/README and the installed version's types; do not rely on memory for APIs or Expo config-plugin options. If something doesn't match, say so and record it in `docs/spike-notes.md`.
3. **Keep the core pure.** `classify`, `time`, `cat` (state engine, sprites) and redaction are pure TypeScript with no React Native imports, so they run under Jest.
4. **Test what is testable.** Write unit tests with the code for classifier, phrase resolver, state engine, redaction, dedupe, and sprite rendering. Ask me to test on-device items and give a short checklist.
5. **Small, reviewable changes.** Prefer several focused commits over one large one. Don't refactor unrelated files.
6. **If unsure, ask** rather than invent a requirement, especially for product behavior and thresholds.

## Non-negotiable privacy rules

- **Never log notification title/body text.** Log counts, IDs and pose names only.
- Redact OTPs/digit runs **before** persistence or any network call.
- Hard-blocked apps (banking, authenticators, password managers) are dropped at the first step of ingest, and the user cannot override this in Phase 1.
- LLM calls only through the proxy, only with redacted minimal text, only when the AI toggle is on.
- Never put an API key in the app bundle.

## Time rules (critical)

- Store **UTC epoch ms** plus `tz_at_receipt` (IANA). Use **Luxon** for all date math.
- No hardcoded offsets or "IST"; never do date math on formatted strings.
- Relative phrases resolve against the **receipt time in the receipt timezone**.
- Briefing/recap are **local-time** schedules and must be rescheduled on timezone/DST/settings change.
- Any time-related code ships with tests run under `Asia/Kolkata`, `America/New_York` (incl. a DST day) and `Pacific/Auckland`.

## The cat (locked design)

Poses are fixed. Do not add, rename or remove poses without asking.

`sleep_curled`, `sleep_night`, `awake_sit`, `alert`, `delivery`, `yarn`, plus `waking` (in-app only transition).

Precedence: `alert` > `sleep_night` > `awake_sit` > `delivery` > `yarn` > `sleep_curled`.

Theme: **the widget background is a quiet room, a plain wall and a wooden floor, with the cat sleeping on the floor in the default state.** No cards, gradients or extra icons. At most one short text line, hidden when the cat is asleep.

Sprite rules:
- 32×32, integer scaling only, `shape-rendering="crispEdges"`, transparent background.
- Sprites are **text grids** in `assets/sprites/`, one char per palette color, `.` transparent.
- Skins are **palette swaps**; only the default palette ships in Phase 1.
- Do not use the watermarked stock cat image. Redraw an original character.
- The widget can't animate continuously: use event-driven pose swaps. Idle loops are in-app only.

## Code style

- TypeScript strict, no `any` without a comment explaining why.
- Named exports for modules; React function components with hooks.
- File names `kebab-case`; types `PascalCase`; constants `UPPER_SNAKE` in `constants.ts`.
- Thresholds and timings (alert window, yarn burst count, OTP expiry) live in one `src/config/thresholds.ts`.
- Keep comments for the *why*. No dead code or commented-out blocks.

## Definition of done (per task)

- Meets the acceptance criteria in `features.md` and the milestone exit check in `tasks.md`.
- Unit tests pass; types check; no new lint errors.
- No notification text in logs; blocked apps verified not persisted.
- `docs/tasks.md` checkboxes updated.
- A short note on what to verify on the phone.

## When you finish a session

Summarize: what changed, what to test on-device, any library quirks discovered, and the next task.
