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

Before TestFlight, confirm the bundle ID belongs to your Apple Developer account and publish the privacy policy/support URLs.

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
