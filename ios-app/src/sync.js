import { isSupabaseConfigured, supabase } from './supabaseClient';

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add supabaseUrl and supabaseAnonKey in app.json.');
  }
  return supabase;
}

function babyToRemote(row, userId) {
  return {
    archived_at: row.archived_at,
    birth_date: row.birth_date,
    created_at: row.created_at,
    id: row.id,
    name: row.name,
    updated_at: row.updated_at,
    user_id: userId,
  };
}

function eventToRemote(row, userId) {
  return {
    amount: row.amount,
    baby_id: row.baby_id,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
    detail: row.detail,
    ended_at: row.ended_at,
    event_date: row.event_date,
    event_time: row.event_time,
    id: row.id,
    label: row.label,
    occurred_at: row.occurred_at,
    payload_json: row.payload_json,
    timezone: row.timezone,
    type: row.type,
    updated_at: row.updated_at,
    user_id: userId,
  };
}

function reminderToRemote(row, userId) {
  return {
    baby_id: row.baby_id,
    cadence: row.cadence,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
    enabled: Boolean(row.enabled),
    id: row.id,
    label: row.label,
    notification_id: row.notification_id,
    updated_at: row.updated_at,
    user_id: userId,
  };
}

async function upsertRemoteRows(table, rows) {
  if (rows.length === 0) return;
  const client = requireSupabase();
  const { error } = await client.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

async function pullRemoteRows(table) {
  const client = requireSupabase();
  const { data, error } = await client.from(table).select('*').order('updated_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getCurrentSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function syncBabyTrackerData(db) {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sign in before syncing baby data.');

  const [babies, events, reminders] = await Promise.all([
    db.getAllAsync('SELECT * FROM babies'),
    db.getAllAsync('SELECT * FROM events'),
    db.getAllAsync('SELECT * FROM reminders'),
  ]);

  await upsertRemoteRows('baby_profiles', babies.map((row) => babyToRemote(row, userId)));
  await upsertRemoteRows('care_events', events.map((row) => eventToRemote(row, userId)));
  await upsertRemoteRows('care_reminders', reminders.map((row) => reminderToRemote(row, userId)));

  const [remoteBabies, remoteEvents, remoteReminders] = await Promise.all([
    pullRemoteRows('baby_profiles'),
    pullRemoteRows('care_events'),
    pullRemoteRows('care_reminders'),
  ]);

  for (const row of remoteBabies) {
    await db.runAsync(
      `INSERT INTO babies (id, name, birth_date, created_at, updated_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        birth_date = excluded.birth_date,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        archived_at = excluded.archived_at`,
      row.id,
      row.name,
      row.birth_date,
      row.created_at,
      row.updated_at,
      row.archived_at,
    );
  }

  for (const row of remoteEvents) {
    await db.runAsync(
      `INSERT INTO events
        (id, baby_id, type, label, amount, detail, event_date, event_time, occurred_at, ended_at, timezone, payload_json, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        baby_id = excluded.baby_id,
        type = excluded.type,
        label = excluded.label,
        amount = excluded.amount,
        detail = excluded.detail,
        event_date = excluded.event_date,
        event_time = excluded.event_time,
        occurred_at = excluded.occurred_at,
        ended_at = excluded.ended_at,
        timezone = excluded.timezone,
        payload_json = excluded.payload_json,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at`,
      row.id,
      row.baby_id,
      row.type,
      row.label,
      row.amount,
      row.detail,
      row.event_date,
      row.event_time,
      row.occurred_at,
      row.ended_at,
      row.timezone,
      row.payload_json,
      row.created_at,
      row.updated_at,
      row.deleted_at,
    );
  }

  for (const row of remoteReminders) {
    await db.runAsync(
      `INSERT INTO reminders (id, baby_id, label, cadence, enabled, notification_id, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        baby_id = excluded.baby_id,
        label = excluded.label,
        cadence = excluded.cadence,
        enabled = excluded.enabled,
        notification_id = excluded.notification_id,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at`,
      row.id,
      row.baby_id,
      row.label,
      row.cadence,
      row.enabled ? 1 : 0,
      row.notification_id,
      row.created_at,
      row.updated_at,
      row.deleted_at,
    );
  }

  return {
    babies: remoteBabies.length,
    events: remoteEvents.length,
    reminders: remoteReminders.length,
  };
}
