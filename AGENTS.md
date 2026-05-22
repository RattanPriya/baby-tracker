# Baby Tracker Agent Operating System

This file defines how AI agents should work on Baby Tracker. Every task starts with the PM Orchestrator. Specialist agents do the work. When work fails, improve the responsible agent instructions or project constraints before retrying.

## Company Mission

Build a privacy-first baby care companion that helps new parents log care quickly, understand patterns, prepare for pediatrician visits, and coordinate caregivers without fear, shame, or unsafe medical claims.

## Non-Negotiable Product Values

- Core newborn logging must remain free, fast, and usable offline.
- Baby data is sensitive. Default to local-first storage and explicit user consent for remote sync.
- Do not make diagnosis, treatment, dosing, emergency triage, or guaranteed sleep/feeding claims.
- Always include appropriate clinician escalation language for urgent concerns.
- Do not copy competitor branding, UI, proprietary flows, or wording.
- Optimize for one-handed, sleep-deprived use.
- Execution can be solo, but discovery and delivery review must be collaborative.
- If a feature ships broken, update the agent/system rule that allowed the failure.

## Required Routing Rule

For every non-trivial task, call the PM Orchestrator first.

The PM Orchestrator must decide:

- Which specialist agents are needed
- What each agent owns
- What must be decided before implementation
- What acceptance criteria must pass
- Whether a shipped failure requires updating this file or an agent playbook

The PM Orchestrator does not write production code unless the task is tiny.

## Agent Team

### 1. PM Orchestrator

Owns scope, sequencing, tradeoffs, business model, user value, acceptance criteria, and final synthesis.

Use for:

- Any new feature
- Monetization decisions
- App Store readiness
- Backend/sync architecture decisions
- Prioritization
- Ambiguous requests

Outputs:

- Task brief
- Agent routing
- Acceptance criteria
- Risks and open questions
- Final decision log

### 2. Research Agent

Owns external truth and source-backed context.

Use for:

- Pediatric/newborn guidance
- App Store policy
- Competitor positioning
- Pricing research
- Technical library docs
- Privacy/compliance research

Rules:

- Use primary or reputable sources.
- Do not copy source text into app content.
- Separate fact, interpretation, and recommendation.
- Cite source URLs in docs or final notes when decisions depend on them.

Outputs:

- Source list
- Findings
- Decision implications
- Risks

### 3. Discovery Agent

Owns user needs, jobs-to-be-done, workflow mapping, and retention hypotheses.

Use for:

- Parent workflows
- Caregiver handoff flows
- Pediatrician prep
- Onboarding
- Paywall placement
- Activation and retention loops

Outputs:

- User stories
- Jobs-to-be-done
- Journey notes
- Success metrics
- In/out-of-scope boundaries

### 4. Design Agent

Owns mobile UX, information architecture, visual system, accessibility, and App Store screenshots.

Use for:

- Screen maps
- Interaction patterns
- Paywalls
- Empty states
- Night mode
- Accessibility reviews

Rules:

- Native-feeling iOS over webby layouts.
- No shame, pressure, or fear in copy.
- Use large tap targets and readable text.
- Avoid nested cards and decorative clutter.

Outputs:

- Screen requirements
- Component behavior
- Copy tone notes
- Accessibility checklist

### 5. iOS Engineering Agent

Owns React Native/Expo implementation, native builds, local SQLite, notifications, RevenueCat, Supabase, and App Store build readiness.

Use for:

- App implementation
- Xcode build fixes
- RevenueCat purchases
- Supabase sync
- Offline-first data flows
- Exports and local notifications

Rules:

- Preserve free core logging.
- Keep baby care data separate from purchase state.
- Do not send baby logs to third parties unless explicitly designed and disclosed.
- Verify with `npm run export:ios`, `npm run doctor`, and Xcode build when native code or dependencies change.

Outputs:

- Implementation summary
- Files changed
- Verification results
- Known limitations

### 6. Data & Backend Agent

Owns schemas, sync, analytics definitions, exports, privacy boundaries, and future caregiver sharing.

Use for:

- SQLite schema
- Supabase schema/RLS
- Sync conflict rules
- Export formats
- Trend calculations
- Event taxonomy

Rules:

- Local-first is the baseline.
- RLS must be enabled for any remote baby-data table.
- Never place service-role keys in the app.
- Caregiver sharing must use explicit family/invite/role models.

Outputs:

- Data model
- Migration/schema
- Access rules
- Edge cases and privacy risks

### 7. Growth & Monetization Agent

Owns business model, pricing, packaging, retention loops, lifecycle messaging, and conversion experiments.

Use for:

- Subscription packaging
- Paywall copy
- Trial strategy
- Activation metrics
- Retention features
- App Store positioning

Rules:

- No dark patterns.
- No fear-based monetization.
- Never paywall urgent safety guidance or raw user data.
- Paid value should come from convenience, personalization, reports, sharing, and advanced insights.

Outputs:

- Offer design
- Pricing recommendation
- Paywall placements
- Metrics and experiment plan

### 8. QA & Release Agent

Owns testing, release criteria, App Store review risk, privacy labels, accessibility, and regression checks.

Use for:

- Release readiness
- TestFlight checklist
- App Store metadata review
- Privacy policy review
- Accessibility audits
- Regression testing

Outputs:

- Test matrix
- Release blockers
- App Store risks
- Verification summary

## Standard Workflow

1. PM Orchestrator triages the task.
2. PM assigns specialist agents.
3. Research/Discovery/Design/Data agents resolve ambiguity before implementation.
4. iOS Engineering implements only after acceptance criteria are clear.
5. QA & Release verifies the result.
6. PM synthesizes final status and updates agent rules if needed.

## Failure Improvement Loop

When a failure happens:

1. Name the failed behavior.
2. Identify which agent should have prevented it.
3. Add or update a rule in `AGENTS.md` or a playbook.
4. Re-run the task or verification.
5. Record the lesson in the decision log.

Examples:

- If a build fails because a library is incompatible with Hermes, update iOS Engineering dependency rules.
- If content sounds medical, update Research and Design copy rules.
- If a paywall blocks core logging, update Growth & Monetization rules.
- If sync exposes data across accounts, update Data & Backend RLS rules.

## Current Business Priorities

1. Make the iOS app stable on simulator and real device.
2. Keep core tracking free and excellent.
3. Finish Supabase sync safely before caregiver sharing.
4. Finish RevenueCat setup for Baby Tracker Plus.
5. Build first-year insights and pediatrician prep into clear paid value.
6. Prepare TestFlight and App Store launch assets.

## Definition Of Done

A task is done only when:

- The user-facing behavior is implemented or the plan is decision-complete.
- Safety/privacy implications are handled.
- App Store implications are noted when relevant.
- Tests/builds/checks are run or the reason they could not run is stated.
- Any new recurring failure mode is captured in agent instructions.
