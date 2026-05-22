# Baby Tracker iOS

Production-track Expo app for the privacy-first baby tracker.

## Run Locally

```sh
npm install
npm run ios
```

## Run From Xcode

Open the workspace, not the project file:

```sh
open ios/BabyTracker.xcworkspace
```

In Xcode, choose the `BabyTracker` scheme and an iOS Simulator, then press Run.
Opening `ios/BabyTracker.xcodeproj` directly will fail because CocoaPods modules
such as Expo are only wired into the workspace.

The shared Xcode scheme runs the simulator with a bundled Release build so it can
launch without a separate Metro server. For hot reload/dev-server development,
use `npm run ios` from this folder instead.

## App Store Configuration

- Bundle ID: `com.priyabhasin.babytracker`
- App name: `Baby Tracker`
- Subtitle: `Fast newborn care logging`
- Privacy posture: local-first; notifications are optional; no remote data collection in MVP.
- Plus entitlement: `baby_tracker_plus`
- Monthly subscription product: `baby_tracker_plus_monthly`
- Launch offer: `$4.99/month` with a 14-day free trial

Before TestFlight, confirm the bundle ID belongs to your Apple Developer account, publish the privacy policy/support URLs, create the subscription in App Store Connect, and connect it to RevenueCat.

## Supabase Backend

The app includes an optional Supabase backend for account-based backup and future caregiver sharing. Local SQLite remains the source of truth for offline use.

To enable backend sync:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Enable Email auth.
4. Add `supabaseUrl` and `supabaseAnonKey` in `app.json`.
5. Build the app and use the Sync section to create/sign in to an account.

See `SUPABASE_BACKEND.md` for the full setup and privacy checklist.

## RevenueCat Setup

The app includes `react-native-purchases` and a custom Baby Tracker Plus paywall. Real purchases are disabled until you add the RevenueCat iOS public SDK key.

1. Create a RevenueCat project and iOS app for `com.priyabhasin.babytracker`.
2. In App Store Connect, create subscription group `Baby Tracker Plus`.
3. Add monthly product `baby_tracker_plus_monthly` with a 14-day free trial.
4. In RevenueCat, create entitlement `baby_tracker_plus`.
5. Attach `baby_tracker_plus_monthly` to the default offering.
6. Put the iOS public SDK key into `app.json` under `expo.extra.revenueCatIosApiKey`.
7. Run `npx pod-install ios`, then build through Xcode or EAS.

Core care logging must remain free even when purchases are not configured.

## Production Checks

```sh
npm run doctor
npm run export:ios
```

## EAS Build

```sh
npx --yes eas-cli login
npm run build:ios
npm run submit:ios
```
