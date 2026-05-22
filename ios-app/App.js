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
  Linking,
  Modal,
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
import { EntitlementProvider, usePlusAccess } from './src/monetization';
import { isSupabaseConfigured, supabase } from './src/supabaseClient';
import { syncBabyTrackerData } from './src/sync';

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

function buildPediatricianPrepHtml(baby, events, summary, insightPlan) {
  const lastSevenDays = events.slice(0, 120);
  const rows = lastSevenDays.map((event) => `
    <tr>
      <td>${event.date}</td>
      <td>${event.time}</td>
      <td>${event.label}</td>
      <td>${event.amount || ''}</td>
      <td>${event.detail || ''}</td>
    </tr>
  `).join('');

  const questions = [
    insightPlan?.insight?.feeding ? 'Are feeding patterns and output on track for this age?' : null,
    insightPlan?.insight?.sleep ? 'Are sleep stretches and safe sleep setup appropriate for this stage?' : null,
    'Are there growth, vitamin, medicine, or diaper questions we should review?',
  ].filter(Boolean);

  return `
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #202D35; }
          h1 { margin-bottom: 4px; }
          h2 { color: #2F6F73; margin-top: 24px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 20px 0; }
          .card { border: 1px solid #d8e2df; border-radius: 10px; padding: 12px; }
          .value { font-size: 28px; font-weight: 800; }
          li { margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border-bottom: 1px solid #d8e2df; padding: 8px; text-align: left; font-size: 12px; }
          th { color: #2F6F73; }
          .note { margin-top: 24px; font-size: 12px; color: #65747A; }
        </style>
      </head>
      <body>
        <h1>${baby.name} pediatrician prep</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        <div class="summary">
          <div class="card"><div class="value">${summary.feeds}</div><div>Feeds today</div></div>
          <div class="card"><div class="value">${summary.diapers}</div><div>Diapers today</div></div>
          <div class="card"><div class="value">${summary.sleep}</div><div>Sleep logs today</div></div>
          <div class="card"><div class="value">${summary.meds}</div><div>Medicine logs today</div></div>
        </div>
        <h2>This week</h2>
        <p>${insightPlan?.insight?.summary || 'Use this report to review recent care logs and questions.'}</p>
        <h2>Questions to ask</h2>
        <ul>${questions.map((question) => `<li>${question}</li>`).join('')}</ul>
        <h2>Recent logs</h2>
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
  return (
    <EntitlementProvider>
      <BabyTrackerApp />
    </EntitlementProvider>
  );
}

function BabyTrackerApp() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const theme = dark ? darkTheme : lightTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dbRef = useRef(null);
  const plusAccess = usePlusAccess();

  const [baby, setBaby] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [events, setEvents] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [activeType, setActiveType] = useState('nursing');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');
  const [syncEmail, setSyncEmail] = useState('');
  const [syncPassword, setSyncPassword] = useState('');
  const [syncSession, setSyncSession] = useState(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState('');

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

  useEffect(() => {
    if (!supabase) return undefined;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSyncSession(data.session || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSyncSession(session || null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
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

  async function exportPediatricianPrep() {
    if (!baby) return;
    if (!plusAccess.isPlus) {
      setPaywallReason('Create a visit-ready report with recent logs, weekly context, and calm questions for your pediatrician.');
      return;
    }
    const html = buildPediatricianPrepHtml(baby, weeklyEvents, summary, insightPlan);
    const result = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Export pediatrician prep' });
  }

  async function purchasePlus() {
    try {
      const customerInfo = await plusAccess.purchaseMonthly();
      if (customerInfo?.entitlements?.active?.baby_tracker_plus) {
        setPaywallReason('');
        Alert.alert('Baby Tracker Plus is active', 'You now have access to Plus insights, reports, and care rhythm tools.');
      }
    } catch (error) {
      if (error?.userCancelled) return;
      Alert.alert('Could not start purchase', String(error?.message || error));
    }
  }

  async function restorePlus() {
    try {
      const customerInfo = await plusAccess.restorePurchases();
      if (customerInfo?.entitlements?.active?.baby_tracker_plus) {
        Alert.alert('Purchases restored', 'Baby Tracker Plus is active on this device.');
      } else {
        Alert.alert('No active Plus subscription found', 'You can still use all free Baby Tracker logging tools.');
      }
    } catch (error) {
      Alert.alert('Could not restore purchases', String(error?.message || error));
    }
  }

  function openUrl(url) {
    Linking.openURL(url).catch(() => Alert.alert('Could not open link', url));
  }

  async function createSyncAccount() {
    if (!supabase) {
      Alert.alert('Supabase is not configured', 'Add your Supabase URL and anon key in app.json before creating sync accounts.');
      return;
    }
    if (!syncEmail.trim() || syncPassword.length < 8) {
      Alert.alert('Add account details', 'Use an email and a password with at least 8 characters.');
      return;
    }

    try {
      setSyncBusy(true);
      const { data, error } = await supabase.auth.signUp({
        email: syncEmail.trim(),
        password: syncPassword,
      });
      if (error) throw error;
      setSyncSession(data.session || null);
      Alert.alert('Account created', data.session ? 'Sync is ready.' : 'Check your email to confirm the account, then sign in.');
    } catch (error) {
      Alert.alert('Could not create sync account', String(error?.message || error));
    } finally {
      setSyncBusy(false);
    }
  }

  async function signInForSync() {
    if (!supabase) {
      Alert.alert('Supabase is not configured', 'Add your Supabase URL and anon key in app.json before signing in.');
      return;
    }
    if (!syncEmail.trim() || !syncPassword) {
      Alert.alert('Add account details', 'Enter your sync account email and password.');
      return;
    }

    try {
      setSyncBusy(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: syncEmail.trim(),
        password: syncPassword,
      });
      if (error) throw error;
      setSyncSession(data.session || null);
      Alert.alert('Signed in', 'You can now sync this device.');
    } catch (error) {
      Alert.alert('Could not sign in', String(error?.message || error));
    } finally {
      setSyncBusy(false);
    }
  }

  async function signOutOfSync() {
    if (!supabase) return;
    try {
      setSyncBusy(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSyncSession(null);
      setSyncPassword('');
    } catch (error) {
      Alert.alert('Could not sign out', String(error?.message || error));
    } finally {
      setSyncBusy(false);
    }
  }

  async function syncNow() {
    const db = dbRef.current;
    if (!db || !baby) return;
    if (!syncSession) {
      Alert.alert('Sign in first', 'Create or sign in to a sync account before syncing baby data.');
      return;
    }

    try {
      setSyncBusy(true);
      const counts = await syncBabyTrackerData(db);
      await loadData(baby.id);
      const label = new Date().toLocaleString();
      setLastSyncAt(label);
      Alert.alert('Sync complete', `Synced ${counts.babies} baby profile(s), ${counts.events} care log(s), and ${counts.reminders} reminder(s).`);
    } catch (error) {
      Alert.alert('Could not sync', String(error?.message || error));
    } finally {
      setSyncBusy(false);
    }
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
      <PaywallModal
        visible={Boolean(paywallReason)}
        reason={paywallReason}
        plusAccess={plusAccess}
        styles={styles}
        onClose={() => setPaywallReason('')}
        onPurchase={purchasePlus}
        onRestore={restorePlus}
      />
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
            {plusAccess.isPlus ? (
              <>
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
              </>
            ) : (
              <>
                <InsightCard label="Today's free insight" text={insightPlan.insight.tryToday} styles={styles} highlight />
                <UpgradeCard
                  title="Unlock deeper patterns and visit-ready reports"
                  body="Baby Tracker Plus adds personalized weekly guidance, checklists, calm progress badges, and pediatrician prep without changing the free logging tools."
                  cta="Start 14-day Plus trial"
                  styles={styles}
                  onPress={() => setPaywallReason('Unlock personalized weekly insights tied to your baby logs, plus reports and calm care rhythm badges.')}
                />
              </>
            )}
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
          {!plusAccess.isPlus ? (
            <UpgradeCard
              title="See advanced 7-day and 30-day patterns"
              body="Plus turns logs into practical trends for feeds, diapers, sleep, growth notes, and questions to bring to visits."
              cta="Preview Baby Tracker Plus"
              styles={styles}
              onPress={() => setPaywallReason('Compare 7-day and 30-day care rhythms and turn recent logs into clearer next steps.')}
            />
          ) : (
            <View style={styles.personalizedCard}>
              <Text style={styles.detailTitle}>Plus pattern note</Text>
              <Text style={styles.personalizedText}>You logged {weeklyEvents.length} care moments in the last 7 days. Keep using notes for anything you want to review with a clinician or caregiver.</Text>
            </View>
          )}
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
            {!plusAccess.isPlus ? (
              <UpgradeCard
                title="Open the full first-year library"
                body="Plus unlocks the complete week-by-week library, saved insights, parent check-ins, and caregiver handoff prompts."
                cta="Unlock Plus"
                styles={styles}
                onPress={() => setPaywallReason('Open the full first-year guidance library and save the insights you want to revisit.')}
              />
            ) : null}
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
          <Pressable style={styles.secondaryButtonWide} onPress={exportPediatricianPrep}>
            <Text style={styles.secondaryButtonText}>Pediatrician prep report {plusAccess.isPlus ? '' : 'Plus'}</Text>
          </Pressable>
          <Pressable style={styles.destructiveButton} onPress={confirmDeleteAllData}>
            <Text style={styles.destructiveText}>Delete all data</Text>
          </Pressable>
        </Section>

        <Section eyebrow="Sync" title="Supabase backend" styles={styles}>
          <Text style={styles.empty}>
            Baby Tracker still works offline first. Supabase sync is optional and can back up logs or prepare for caregiver sharing across devices.
          </Text>
          <View style={styles.subscriptionState}>
            <Text style={styles.subscriptionTitle}>{syncSession ? 'Signed in for sync' : 'Local-only mode'}</Text>
            <Text style={styles.subscriptionText}>
              {isSupabaseConfigured ? (lastSyncAt ? `Last sync: ${lastSyncAt}` : 'Supabase is configured. Sign in to sync this device.') : 'Add Supabase URL and anon key in app.json to enable backend sync.'}
            </Text>
          </View>
          {!syncSession ? (
            <>
              <TextInput
                accessibilityLabel="Sync account email"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email for sync account"
                placeholderTextColor={theme.muted}
                value={syncEmail}
                onChangeText={setSyncEmail}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Sync account password"
                autoCapitalize="none"
                placeholder="Password"
                placeholderTextColor={theme.muted}
                secureTextEntry
                value={syncPassword}
                onChangeText={setSyncPassword}
                style={styles.input}
              />
              <View style={styles.utilityRow}>
                <Pressable disabled={syncBusy} style={styles.secondaryButton} onPress={createSyncAccount}>
                  <Text style={styles.secondaryButtonText}>Create account</Text>
                </Pressable>
                <Pressable disabled={syncBusy} style={styles.secondaryButton} onPress={signInForSync}>
                  <Text style={styles.secondaryButtonText}>Sign in</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Pressable disabled={syncBusy} style={styles.primaryButton} onPress={syncNow}>
                <Text style={styles.primaryButtonText}>{syncBusy ? 'Syncing...' : 'Sync now'}</Text>
              </Pressable>
              <Pressable disabled={syncBusy} style={styles.secondaryButtonWide} onPress={signOutOfSync}>
                <Text style={styles.secondaryButtonText}>Sign out of sync</Text>
              </Pressable>
            </>
          )}
          <Text style={styles.safety}>
            Do not store baby data remotely until your privacy policy, Supabase RLS policies, and App Store privacy disclosures are final.
          </Text>
        </Section>

        <Section eyebrow="Settings" title="Baby Tracker Plus" styles={styles}>
          <Text style={styles.empty}>
            Core logging stays free. Plus is optional and adds personalized insights, advanced patterns, saved guidance, and visit-ready reports.
          </Text>
          <View style={styles.subscriptionState}>
            <Text style={styles.subscriptionTitle}>{plusAccess.isPlus ? 'Plus active' : 'Free plan'}</Text>
            <Text style={styles.subscriptionText}>
              {plusAccess.configured ? 'Purchases are configured for App Store testing.' : 'Add your RevenueCat iOS API key before testing real purchases.'}
            </Text>
          </View>
          {!plusAccess.isPlus ? (
            <Pressable style={styles.primaryButton} onPress={() => setPaywallReason('Start a 14-day trial of Baby Tracker Plus for personalized insights and reports.')}>
              <Text style={styles.primaryButtonText}>Start 14-day Plus trial</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.secondaryButtonWide} onPress={restorePlus}>
            <Text style={styles.secondaryButtonText}>Restore purchases</Text>
          </Pressable>
          <View style={styles.settingsLinkRow}>
            <Pressable onPress={() => openUrl('https://apps.apple.com/account/subscriptions')}>
              <Text style={styles.linkText}>Manage subscription</Text>
            </Pressable>
            <Pressable onPress={() => openUrl('https://example.com/privacy')}>
              <Text style={styles.linkText}>Privacy policy</Text>
            </Pressable>
            <Pressable onPress={() => openUrl('https://example.com/terms')}>
              <Text style={styles.linkText}>Terms</Text>
            </Pressable>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function PaywallModal({ visible, reason, plusAccess, styles, onClose, onPurchase, onRestore }) {
  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.paywallSafe}>
        <ScrollView contentContainerStyle={styles.paywallScreen}>
          <Text style={styles.eyebrowDark}>Baby Tracker Plus</Text>
          <Text style={styles.paywallTitle}>Unlock deeper patterns and visit-ready reports</Text>
          <Text style={styles.paywallReason}>{reason}</Text>
          <View style={styles.priceCard}>
            <Text style={styles.priceText}>$4.99/month</Text>
            <Text style={styles.priceSub}>Includes a 14-day free trial. Cancel anytime in your App Store subscription settings.</Text>
          </View>
          {[
            'Personalized weekly insights tied to your logs',
            'Advanced 7-day and 30-day care patterns',
            'Pediatrician prep reports and saved guidance',
            'Calm checklists and care rhythm badges',
          ].map((item) => (
            <View key={item} style={styles.checkItem}>
              <View style={styles.checkDot} />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
          <Text style={styles.safety}>Core care logging, basic exports, reminders, and safety guidance stay free.</Text>
          {!plusAccess.configured ? (
            <Text style={styles.setupWarning}>Developer setup needed: add a RevenueCat iOS API key and App Store product baby_tracker_plus_monthly before purchases can run.</Text>
          ) : null}
          <Pressable accessibilityLabel="Start Baby Tracker Plus trial" style={styles.primaryButton} onPress={onPurchase}>
            <Text style={styles.primaryButtonText}>Start 14-day Plus trial</Text>
          </Pressable>
          <Pressable accessibilityLabel="Restore purchases" style={styles.secondaryButtonWide} onPress={onRestore}>
            <Text style={styles.secondaryButtonText}>Restore purchases</Text>
          </Pressable>
          <Pressable accessibilityLabel="Close paywall" style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Keep using free tracker</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function UpgradeCard({ title, body, cta, styles, onPress }) {
  return (
    <View style={styles.upgradeCard}>
      <Text style={styles.upgradeTitle}>{title}</Text>
      <Text style={styles.upgradeBody}>{body}</Text>
      <Pressable accessibilityLabel={cta} style={styles.upgradeButton} onPress={onPress}>
        <Text style={styles.upgradeButtonText}>{cta}</Text>
      </Pressable>
    </View>
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
    paywallSafe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    paywallScreen: {
      padding: 20,
      paddingBottom: 34,
      gap: 14,
      backgroundColor: theme.background,
    },
    paywallTitle: {
      color: theme.text,
      fontSize: 30,
      fontWeight: '900',
      lineHeight: 36,
    },
    paywallReason: {
      color: theme.muted,
      fontSize: 16,
      lineHeight: 23,
    },
    priceCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      gap: 4,
    },
    priceText: {
      color: theme.text,
      fontSize: 26,
      fontWeight: '900',
    },
    priceSub: {
      color: theme.muted,
      lineHeight: 20,
    },
    setupWarning: {
      padding: 12,
      borderRadius: 14,
      overflow: 'hidden',
      color: theme.warning,
      backgroundColor: theme.warningBg,
      lineHeight: 21,
    },
    closeButton: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      color: theme.muted,
      fontWeight: '900',
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
    upgradeCard: {
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.cardSoft,
      gap: 9,
    },
    upgradeTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 22,
    },
    upgradeBody: {
      color: theme.muted,
      lineHeight: 21,
    },
    upgradeButton: {
      minHeight: 46,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    upgradeButtonText: {
      color: '#FFFFFF',
      fontWeight: '900',
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
    secondaryButtonWide: {
      minHeight: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.cardSoft,
      borderWidth: 1,
      borderColor: theme.border,
    },
    subscriptionState: {
      padding: 13,
      borderRadius: 14,
      backgroundColor: theme.cardSoft,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 4,
    },
    subscriptionTitle: {
      color: theme.text,
      fontWeight: '900',
    },
    subscriptionText: {
      color: theme.muted,
      lineHeight: 20,
    },
    settingsLinkRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    linkText: {
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
