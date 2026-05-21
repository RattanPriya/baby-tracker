import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { buildInsightPlan, insightSources, weeklyInsights } from './src/insights';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const actions = [
  { type: 'nursing', label: 'Nursing', detail: 'Left/right or total minutes', color: '#2F6F73' },
  { type: 'bottle', label: 'Bottle', detail: 'Milk or formula amount', color: '#5D6FB4' },
  { type: 'sleep', label: 'Sleep', detail: 'Nap or overnight stretch', color: '#42516F' },
  { type: 'diaper', label: 'Diaper', detail: 'Wet, dirty, or both', color: '#AA6C39' },
  { type: 'pump', label: 'Pump', detail: 'Output and side notes', color: '#8B5D86' },
  { type: 'medicine', label: 'Medicine', detail: 'Dose, vitamin, or symptom', color: '#B14F4A' },
  { type: 'growth', label: 'Growth', detail: 'Weight, length, head size', color: '#4D8061' },
  { type: 'activity', label: 'Activity', detail: 'Tummy time, bath, walk', color: '#C07843' },
];

const defaultReminderRows = [
  { id: 'vitamin-d', label: 'Vitamin D', cadence: 'Daily at 9:00 AM' },
  { id: 'pediatrician', label: 'Pediatric visit', cadence: 'Manual reminder' },
];

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function actionFor(type) {
  return actions.find((item) => item.type === type) || actions[0];
}

function daysOld(birthDate, selectedDate) {
  const birth = new Date(`${birthDate}T12:00:00`);
  const selected = new Date(`${selectedDate}T12:00:00`);
  return Math.max(0, Math.round((selected - birth) / 86400000));
}

function dateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

async function initializeDatabase(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS babies (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      amount TEXT,
      detail TEXT,
      event_date TEXT NOT NULL,
      event_time TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      ended_at TEXT,
      timezone TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (baby_id) REFERENCES babies(id)
    );
    CREATE INDEX IF NOT EXISTS events_baby_date_idx ON events (baby_id, event_date, deleted_at);
    CREATE INDEX IF NOT EXISTS events_baby_type_idx ON events (baby_id, type, deleted_at);
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL,
      label TEXT NOT NULL,
      cadence TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      notification_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (baby_id) REFERENCES babies(id)
    );
  `);
}

async function seedIfNeeded(db) {
  const baby = await db.getFirstAsync('SELECT * FROM babies WHERE archived_at IS NULL ORDER BY created_at LIMIT 1');
  if (baby) return baby;

  const id = makeId('baby');
  const timestamp = nowIso();
  await db.runAsync(
    'INSERT INTO babies (id, name, birth_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    id,
    'Baby',
    todayIsoDate(),
    timestamp,
    timestamp,
  );

  for (const reminder of defaultReminderRows) {
    await db.runAsync(
      'INSERT INTO reminders (id, baby_id, label, cadence, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
      reminder.id,
      id,
      reminder.label,
      reminder.cadence,
      timestamp,
      timestamp,
    );
  }

  return db.getFirstAsync('SELECT * FROM babies WHERE id = ?', id);
}

function rowToBaby(row) {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birth_date,
  };
}

function rowToEvent(row) {
  return {
    id: row.id,
    babyId: row.baby_id,
    type: row.type,
    label: row.label,
    amount: row.amount || '',
    detail: row.detail || '',
    date: row.event_date,
    time: row.event_time,
    occurredAt: row.occurred_at,
    endedAt: row.ended_at,
  };
}

function rowToReminder(row) {
  return {
    id: row.id,
    babyId: row.baby_id,
    label: row.label,
    cadence: row.cadence,
    enabled: Boolean(row.enabled),
    notificationId: row.notification_id,
  };
}

function escapeCsv(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(baby, events) {
  const rows = [
    ['event_id', 'baby_id', 'baby_name', 'event_type', 'date', 'time', 'amount', 'detail', 'occurred_at_utc'].map(escapeCsv).join(','),
    ...events.map((event) => [
      event.id,
      baby.id,
      baby.name,
      event.type,
      event.date,
      event.time,
      event.amount,
      event.detail,
      event.occurredAt,
    ].map(escapeCsv).join(',')),
  ];
  return rows.join('\n');
}

function buildPdfHtml(baby, events, summary) {
  const rows = events.map((event) => `
    <tr>
      <td>${event.date}</td>
      <td>${event.time}</td>
      <td>${event.label}</td>
      <td>${event.amount || ''}</td>
      <td>${event.detail || ''}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #202D35; }
          h1 { margin-bottom: 4px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 20px 0; }
          .card { border: 1px solid #d8e2df; border-radius: 10px; padding: 12px; }
          .value { font-size: 28px; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border-bottom: 1px solid #d8e2df; padding: 8px; text-align: left; font-size: 12px; }
          th { color: #2F6F73; }
          .note { margin-top: 24px; font-size: 12px; color: #65747A; }
        </style>
      </head>
      <body>
        <h1>${baby.name} care summary</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        <div class="summary">
          <div class="card"><div class="value">${summary.feeds}</div><div>Feeds today</div></div>
          <div class="card"><div class="value">${summary.diapers}</div><div>Diapers today</div></div>
          <div class="card"><div class="value">${summary.sleep}</div><div>Sleep logs today</div></div>
          <div class="card"><div class="value">${summary.meds}</div><div>Medicine logs today</div></div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Amount</th><th>Detail</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="note">This is a personal care log. It does not diagnose, treat, or replace professional medical advice.</p>
      </body>
    </html>
  `;
}

export default function App() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const theme = dark ? darkTheme : lightTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dbRef = useRef(null);

  const [baby, setBaby] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [events, setEvents] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [activeType, setActiveType] = useState('nursing');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      try {
        const db = await SQLite.openDatabaseAsync('baby-tracker.db');
        dbRef.current = db;
        await initializeDatabase(db);
        const seededBaby = await seedIfNeeded(db);
        if (!mounted) return;
        await loadData(seededBaby.id);
      } catch (error) {
        Alert.alert('Could not open app data', String(error?.message || error));
      } finally {
        if (mounted) setLoaded(true);
      }
    }
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadData(babyId = baby?.id) {
    const db = dbRef.current;
    if (!db) return;
    const babyRow = await db.getFirstAsync('SELECT * FROM babies WHERE id = ?', babyId);
    const eventRows = await db.getAllAsync(
      'SELECT * FROM events WHERE baby_id = ? AND deleted_at IS NULL ORDER BY occurred_at DESC',
      babyId,
    );
    const reminderRows = await db.getAllAsync(
      'SELECT * FROM reminders WHERE baby_id = ? AND deleted_at IS NULL ORDER BY created_at ASC',
      babyId,
    );
    setBaby(rowToBaby(babyRow));
    setEvents(eventRows.map(rowToEvent));
    setReminders(reminderRows.map(rowToReminder));
  }

  const dayEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate],
  );

  const summary = useMemo(() => {
    const count = (types) => dayEvents.filter((event) => types.includes(event.type)).length;
    const last = (types) => dayEvents.find((event) => types.includes(event.type));
    return {
      feeds: count(['nursing', 'bottle']),
      diapers: count(['diaper']),
      sleep: count(['sleep']),
      meds: count(['medicine']),
      lastFeed: last(['nursing', 'bottle']),
      lastDiaper: last(['diaper']),
      lastSleep: last(['sleep']),
    };
  }, [dayEvents]);

  const weeklyEvents = useMemo(() => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    return events.filter((event) => {
      const eventDate = new Date(`${event.date}T12:00:00`);
      const diff = (selected - eventDate) / 86400000;
      return diff >= 0 && diff < 7;
    });
  }, [events, selectedDate]);

  const insightPlan = useMemo(() => {
    if (!baby) return null;
    return buildInsightPlan({
      ageDays: daysOld(baby.birthDate, selectedDate),
      dayEvents,
      weeklyEvents,
      summary,
    });
  }, [baby, dayEvents, selectedDate, summary, weeklyEvents]);

  async function updateBaby(field, value) {
    if (!baby) return;
    const nextBaby = { ...baby, [field]: value };
    setBaby(nextBaby);
    const db = dbRef.current;
    if (!db) return;
    const column = field === 'birthDate' ? 'birth_date' : 'name';
    await db.runAsync(`UPDATE babies SET ${column} = ?, updated_at = ? WHERE id = ?`, value, nowIso(), baby.id);
  }

  async function addEvent(type = activeType, preset = '') {
    const db = dbRef.current;
    if (!db || !baby) return;
    const action = actionFor(type);
    const timestamp = nowIso();
    const event = {
      id: makeId('event'),
      type,
      label: action.label,
      amount: amount.trim(),
      detail: [preset, note.trim()].filter(Boolean).join(' - ') || action.detail,
      date: selectedDate,
      time: nowTime(),
      occurredAt: timestamp,
    };

    await db.runAsync(
      `INSERT INTO events
        (id, baby_id, type, label, amount, detail, event_date, event_time, occurred_at, timezone, payload_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      event.id,
      baby.id,
      event.type,
      event.label,
      event.amount,
      event.detail,
      event.date,
      event.time,
      event.occurredAt,
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
      JSON.stringify({ amount: event.amount, detail: event.detail }),
      timestamp,
      timestamp,
    );
    setAmount('');
    setNote('');
    await loadData(baby.id);
  }

  async function deleteEvent(id) {
    const db = dbRef.current;
    if (!db || !baby) return;
    await db.runAsync('UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ?', nowIso(), nowIso(), id);
    await loadData(baby.id);
  }

  function confirmDeleteEvent(event) {
    Alert.alert('Delete log?', `${event.label} at ${event.time}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(event.id) },
    ]);
  }

  function moveDay(delta) {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + delta);
    setSelectedDate(date.toISOString().slice(0, 10));
  }

  async function toggleReminder(reminder) {
    const db = dbRef.current;
    if (!db || !baby) return;

    if (reminder.enabled) {
      if (reminder.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      }
      await db.runAsync(
        'UPDATE reminders SET enabled = 0, notification_id = NULL, updated_at = ? WHERE id = ?',
        nowIso(),
        reminder.id,
      );
      await loadData(baby.id);
      return;
    }

    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Notifications are off', 'You can still use Baby Tracker. Enable notifications in Settings to receive reminders.');
      return;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.label,
        body: `Reminder you created in Baby Tracker: ${reminder.label}`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 },
    });

    await db.runAsync(
      'UPDATE reminders SET enabled = 1, notification_id = ?, updated_at = ? WHERE id = ?',
      notificationId,
      nowIso(),
      reminder.id,
    );
    await loadData(baby.id);
  }

  async function exportCsv() {
    if (!baby) return;
    const csv = buildCsv(baby, events);
    const uri = `${FileSystem.documentDirectory}baby-tracker-${baby.name.replace(/\s+/g, '-')}.csv`;
    await FileSystem.writeAsStringAsync(uri, csv);
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export baby logs' });
  }

  async function exportPdf() {
    if (!baby) return;
    const html = buildPdfHtml(baby, dayEvents, summary);
    const result = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Export care summary' });
  }

  function confirmDeleteAllData() {
    Alert.alert('Delete all app data?', 'This removes baby profile, logs, and reminders from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all',
        style: 'destructive',
        onPress: async () => {
          const db = dbRef.current;
          if (!db) return;
          await Notifications.cancelAllScheduledNotificationsAsync();
          await db.execAsync('DELETE FROM events; DELETE FROM reminders; DELETE FROM babies;');
          const seededBaby = await seedIfNeeded(db);
          setSelectedDate(todayIsoDate());
          await loadData(seededBaby.id);
        },
      },
    ]);
  }

  function trend(types) {
    return weeklyEvents.filter((event) => types.includes(event.type)).length;
  }

  if (!loaded || !baby) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingText}>Opening Baby Tracker...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const age = daysOld(baby.birthDate, selectedDate);
  const cue = summary.lastFeed
    ? `Last feed was ${summary.lastFeed.time}. Watch for rooting, hands to mouth, or stirring.`
    : 'Log the first feed when baby cues or after your clinician-recommended interval.';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Baby tracker</Text>
          <Text style={styles.title}>{baby.name}'s day</Text>
          <Text style={styles.subtitle}>{dateLabel(selectedDate)} - day {age + 1}</Text>
          <View style={styles.dayControls}>
            <Pressable accessibilityLabel="Previous day" style={styles.dayButton} onPress={() => moveDay(-1)}>
              <Text style={styles.dayButtonText}>-</Text>
            </Pressable>
            <Text style={styles.agePill}>{age}d old</Text>
            <Pressable accessibilityLabel="Next day" style={styles.dayButton} onPress={() => moveDay(1)}>
              <Text style={styles.dayButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.profileRow}>
          <Field label="Baby" value={baby.name} onChangeText={(value) => updateBaby('name', value)} styles={styles} />
          <Field label="Birth date" value={baby.birthDate} onChangeText={(value) => updateBaby('birthDate', value)} styles={styles} />
        </View>

        <View style={styles.summaryGrid}>
          <Stat label="Feeds" value={summary.feeds} sub={summary.lastFeed ? `Last ${summary.lastFeed.time}` : 'None yet'} styles={styles} />
          <Stat label="Diapers" value={summary.diapers} sub={summary.lastDiaper ? `Last ${summary.lastDiaper.time}` : 'None yet'} styles={styles} />
          <Stat label="Sleep" value={summary.sleep} sub={summary.lastSleep ? `Last ${summary.lastSleep.time}` : 'None yet'} styles={styles} />
          <Stat label="Meds" value={summary.meds} sub="Doses logged" styles={styles} />
        </View>

        {insightPlan ? (
          <Section eyebrow="Insights" title={`Week ${insightPlan.week}: what to expect`} styles={styles}>
            <InsightHero insightPlan={insightPlan} styles={styles} />
            <View style={styles.insightGrid}>
              <InsightCard label="Feeding" text={insightPlan.insight.feeding} styles={styles} />
              <InsightCard label="Sleep" text={insightPlan.insight.sleep} styles={styles} />
              <InsightCard label="Growth" text={insightPlan.insight.growth} styles={styles} />
              <InsightCard label="Try today" text={insightPlan.insight.tryToday} styles={styles} highlight />
            </View>
            <View style={styles.personalizedCard}>
              <Text style={styles.detailTitle}>Based on today's logs</Text>
              {insightPlan.personalized.map((item) => (
                <Text key={item} style={styles.personalizedText}>- {item}</Text>
              ))}
            </View>
            <Checklist items={insightPlan.insight.checklist} styles={styles} />
            <BadgeRow badges={insightPlan.badges} styles={styles} />
            <Text style={styles.safety}>
              This app does not replace medical advice. Contact your pediatrician or emergency services for urgent concerns.
            </Text>
          </Section>
        ) : null}

        <Section eyebrow="One-tap logging" title="What just happened?" styles={styles}>
          <View style={styles.actionGrid}>
            {actions.map((action) => (
              <Pressable
                accessibilityLabel={`Log ${action.label}`}
                key={action.type}
                onPress={() => {
                  setActiveType(action.type);
                  addEvent(action.type);
                }}
                style={[styles.action, activeType === action.type && styles.activeAction, { borderLeftColor: action.color }]}
              >
                <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
                <Text style={styles.actionDetail}>{action.detail}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Add detail to next log</Text>
            <TextInput
              accessibilityLabel="Amount or duration"
              placeholder="Amount, duration, side..."
              placeholderTextColor={theme.muted}
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Optional note"
              placeholder="Optional note..."
              placeholderTextColor={theme.muted}
              value={note}
              onChangeText={setNote}
              style={styles.input}
            />
            <Pressable accessibilityLabel="Add detailed log" style={styles.primaryButton} onPress={() => addEvent()}>
              <Text style={styles.primaryButtonText}>Add detailed log</Text>
            </Pressable>
            <View style={styles.presetRow}>
              {[
                ['diaper', 'Wet'],
                ['diaper', 'Dirty'],
                ['nursing', 'Left side'],
                ['nursing', 'Right side'],
                ['activity', 'Tummy time'],
              ].map(([type, label]) => (
                <Pressable key={`${type}-${label}`} style={styles.presetButton} onPress={() => addEvent(type, label)}>
                  <Text style={styles.presetText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Section>

        <Section eyebrow="Next up" title="Care cue" styles={styles}>
          <Text style={styles.cue}>{cue}</Text>
          <Text style={styles.safety}>
            This app is for personal logging only. Contact your pediatrician or local emergency services with medical concerns.
          </Text>
        </Section>

        <Section eyebrow="Timeline" title="Today's logs" styles={styles}>
          {dayEvents.length === 0 ? (
            <Text style={styles.empty}>No logs yet. Tap a button when baby feeds, sleeps, wakes, or needs a diaper.</Text>
          ) : (
            <FlatList
              data={dayEvents}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const action = actionFor(item.type);
                return (
                  <View style={styles.eventRow}>
                    <View style={[styles.eventMark, { backgroundColor: action.color }]} />
                    <View style={styles.eventCopy}>
                      <Text style={styles.eventTitle}>{item.label}</Text>
                      <Text style={styles.eventDetail}>{[item.amount, item.detail].filter(Boolean).join(' - ')}</Text>
                    </View>
                    <Text style={styles.eventTime}>{item.time}</Text>
                    <Pressable accessibilityLabel={`Delete ${item.label} log from ${item.time}`} onPress={() => confirmDeleteEvent(item)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </Section>

        <Section eyebrow="Patterns" title="Last 7 days" styles={styles}>
          <Trend label="Feeds" value={trend(['nursing', 'bottle'])} styles={styles} />
          <Trend label="Diapers" value={trend(['diaper'])} styles={styles} />
          <Trend label="Sleep logs" value={trend(['sleep'])} styles={styles} />
          <Trend label="Growth notes" value={trend(['growth'])} styles={styles} />
        </Section>

        {insightPlan ? (
          <Section eyebrow="Library" title="First-year guidance plan" styles={styles}>
            <Text style={styles.empty}>
              The app now has local weekly insight coverage for weeks 1-52, with detailed newborn content for weeks 1-8 and expandable guidance phases through the first birthday.
            </Text>
            <View style={styles.libraryGrid}>
              <LibraryStat label="Weeks" value={weeklyInsights.length} styles={styles} />
              <LibraryStat label="Sources" value={insightSources.length} styles={styles} />
            </View>
            <Text style={styles.sourceTitle}>Source-informed, original wording</Text>
            {insightPlan.sourceLabels.map((label) => (
              <Text key={label} style={styles.sourceText}>{label}</Text>
            ))}
          </Section>
        ) : null}

        <Section eyebrow="Reminders" title="Local notifications" styles={styles}>
          {reminders.map((reminder) => (
            <Pressable key={reminder.id} style={styles.reminderRow} onPress={() => toggleReminder(reminder)}>
              <View>
                <Text style={styles.reminderTitle}>{reminder.label}</Text>
                <Text style={styles.reminderSub}>{reminder.cadence}</Text>
              </View>
              <Text style={[styles.reminderState, reminder.enabled && styles.reminderOn]}>
                {reminder.enabled ? 'On' : 'Off'}
              </Text>
            </Pressable>
          ))}
        </Section>

        <Section eyebrow="Privacy" title="Export or erase" styles={styles}>
          <Text style={styles.empty}>Core data is stored locally on this device. Exports happen only when you choose to share a file.</Text>
          <View style={styles.utilityRow}>
            <Pressable style={styles.secondaryButton} onPress={exportCsv}>
              <Text style={styles.secondaryButtonText}>Export CSV</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={exportPdf}>
              <Text style={styles.secondaryButtonText}>Export PDF</Text>
            </Pressable>
          </View>
          <Pressable style={styles.destructiveButton} onPress={confirmDeleteAllData}>
            <Text style={styles.destructiveText}>Delete all data</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, styles }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} />
    </View>
  );
}

function Section({ eyebrow, title, children, styles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.eyebrowDark}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Stat({ label, value, sub, styles }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function InsightHero({ insightPlan, styles }) {
  return (
    <View style={styles.insightHero}>
      <Text style={styles.insightWeek}>Week {insightPlan.week}</Text>
      <Text style={styles.insightTitle}>{insightPlan.insight.title}</Text>
      <Text style={styles.insightSummary}>{insightPlan.insight.summary}</Text>
    </View>
  );
}

function InsightCard({ label, text, styles, highlight = false }) {
  return (
    <View style={[styles.insightCard, highlight && styles.insightCardHighlight]}>
      <Text style={styles.insightCardLabel}>{label}</Text>
      <Text style={styles.insightCardText}>{text}</Text>
    </View>
  );
}

function Checklist({ items, styles }) {
  return (
    <View style={styles.checklist}>
      <Text style={styles.detailTitle}>Prepared parent checklist</Text>
      {items.map((item) => (
        <View key={item} style={styles.checkItem}>
          <View style={styles.checkDot} />
          <Text style={styles.checkText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function BadgeRow({ badges, styles }) {
  if (badges.length === 0) {
    return (
      <View style={styles.badgeEmpty}>
        <Text style={styles.badgeEmptyText}>Log a few care moments today to unlock calm progress badges.</Text>
      </View>
    );
  }

  return (
    <View style={styles.badgeRow}>
      {badges.map((badge) => (
        <View key={badge.id} style={styles.badge}>
          <Text style={styles.badgeLabel}>{badge.label}</Text>
          <Text style={styles.badgeDetail}>{badge.detail}</Text>
        </View>
      ))}
    </View>
  );
}

function LibraryStat({ label, value, styles }) {
  return (
    <View style={styles.libraryStat}>
      <Text style={styles.libraryValue}>{value}</Text>
      <Text style={styles.libraryLabel}>{label}</Text>
    </View>
  );
}

function Trend({ label, value, styles }) {
  const width = `${Math.min(100, value * 10 + 8)}%`;
  return (
    <View style={styles.trend}>
      <View style={styles.trendHeader}>
        <Text style={styles.trendLabel}>{label}</Text>
        <Text style={styles.trendValue}>{value}</Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width }]} />
      </View>
    </View>
  );
}

const lightTheme = {
  background: '#F6F8F4',
  card: '#FFFFFF',
  cardSoft: '#F0F6F3',
  text: '#202D35',
  muted: '#65747A',
  border: 'rgba(73, 88, 92, 0.14)',
  primary: '#2F6F73',
  warning: '#7B4633',
  warningBg: '#FFF0D9',
  danger: '#B14F4A',
};

const darkTheme = {
  background: '#101719',
  card: '#182225',
  cardSoft: '#1F2C2E',
  text: '#F4F7F5',
  muted: '#A9B7B9',
  border: 'rgba(221, 231, 228, 0.14)',
  primary: '#86C8C4',
  warning: '#FFD2A3',
  warningBg: '#332416',
  danger: '#FF938C',
};

function createStyles(theme) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
    },
    loadingText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '800',
    },
    screen: {
      padding: 16,
      paddingBottom: 40,
      gap: 14,
    },
    hero: {
      padding: 22,
      borderRadius: 18,
      backgroundColor: theme.primary,
      gap: 8,
    },
    eyebrow: {
      color: 'rgba(255, 255, 255, 0.72)',
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    title: {
      color: '#FFFFFF',
      fontSize: 40,
      fontWeight: '900',
      letterSpacing: 0,
    },
    subtitle: {
      color: 'rgba(255, 255, 255, 0.84)',
      fontSize: 16,
      lineHeight: 22,
    },
    dayControls: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    dayButton: {
      minWidth: 48,
      minHeight: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
    },
    dayButtonText: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
    },
    agePill: {
      minHeight: 48,
      paddingHorizontal: 18,
      borderRadius: 14,
      overflow: 'hidden',
      color: '#FFFFFF',
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
      textAlignVertical: 'center',
      fontWeight: '900',
    },
    profileRow: {
      flexDirection: 'row',
      gap: 10,
    },
    field: {
      flex: 1,
      gap: 6,
    },
    fieldLabel: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 48,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      color: theme.text,
      backgroundColor: theme.card,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    stat: {
      flexGrow: 1,
      flexBasis: '47%',
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    statValue: {
      color: theme.text,
      fontSize: 28,
      fontWeight: '900',
    },
    statLabel: {
      color: theme.text,
      fontWeight: '900',
    },
    statSub: {
      color: theme.muted,
      marginTop: 3,
    },
    insightHero: {
      padding: 14,
      borderRadius: 14,
      backgroundColor: theme.cardSoft,
      gap: 7,
    },
    insightWeek: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    insightTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '900',
      lineHeight: 23,
    },
    insightSummary: {
      color: theme.muted,
      lineHeight: 21,
    },
    insightGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    insightCard: {
      flexGrow: 1,
      flexBasis: '47%',
      minHeight: 124,
      padding: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      gap: 7,
    },
    insightCardHighlight: {
      backgroundColor: theme.cardSoft,
      borderColor: theme.primary,
    },
    insightCardLabel: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    insightCardText: {
      color: theme.text,
      lineHeight: 20,
    },
    personalizedCard: {
      padding: 13,
      borderRadius: 14,
      backgroundColor: theme.cardSoft,
      gap: 8,
    },
    personalizedText: {
      color: theme.text,
      lineHeight: 20,
    },
    checklist: {
      padding: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 9,
    },
    checkItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
    },
    checkDot: {
      width: 18,
      height: 18,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: theme.primary,
      marginTop: 1,
    },
    checkText: {
      flex: 1,
      color: theme.text,
      lineHeight: 20,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    badge: {
      flexGrow: 1,
      flexBasis: '47%',
      padding: 12,
      borderRadius: 14,
      backgroundColor: theme.primary,
      gap: 4,
    },
    badgeLabel: {
      color: '#FFFFFF',
      fontWeight: '900',
    },
    badgeDetail: {
      color: 'rgba(255, 255, 255, 0.82)',
      lineHeight: 18,
    },
    badgeEmpty: {
      padding: 13,
      borderRadius: 14,
      backgroundColor: theme.cardSoft,
    },
    badgeEmptyText: {
      color: theme.muted,
      lineHeight: 20,
    },
    libraryGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    libraryStat: {
      flex: 1,
      padding: 13,
      borderRadius: 14,
      backgroundColor: theme.cardSoft,
      borderWidth: 1,
      borderColor: theme.border,
    },
    libraryValue: {
      color: theme.text,
      fontSize: 26,
      fontWeight: '900',
    },
    libraryLabel: {
      color: theme.muted,
      fontWeight: '900',
    },
    sourceTitle: {
      color: theme.text,
      fontWeight: '900',
    },
    sourceText: {
      color: theme.muted,
      lineHeight: 20,
    },
    section: {
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      gap: 12,
    },
    eyebrowDark: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: '900',
      marginTop: -8,
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    action: {
      flexGrow: 1,
      flexBasis: '47%',
      minHeight: 86,
      padding: 13,
      borderLeftWidth: 5,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.cardSoft,
      justifyContent: 'space-between',
    },
    activeAction: {
      borderColor: theme.primary,
    },
    actionLabel: {
      fontSize: 16,
      fontWeight: '900',
    },
    actionDetail: {
      color: theme.muted,
      lineHeight: 18,
    },
    detailCard: {
      padding: 13,
      gap: 10,
      borderRadius: 14,
      backgroundColor: theme.cardSoft,
    },
    detailTitle: {
      color: theme.text,
      fontWeight: '900',
    },
    primaryButton: {
      minHeight: 50,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontWeight: '900',
    },
    presetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetButton: {
      minHeight: 42,
      paddingHorizontal: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    presetText: {
      color: theme.primary,
      fontWeight: '900',
    },
    cue: {
      color: theme.text,
      fontSize: 16,
      lineHeight: 23,
    },
    safety: {
      padding: 12,
      borderRadius: 14,
      overflow: 'hidden',
      color: theme.warning,
      backgroundColor: theme.warningBg,
      lineHeight: 21,
    },
    empty: {
      color: theme.muted,
      lineHeight: 22,
    },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    eventMark: {
      width: 12,
      height: 42,
      borderRadius: 999,
    },
    eventCopy: {
      flex: 1,
    },
    eventTitle: {
      color: theme.text,
      fontWeight: '900',
    },
    eventDetail: {
      color: theme.muted,
      lineHeight: 19,
    },
    eventTime: {
      color: theme.text,
      fontWeight: '900',
    },
    deleteText: {
      color: theme.danger,
      fontWeight: '800',
    },
    trend: {
      gap: 7,
    },
    trendHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    trendLabel: {
      color: theme.text,
      fontWeight: '900',
    },
    trendValue: {
      color: theme.muted,
      fontWeight: '900',
    },
    bar: {
      height: 10,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: theme.cardSoft,
    },
    barFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: theme.primary,
    },
    reminderRow: {
      minHeight: 58,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    reminderTitle: {
      color: theme.text,
      fontWeight: '900',
    },
    reminderSub: {
      color: theme.muted,
      marginTop: 2,
    },
    reminderState: {
      color: theme.muted,
      fontWeight: '900',
    },
    reminderOn: {
      color: theme.primary,
    },
    utilityRow: {
      flexDirection: 'row',
      gap: 10,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.cardSoft,
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryButtonText: {
      color: theme.primary,
      fontWeight: '900',
    },
    destructiveButton: {
      minHeight: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.danger,
    },
    destructiveText: {
      color: theme.danger,
      fontWeight: '900',
    },
  });
}
