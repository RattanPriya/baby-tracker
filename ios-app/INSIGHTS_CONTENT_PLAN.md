# Baby Tracker Insights Content Plan

## Product Intent

Insights should make Baby Tracker feel like a calm daily companion, not a medical authority. Guidance is age-aware, original, non-diagnostic, and designed to help parents notice patterns, prepare for visits, and coordinate caregiver handoffs.

## Implemented MVP

- Local structured insight content in `src/insights.js`
- Detailed week-by-week cards for weeks 1-8
- Scalable first-year coverage for weeks 1-52 through age-phase guidance
- Personalized notes based on today's feeds, diapers, sleep, and recent logging days
- Calm badges that reward logging consistency and handoff readiness
- Prepared parent checklist for each week
- Source labels and safety language in the UI

## Content Schema

Each weekly insight includes:

- `week`
- `title`
- `summary`
- `feeding`
- `sleep`
- `growth`
- `tryToday`
- `checklist`
- `tags`
- `sourceIds`

This can later move to remote content without changing the UI contract.

## Source-Informed Guidance

The app uses these sources as guardrails and rewrites guidance in original language:

- AAP newborn visit guidance: newborn feeding, diaper output, vitamin D, visit preparation
- AAP breastfeeding guidance: responsive feeding and common breastfeeding support needs
- AAP safe sleep guidance: back sleeping, own sleep space, firm flat surface, no loose bedding
- HealthyChildren infant feeding guidance: feeding frequency, hunger/fullness cues, diaper clues
- CDC developmental milestones: milestone observation without pressure
- CDC infant and toddler nutrition: solids around 6 months, readiness cues, textures, cup practice
- CDC safe sleep reminders: reinforces AAP safe sleep guidance

## Safety Rules

- Do not diagnose or imply treatment.
- Do not promise sleep outcomes.
- Do not shame feeding choices.
- Do not gamify baby performance or milestones.
- Always frame development as variable.
- Escalate concerns to pediatrician or emergency services.
- Avoid copied wording from books, apps, articles, or websites.

## Expansion Plan

1. Replace phase-generated weeks 9-52 with fully authored weekly cards.
2. Add topic filters: Feeding, Sleep, Milestones, Safety, Parent Support, Pediatrician Prep.
3. Add saved insights.
4. Add caregiver handoff checklist completion.
5. Add pediatrician report sections that pull insight-relevant questions from logs.
6. Add postpartum parent wellbeing insights as a separate, opt-in surface.
