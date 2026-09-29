# Pulse — Product Requirements Document

**Version:** 0.1 (Phase 1 focus)
**Platform:** Android only (React Native + Expo, dev build)
**Hackathon:** RevenueCat (integration is Phase 2)
**Last updated:** 29 Sep 2026

---

## 1. One-line pitch

Pulse turns your notification pile into a calm, glanceable answer to "does anything need me right now?", and a pixel cat sleeping on your home screen tells you before you read a word.

## 2. Problem

Phones show notifications as a flat, chronological list. A typical person has 40+ a day across WhatsApp, Gmail, LinkedIn, Amazon, Instagram and SMS. Most are noise, a few are urgent, and the two look identical. People open 4-6 apps just to learn whether anything matters.

## 3. Target user

Students and young professionals in India (primary), Android users, heavy WhatsApp/Gmail/LinkedIn users, who miss important messages because they are buried under likes, promotions and delivery pings.

## 4. Product principles

1. **Calm by default.** A sleeping cat means "ignore your phone." Silence is the feature.
2. **Glance first.** Information beats decoration. The cat is small; the answer is instant.
3. **Privacy is a feature.** On-device first. Sensitive apps are never read. OTPs are redacted at ingest.
4. **Understand, then act.** Notification → meaning → action, not just display.
5. **Rules first, AI second.** The free rules engine must be genuinely useful without any LLM.

## 5. Goals and non-goals

### Phase 1 goals (this build)
- Real notification capture on a real Android phone via the Notification Listener service.
- Local storage, per-app allow/deny, dedupe, collapsing.
- Rule-based classification into 8 intents with priority and lifespan.
- **Cat status engine** and a **pixel-cat home-screen widget** (small and medium).
- In-app screens: Today, While You Were Away, Settings, onboarding.
- Correct **timezone** handling everywhere (UTC storage, local logic, DST-safe).
- Local briefing/recap notifications at user-local times.
- Demo mode with realistic fake notifications.
- LLM layer (structured extraction, summaries, Ask) as the last milestone, behind a proxy, ungated in Phase 1.

### Non-goals in Phase 1
- **RevenueCat, paywalls, entitlements, subscriptions** (Phase 2; a stub interface only).
- iOS (the OS does not allow reading other apps' notifications).
- Cloud sync, multi-device, accounts.
- Play Store release (sideloaded APK is enough).
- Cat skins (Phase 2 perk; Phase 1 only builds the palette-swap system).

## 6. The cat theme (locked)

**Scene:** The cat lives in one quiet scene: a plain wall and a wooden floor. In the default state it is asleep on the floor and that is all you see. Other states are the same room and the same cat, just awake. The scene itself has no gradients and no icons beyond the cat.

**Visual reference:** `docs/design/widget-reference.png`. It sets the layout and mood only. Where it differs from this section (cat colours, pose, extra labels), this section wins.

**Small widget (strict):** scene + cat only, no cards or chips. At most one short pixel-font line, and none at all when calm.

**Medium widget:** the scene sits in a rounded panel on the left. The right side holds a panel with a headline, up to 3 item rows and a footer (see 6.3). When calm (`sleep_*`), the right panel is hidden and the scene alone is shown.

### 6.1 Locked pose list

Grid: 32×32 sprite, integer scaling only, transparent background, shared silhouette and palette across all poses. Base character is a white cat with brown patches and pink cheeks (redrawn originally; the stock reference image is watermarked and must not ship).

| ID | Pose | Meaning | Trigger | Idle loop (in-app) | Widget |
|----|------|---------|---------|--------------------|--------|
| `sleep_curled` | Curled up asleep on the floor, eyes as lines | Nothing needs you | No pending high/medium items, daytime | Chest rise, floating "z" (3 frames) | Yes (default) |
| `sleep_night` | Asleep, moon/star, darker floor | Night, all quiet | Inside user's sleep window, nothing urgent | Slow "z" (2 frames) | Yes |
| `awake_sit` | Sitting, ears up, eyes open | Some actionable items | ≥1 medium/high non-urgent actionable item | Blink, tail sway (3 frames) | Yes |
| `alert` | Standing, ears up, tail puffed, "!" above head | Urgent | Any high-priority unhandled item with deadline ≤ 6h, or unanswered person message ≥ 30 min | Tail twitch, ear flick (2 frames) | Yes |
| `delivery` | Sitting beside a small parcel | Something arriving today | Delivery event with local date = today, no higher state | Parcel nudge (2 frames) | Yes |
| `yarn` | Batting a yarn ball | Noise collapsed | ≥15 noise items collapsed in last 60 min, no higher state | Yarn rolls (3 frames) | Yes |
| `waking` | Stretch / yawn | Transition sleep → awake/alert | State change from a sleep pose | One-shot (4 frames) | **In-app only** |

### 6.2 State precedence (top wins)

1. `alert`
2. `sleep_night` (if inside sleep window and no `alert`)
3. `awake_sit`
4. `delivery`
5. `yarn`
6. `sleep_curled`

Handled/opened items stop counting. The cat returns to sleep when nothing qualifies.

### 6.3 Widget sizes
- **Small (2×2):** floor scene + cat. Optional single line: `3 important`.
- **Medium (4×2):** the scene in a rounded panel on the left. The right panel has:
  - a headline, e.g. `2 things need you`;
  - up to 3 item rows, each with a small intent icon, the app or sender, and a truncated **redacted** snippet;
  - a footer `31 notifications → 3 important` with an open-app arrow.

  The cat's pose always comes from the state engine (e.g. items needing you → awake, never asleep next to a list). Monospace/pixel font for labels. No gradients. When calm, only the scene is shown.

## 7. Intents (classification taxonomy)

Communication, Event, Delivery, Finance, Security, Shopping, Work, Noise.

Each stored notification has: intent, priority (`high|medium|low|noise`), `action_required`, optional action text, optional deadline (UTC), lifespan rule, and a collapse group.

## 8. Timezone requirements

- All timestamps stored in **UTC**; the device timezone at receipt is stored alongside.
- Display and logic use the device's current IANA timezone. Nothing hardcoded to IST.
- Relative phrases ("tonight", "tomorrow 4 PM") resolve against the **receipt time in the receipt timezone**.
- Briefing (default 08:00) and recap (default 21:30) fire at **local** times and reschedule on timezone or DST change.
- Sleep window default 23:00-07:00 local, user-editable.
- "Today" for delivery/lifespan rules means the local calendar day.

## 9. Privacy requirements

- Notification access is opt-in with a plain-language onboarding screen.
- Per-app allow list. Hard block on banking, authenticator and password-manager apps.
- OTPs and long digit sequences are redacted **before storage and before any network call**.
- Notifications are stored only on the device. Nothing leaves the phone in Phase 1 except optional LLM calls, which send minimal redacted text through a proxy and are user-toggleable.
- "Delete all data" in settings.

## 10. Success criteria (hackathon demo)

- A live notification on the demo phone changes the widget cat within ~5 seconds.
- Demo mode can reproduce the full story without depending on real messages.
- "31 notifications → 3 important" is visible in the app and reflected by the cat.
- No crash across a 10-minute demo, including timezone change and app restart.

## 11. Demo script (90 seconds)

1. Home screen: cat asleep on the floor. "Nothing needs me."
2. Send a WhatsApp message with a deadline → cat wakes, then goes alert; widget line updates.
3. Open app → Today view shows 1 important, rest collapsed.
4. Fire the demo burst (Instagram likes) → yarn state, collapsed row.
5. "While you were away" summary.
6. Change the phone timezone → briefing time and "today" adjust.
7. (Phase 2) Paywall via RevenueCat.

## 12. Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Widget/listener libs incompatible with the Expo SDK | Blocks everything | M0 spike before any other work |
| Widgets cannot run true animation | Cat less lively | Event-driven pose swaps + in-app animation; native frame-flip is a stretch spike |
| OEM battery killers stop the listener | Widget goes stale | Keep-alive guide, foreground fallback, test on the real device early |
| Art is the time sink | Delays widget | Lock the pose list now (done), start sprites in M4 in parallel with code |
| Scope creep | Missed demo | Cut order: LLM extras → medium widget → briefings. Never cut capture, cat states, widget |

## 13. Open questions

1. Exact phone model and Android version (affects battery/OEM handling).
2. Is the hackathon judged on a hosted demo video, a live APK, or both?
3. Draw sprites by hand (Piskel/Aseprite) or generate and clean up?
4. Which LLM provider backs the proxy (Anthropic API is the default assumption).

## 14. Phase 2 (deferred, out of scope for the build kickoff)

RevenueCat SDK, `pro` entitlement, paywall, restore/manage subscription, webhook-verified LLM proxy, cat skins, extended history. See `features.md`.
