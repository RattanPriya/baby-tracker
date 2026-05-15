# Baby Tracker iOS

Production-track Expo app for the privacy-first baby tracker.

## Run Locally

```sh
npm install
npm run ios
```

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
