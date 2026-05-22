# Baby Tracker

Privacy-first baby tracking app for newborn care.

This repo contains:

- A Vite web prototype in the project root.
- A production-track Expo iOS app in `ios-app/`.
- App Store, privacy, and TestFlight planning docs in `docs/`.
- An agentic business operating system in `AGENTS.md` and `docs/agentic-business-team.md`.

## Agentic Team

Every substantial task should start with the PM Orchestrator in `AGENTS.md`, then route to specialist agents for research, discovery, design, iOS engineering, data/backend, growth, and QA/release. The operating model is documented in `docs/agentic-business-team.md`.

## Web Prototype

```sh
npm install
npm run dev -- --port 5173
```

## iOS App

Use the bundled Node runtime in this Codex workspace if your system Node is older than Expo requires:

```sh
cd ios-app
PATH=/Users/priyabhasin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm install
PATH=/Users/priyabhasin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run doctor
PATH=/Users/priyabhasin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run export:ios
```

The iOS app includes local SQLite storage, local reminders, CSV/PDF export, and delete-all-data controls.
