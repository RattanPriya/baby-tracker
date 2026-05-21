export const insightSources = [
  {
    id: 'aap-newborn-visit',
    label: 'AAP newborn visit guidance',
    url: 'https://www.aap.org/en/patient-care/newborn-infant-and-early-childhood-nutrition/newborn-and-infant-health-assessment-and-promotion/newborn-visit/',
  },
  {
    id: 'aap-breastfeeding',
    label: 'AAP breastfeeding guidance',
    url: 'https://www.aap.org/en/patient-care/newborn-and-infant-nutrition/newborn-and-infant-breastfeeding/',
  },
  {
    id: 'aap-safe-sleep',
    label: 'AAP safe sleep guidance',
    url: 'https://www.aap.org/en/patient-care/safe-sleep/',
  },
  {
    id: 'healthychildren-feeding',
    label: 'HealthyChildren infant feeding guidance',
    url: 'https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/How-Often-and-How-Much-Should-Your-Baby-Eat.aspx',
  },
  {
    id: 'cdc-milestones',
    label: 'CDC developmental milestones',
    url: 'https://www.cdc.gov/act-early/milestones/',
  },
  {
    id: 'cdc-solids',
    label: 'CDC first foods guidance',
    url: 'https://www.cdc.gov/infant-toddler-nutrition/foods-and-drinks/when-what-and-how-to-introduce-solid-foods.html',
  },
  {
    id: 'cdc-safe-sleep',
    label: 'CDC safe sleep reminders',
    url: 'https://www.cdc.gov/reproductive-health/features/babies-sleep.html',
  },
];

const detailedWeeks = [
  {
    week: 1,
    title: 'The first week is about feeding, diapers, warmth, and recovery',
    summary: 'Newborn days often feel irregular. Short awake times, frequent feeds, and lots of skin-to-skin or close holding are normal parts of settling in.',
    feeding: 'Many newborns feed often as milk supply and bottle volumes settle. Track feeds and wet/dirty diapers, and ask your clinician if baby is too sleepy to feed or output drops.',
    sleep: 'Sleep comes in short stretches. Use a firm, flat sleep surface, place baby on their back, and keep loose bedding out of the sleep space.',
    growth: 'Early weight checks matter because many babies lose some weight after birth and then start regaining. Your logs can help you answer feeding questions at visits.',
    tryToday: 'Log the next 3 feeds and diapers, then glance at the timeline before the next caregiver handoff.',
    checklist: ['Confirm pediatric follow-up timing', 'Keep a simple feed and diaper record', 'Put baby on their back for every sleep'],
    tags: ['newborn', 'feeding', 'safe-sleep', 'diapers'],
    sourceIds: ['aap-newborn-visit', 'aap-breastfeeding', 'aap-safe-sleep', 'healthychildren-feeding'],
  },
  {
    week: 2,
    title: 'Patterns may still be loose, but output and feeding rhythm tell a story',
    summary: 'This week is less about a schedule and more about learning cues: rooting, hands to mouth, stirring, relaxed hands after feeds, and diaper output.',
    feeding: 'Frequent feeding remains common. If bottle feeding, paced feeding and pauses can help baby notice fullness cues.',
    sleep: 'Day and night may still be mixed. Keep nights boring and dim, and keep sleep spaces consistent.',
    growth: 'Many families have a weight check around this period. Bring feeding, diaper, and any medicine/vitamin notes.',
    tryToday: 'Add one note to a feed: cue before feed, amount or duration, and how baby seemed afterward.',
    checklist: ['Notice hunger cues before crying', 'Review wet and dirty diaper pattern', 'Prepare questions for weight or feeding check'],
    tags: ['feeding-cues', 'output', 'weight-check'],
    sourceIds: ['aap-newborn-visit', 'healthychildren-feeding', 'aap-breastfeeding'],
  },
  {
    week: 3,
    title: 'Cluster feeding and evening fussiness can show up',
    summary: 'Some babies bunch feeds closer together during parts of the day. This can feel intense even when baby is doing well.',
    feeding: 'Evening clusters can be normal, but call your clinician if baby is hard to wake, has fewer wet diapers than expected, or feeding suddenly changes.',
    sleep: 'Sleep may still arrive in small blocks. A repeatable wind-down can be as simple as diaper, feed, burp, swaddle if appropriate, and back to sleep.',
    growth: 'Growth spurts are often noticed as more frequent feeds and a hungrier baby for a day or two.',
    tryToday: 'Use the timeline to see if fussiness follows long awake windows, missed burps, or closely spaced feeds.',
    checklist: ['Log cluster-feeding windows', 'Keep night feeds calm and dim', 'Share one clear handoff note with another caregiver'],
    tags: ['cluster-feeding', 'soothing', 'caregiver-handoff'],
    sourceIds: ['healthychildren-feeding', 'aap-safe-sleep', 'aap-breastfeeding'],
  },
  {
    week: 4,
    title: 'A tiny routine can help without forcing a schedule',
    summary: 'Baby is still very young. Gentle repetition around waking, feeding, diapering, and sleep can help parents feel oriented.',
    feeding: 'Feeds may slowly become more efficient for some babies, while others still need long or frequent sessions.',
    sleep: 'Expect variability. Safe sleep matters more than long stretches: back, own sleep space, firm surface, no loose items.',
    growth: 'Tummy time while awake and supervised can be brief. A minute or two at a time still counts.',
    tryToday: 'Try a 3-step reset once: fresh diaper, feed, then a short awake cuddle or tummy-time moment.',
    checklist: ['Review one-month visit questions', 'Log any vitamins or medicines', 'Try supervised tummy time while baby is awake'],
    tags: ['routine', 'tummy-time', 'one-month'],
    sourceIds: ['aap-safe-sleep', 'cdc-milestones', 'aap-newborn-visit'],
  },
  {
    week: 5,
    title: 'Baby may be more alert between feeds',
    summary: 'You may notice more looking around, brief eye contact, or small windows when baby is awake and calm.',
    feeding: 'Growth and appetite can change quickly. Feeding logs help separate one unusual day from a new pattern.',
    sleep: 'Watch for sleepy cues like looking away, yawning, or fussiness. Shorter awake windows often work better than waiting for overtired crying.',
    growth: 'Simple play is enough: faces, voice, contrast, and supervised floor time.',
    tryToday: 'Add one activity log for tummy time, a walk, or a bath so the day feels less like only feeds and diapers.',
    checklist: ['Notice sleepy cues', 'Track one awake activity', 'Keep sleep surface clear'],
    tags: ['alertness', 'sleep-cues', 'activity'],
    sourceIds: ['cdc-milestones', 'aap-safe-sleep', 'healthychildren-feeding'],
  },
  {
    week: 6,
    title: 'This is a common confidence checkpoint for parents',
    summary: 'Around this period many families reassess feeding, sleep, pumping, caregiver support, and parent recovery.',
    feeding: 'If breastfeeding or pumping, supply questions often come up. Logs can help show frequency and timing when talking to lactation or pediatric care.',
    sleep: 'Some babies begin offering one slightly longer stretch; many do not. The goal is safe, responsive care, not a perfect schedule.',
    growth: 'Smiles and social attention may begin emerging soon, but timing varies.',
    tryToday: 'Use the last 7 days to write one question for the pediatrician or lactation support.',
    checklist: ['Review 7-day feeding pattern', 'Note one parent-support need', 'Keep clinician questions in one place'],
    tags: ['six-week', 'parent-check-in', 'feeding-support'],
    sourceIds: ['aap-breastfeeding', 'cdc-milestones', 'aap-safe-sleep'],
  },
  {
    week: 7,
    title: 'Rhythms start appearing, but babies still vary a lot',
    summary: 'You may see rough patterns in feeds, naps, and fussy windows. Treat patterns as clues, not rules.',
    feeding: 'Continue watching hunger and fullness cues. If bottle feeding, slow pacing can help avoid pressure to finish a bottle.',
    sleep: 'A simple bedtime sequence can start becoming familiar, even if sleep itself is still unpredictable.',
    growth: 'Baby may enjoy faces, voices, and being held upright while awake.',
    tryToday: 'Look at your 7-day feed count and choose one caregiver handoff detail to make easier tomorrow.',
    checklist: ['Notice one repeatable daily rhythm', 'Keep bottle or nursing notes nonjudgmental', 'Protect a safe sleep setup'],
    tags: ['patterns', 'handoff', 'sleep-routine'],
    sourceIds: ['healthychildren-feeding', 'cdc-milestones', 'aap-safe-sleep'],
  },
  {
    week: 8,
    title: 'Two-month milestones are a conversation, not a scorecard',
    summary: 'The two-month window often brings a well visit and vaccine questions. Milestone checklists can guide observation without pressuring baby.',
    feeding: 'Ask about vitamin D, feeding volumes, weight gain, spit-up, or stool changes if they are on your mind.',
    sleep: 'Keep back-sleep and clear sleep space habits steady, including naps.',
    growth: 'Many babies are starting to smile responsively, look at faces, or make sounds, but individual timing varies.',
    tryToday: 'Save a pediatrician-prep note from your logs: feeds, diapers, sleep, and the top 2 questions.',
    checklist: ['Prepare two-month visit questions', 'Review feeding and diaper summaries', 'Check milestone observations without pressure'],
    tags: ['two-month', 'milestones', 'visit-prep'],
    sourceIds: ['cdc-milestones', 'aap-newborn-visit', 'aap-safe-sleep'],
  },
];

const phaseGuidance = [
  {
    from: 9,
    to: 13,
    title: 'More social moments, still plenty of feeding and sleep variability',
    summary: 'Baby may spend more time looking, listening, and responding. Use logs to spot helpful rhythms without forcing a rigid schedule.',
    feeding: 'Breast milk or formula remains the nutrition base. Watch hunger and fullness cues rather than the clock alone.',
    sleep: 'Some naps may become easier to predict. Keep safe sleep habits steady for every sleep.',
    growth: 'Talking, faces, tummy time, and brief floor play support development during awake windows.',
    tryToday: 'Pick one calm awake activity to repeat after a feed: face time, song, book, or tummy time.',
    tags: ['social', 'awake-time', 'routine'],
  },
  {
    from: 14,
    to: 17,
    title: 'Hands, mouth, and curiosity become bigger parts of the day',
    summary: 'Baby may bring hands toward the mouth, watch movement, and enjoy more interaction.',
    feeding: 'Frequent feeding can still be normal. If appetite shifts sharply or wet diapers drop, contact your clinician.',
    sleep: 'Short naps and changing night stretches are common. Keep expectations flexible.',
    growth: 'Supervised tummy time and reaching games can fit into tiny windows.',
    tryToday: 'Log one play activity so the app reflects growth moments, not only care tasks.',
    tags: ['hands', 'play', 'curiosity'],
  },
  {
    from: 18,
    to: 21,
    title: 'Rolling signs and stronger head control may start to appear',
    summary: 'Development can arrive unevenly. Keep awake play supervised and sleep spaces free of loose items.',
    feeding: 'Breast milk or formula still carries nutrition. Solids are usually not needed yet unless your clinician advises otherwise.',
    sleep: 'If baby shows rolling signs, revisit swaddle safety with your pediatrician and follow current safe sleep guidance.',
    growth: 'Floor time, reaching, and looking both directions can support movement practice.',
    tryToday: 'Add a growth or activity note if baby practices rolling, reaching, or longer tummy time.',
    tags: ['rolling', 'movement', 'safe-sleep'],
  },
  {
    from: 22,
    to: 26,
    title: 'The solids conversation is getting closer',
    summary: 'Around 6 months, many babies become ready for foods beyond breast milk or formula. Readiness matters more than rushing.',
    feeding: 'Look for readiness cues such as good head control, sitting with support, and interest in food. Ask your clinician before starting if unsure.',
    sleep: 'New skills and appetite shifts can affect sleep. Use logs to look for patterns instead of assuming one cause.',
    growth: 'Tummy time, reaching, and supported sitting practice may become more active.',
    tryToday: 'Start a pediatrician question list about first foods, allergens, iron-rich foods, and choking safety.',
    tags: ['solids-readiness', 'six-months', 'supported-sitting'],
  },
  {
    from: 27,
    to: 34,
    title: 'First foods can be exploratory and slow',
    summary: 'Food learning is messy. Breast milk or formula remains important while baby practices tastes, textures, and sitting skills.',
    feeding: 'Offer developmentally appropriate foods when baby is ready. Introduce new foods patiently and avoid honey before 12 months.',
    sleep: 'More activity and new skills may shift nap timing. Keep sleep routines simple and safe.',
    growth: 'Reaching, transferring objects, sitting practice, and babbling often become more noticeable.',
    tryToday: 'If baby has started solids, log the food and any questions you want to ask at the next visit.',
    tags: ['first-foods', 'textures', 'food-learning'],
  },
  {
    from: 35,
    to: 43,
    title: 'Mobility, curiosity, and mealtime practice expand',
    summary: 'Baby may be more active and more opinionated. Tracking can help caregivers coordinate meals, naps, diapers, and medicines.',
    feeding: 'Solids gradually become more routine while breast milk or formula continues. Offer safe textures and avoid choking hazards.',
    sleep: 'Separation, teething, travel, or new skills can disrupt sleep. Keep the response calm and consistent.',
    growth: 'Crawling, scooting, pulling, or other movement experiments may appear at different times.',
    tryToday: 'Use caregiver handoff notes to capture last meal, last bottle or nursing, last diaper, and next likely nap.',
    tags: ['mobility', 'handoff', 'mealtime'],
  },
  {
    from: 44,
    to: 52,
    title: 'Approaching one year: routines become more family-shaped',
    summary: 'The first birthday approaches with more movement, communication, food practice, and caregiver routines.',
    feeding: 'Meals and snacks may become more predictable. Ask your clinician about transition questions, milk choices, cups, and allergens.',
    sleep: 'Sleep patterns may be more recognizable, though disruptions still happen. Keep safe sleep basics in place.',
    growth: 'Gestures, sounds, crawling, standing, cruising, or early steps vary widely. Milestones are prompts for conversation, not pressure.',
    tryToday: 'Create a one-year visit prep note with feeding, sleep, growth, medicines, and your biggest questions.',
    tags: ['one-year', 'routines', 'visit-prep'],
  },
];

function phaseForWeek(week) {
  return phaseGuidance.find((phase) => week >= phase.from && week <= phase.to) || phaseGuidance[phaseGuidance.length - 1];
}

export const weeklyInsights = Array.from({ length: 52 }, (_, index) => {
  const week = index + 1;
  const detailed = detailedWeeks.find((item) => item.week === week);
  if (detailed) return detailed;
  const phase = phaseForWeek(week);
  return {
    week,
    title: `Week ${week}: ${phase.title}`,
    summary: phase.summary,
    feeding: phase.feeding,
    sleep: phase.sleep,
    growth: phase.growth,
    tryToday: phase.tryToday,
    checklist: [
      'Log one care pattern that would help another caregiver',
      'Save one question for the next pediatric visit',
      'Keep sleep and feeding notes practical, not perfect',
    ],
    tags: phase.tags,
    sourceIds: ['cdc-milestones', 'cdc-solids', 'healthychildren-feeding', 'aap-safe-sleep'],
  };
});

function uniqueLoggedDays(events) {
  return new Set(events.map((event) => event.date)).size;
}

function countTypes(events, types) {
  return events.filter((event) => types.includes(event.type)).length;
}

function dateKey(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function buildInsightPlan({ ageDays, dayEvents, weeklyEvents, summary }) {
  const week = Math.min(52, Math.max(1, Math.floor(ageDays / 7) + 1));
  const insight = weeklyInsights[week - 1];
  const feedCount = countTypes(dayEvents, ['nursing', 'bottle']);
  const diaperCount = countTypes(dayEvents, ['diaper']);
  const sleepCount = countTypes(dayEvents, ['sleep']);
  const loggedDays = uniqueLoggedDays(weeklyEvents);
  const today = dateKey();
  const yesterday = dateKey(1);
  const hasToday = weeklyEvents.some((event) => event.date === today);
  const hasYesterday = weeklyEvents.some((event) => event.date === yesterday);
  const streak = hasToday ? (hasYesterday ? 2 : 1) : 0;

  const personalized = [
    feedCount > 0
      ? `You have ${feedCount} feed ${feedCount === 1 ? 'log' : 'logs'} today. ${summary.lastFeed ? `Last feed was ${summary.lastFeed.time}.` : ''}`
      : 'No feeds logged yet today. The first feed log gives the rest of the day context.',
    diaperCount > 0
      ? `${diaperCount} diaper ${diaperCount === 1 ? 'change is' : 'changes are'} logged today. Output patterns are useful at newborn visits.`
      : 'No diapers logged yet today. A quick diaper tap can make pediatrician questions easier later.',
    sleepCount > 0
      ? `${sleepCount} sleep ${sleepCount === 1 ? 'entry is' : 'entries are'} in the timeline. Use sleep logs as clues, not strict rules.`
      : 'No sleep logged yet today. Even short naps count when you are looking for patterns.',
  ];

  const badges = [
    loggedDays >= 3 && { id: 'steady-logger', label: 'Steady logger', detail: 'Logged care on 3+ days this week' },
    feedCount > 0 && diaperCount > 0 && { id: 'handoff-ready', label: 'Handoff ready', detail: 'Feeds and diapers are current today' },
    streak >= 2 && { id: 'daily-rhythm', label: 'Daily rhythm', detail: 'Logged yesterday and today' },
    countTypes(dayEvents, ['growth']) > 0 && { id: 'visit-prep', label: 'Visit prep', detail: 'Growth note saved' },
  ].filter(Boolean);

  return {
    week,
    insight,
    personalized,
    badges,
    sourceLabels: insight.sourceIds
      .map((id) => insightSources.find((source) => source.id === id)?.label)
      .filter(Boolean),
  };
}
