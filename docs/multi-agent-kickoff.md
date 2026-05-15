# Multi-Agent Kickoff

## Product Lead

Decisions:

- Position the app as a wellness and logging utility, not a medical app.
- MVP is privacy-first daily baby logging: quick capture, caregiver handoff support, and simple pattern awareness.
- Use App Store-safe language such as "track," "log," "record," "summarize," and "patterns."
- Avoid diagnosis, dose recommendations, illness detection, treatment claims, and sleep outcome claims.
- Defer real-time caregiver sync for MVP unless the business depends on it.

Acceptance criteria:

- Common event types can be created, edited, and deleted.
- Timeline makes last feed, last diaper, last sleep, and last medicine visible without charts.
- Reminders are user-created only and do not imply dosing advice.
- Daily patterns show factual totals only.
- App works without account creation.

## Design Lead

Decisions:

- Main tabs: Today, Log, Insights, Baby. Settings lives under Baby.
- Quick logging should use thumb-zone buttons and bottom sheets.
- Event creation should be instant, with undo after save.
- Visual tone is native iOS, soft, precise, adult, and non-cartoonish.
- Dedicated Night Mode should be dimmer than ordinary dark mode.

Acceptance criteria:

- Feed, diaper, and sleep logging paths are timed against the under-5-second goal.
- VoiceOver labels include event type, value, and time.
- Charts have text summaries.
- Empty states reduce pressure and never shame the caregiver.

## Data & Insights Engineer

Decisions:

- Use a local-first event ledger as the source of truth.
- Daily summaries, 7-day trends, and 30-day trends are computed projections.
- Include sync metadata early even if CloudKit sync is deferred.
- Store timezone context per event.
- CSV/PDF exports are generated from canonical events plus computed summaries.

Core entities:

- `BabyProfile`
- `BabyEvent`
- `Reminder`
- `DailySummary`
- `TrendWindow`

## iOS Engineer

Decision:

- Ship the first App Store version as an Expo React Native app, not SwiftUI and not a WebView wrapper.

Recommended stack:

- Expo React Native
- TypeScript in the production codebase
- Expo Router for navigation
- SQLite for structured local data
- Expo Notifications for local reminders
- Expo FileSystem, Sharing, and Print for CSV/PDF export
- Domain/data modules that remain portable if a SwiftUI rewrite is ever justified

## QA & Release Agent

Decisions:

- Treat baby logs as sensitive user-provided data.
- No ads, no tracking, no third-party analytics in MVP unless explicitly approved.
- If truly local-only with no analytics or sync, App Store privacy labels may be able to say data is not collected, because Apple defines collection around data transmitted off device.
- TestFlight builds must be production-intent.

Release blockers:

- Live support URL and privacy policy URL.
- Accurate App Privacy details.
- Notification permission behavior tested on real device.
- Offline use tested.
- Delete/export flows verified.
- VoiceOver and Dynamic Type reviewed.
- No medical diagnosis, treatment, risk scoring, or emergency triage claims.

## Current Implementation Decision

The repo now keeps the Vite prototype and adds a production-track Expo app under `ios-app/`. The first scaffold ports the core loop into native React Native components: baby profile, daily summary, quick logs, detail fields, care cue, timeline, and 7-day patterns.

Next implementation step:

Move from the single-file Expo MVP to the recommended production structure with TypeScript, screen modules, local SQLite storage, notifications, exports, and release docs.
