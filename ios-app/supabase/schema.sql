-- Baby Tracker Supabase schema
-- Run this in the Supabase SQL editor after creating the project.

create table if not exists public.baby_profiles (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  birth_date date not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  archived_at timestamptz
);

create table if not exists public.care_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  baby_id text not null references public.baby_profiles(id) on delete cascade,
  type text not null,
  label text not null,
  amount text,
  detail text,
  event_date date not null,
  event_time text not null,
  occurred_at timestamptz not null,
  ended_at timestamptz,
  timezone text not null,
  payload_json text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.care_reminders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  baby_id text not null references public.baby_profiles(id) on delete cascade,
  label text not null,
  cadence text not null,
  enabled boolean not null default false,
  notification_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create index if not exists baby_profiles_user_idx on public.baby_profiles(user_id);
create index if not exists care_events_user_baby_date_idx on public.care_events(user_id, baby_id, event_date);
create index if not exists care_events_user_updated_idx on public.care_events(user_id, updated_at);
create index if not exists care_reminders_user_baby_idx on public.care_reminders(user_id, baby_id);

alter table public.baby_profiles enable row level security;
alter table public.care_events enable row level security;
alter table public.care_reminders enable row level security;

drop policy if exists "Parents can read own baby profiles" on public.baby_profiles;
drop policy if exists "Parents can insert own baby profiles" on public.baby_profiles;
drop policy if exists "Parents can update own baby profiles" on public.baby_profiles;
drop policy if exists "Parents can delete own baby profiles" on public.baby_profiles;

create policy "Parents can read own baby profiles"
on public.baby_profiles for select
using (auth.uid() = user_id);

create policy "Parents can insert own baby profiles"
on public.baby_profiles for insert
with check (auth.uid() = user_id);

create policy "Parents can update own baby profiles"
on public.baby_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Parents can delete own baby profiles"
on public.baby_profiles for delete
using (auth.uid() = user_id);

drop policy if exists "Parents can read own care events" on public.care_events;
drop policy if exists "Parents can insert own care events" on public.care_events;
drop policy if exists "Parents can update own care events" on public.care_events;
drop policy if exists "Parents can delete own care events" on public.care_events;

create policy "Parents can read own care events"
on public.care_events for select
using (auth.uid() = user_id);

create policy "Parents can insert own care events"
on public.care_events for insert
with check (auth.uid() = user_id);

create policy "Parents can update own care events"
on public.care_events for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Parents can delete own care events"
on public.care_events for delete
using (auth.uid() = user_id);

drop policy if exists "Parents can read own care reminders" on public.care_reminders;
drop policy if exists "Parents can insert own care reminders" on public.care_reminders;
drop policy if exists "Parents can update own care reminders" on public.care_reminders;
drop policy if exists "Parents can delete own care reminders" on public.care_reminders;

create policy "Parents can read own care reminders"
on public.care_reminders for select
using (auth.uid() = user_id);

create policy "Parents can insert own care reminders"
on public.care_reminders for insert
with check (auth.uid() = user_id);

create policy "Parents can update own care reminders"
on public.care_reminders for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Parents can delete own care reminders"
on public.care_reminders for delete
using (auth.uid() = user_id);
