# TestFlight Implementation Plan

## Phase 1: Native MVP

- Convert `ios-app` to TypeScript.
- Add app navigation: Today, Log, Insights, Baby.
- Split the current `App.js` into reusable screen and component modules.
- Replace AsyncStorage event storage with SQLite.
- Add edit/delete flows for every event type.
- Add local notification permission flow and user-created reminders.

## Phase 2: Data And Exports

- Add canonical event schema and migrations.
- Add daily summaries from event projections.
- Add 7-day and 30-day trend calculations.
- Add CSV export.
- Add PDF daily/weekly summary.
- Add delete-all-data and export-all-data settings.

## Phase 3: App Store Readiness

- Replace placeholder bundle ID.
- Add final icon and splash screen.
- Add onboarding and privacy screen.
- Add App Store description, keywords, screenshots, support URL, and privacy policy URL.
- Run QA matrix across device sizes, dark mode, Dynamic Type, VoiceOver, offline use, and notification permission states.

## Phase 4: TestFlight

- Configure EAS project.
- Create internal TestFlight build.
- Add demo data mode for Apple review.
- Prepare Review Notes explaining local-first storage, optional reminders, exports, and non-medical positioning.
