# Supabase Backend Setup

Baby Tracker is still local-first. Supabase is optional and enables account-based backup, cross-device sync, and future caregiver sharing.

## Create The Project

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. In Authentication settings, enable Email provider.
5. Copy the Project URL and anon public key.
6. Add them to `app.json`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://YOUR-PROJECT.supabase.co",
      "supabaseAnonKey": "YOUR-ANON-KEY"
    }
  }
}
```

The anon key is safe to ship in the app when Row Level Security is enabled and correct. Do not put the Supabase service role key in the app.

## Current Sync Behavior

- Local SQLite remains the source of truth for normal app use.
- Users can create or sign in to a sync account from the app.
- Tapping Sync now uploads local baby profiles, care events, and reminders.
- The app then pulls the signed-in user's remote rows back into local SQLite.
- Core logging works when offline or signed out.

## Current Tables

- `baby_profiles`
- `care_events`
- `care_reminders`

All three tables include `user_id` and RLS policies so a signed-in user can only access their own rows.

## Privacy Notes

Remote sync stores sensitive baby care data. Before enabling this in production:

- Update the privacy policy and App Store privacy nutrition labels.
- Add a public support email and privacy URL.
- Confirm RLS policies in the Supabase dashboard.
- Test sign-up, sign-in, sync, sign-out, and account deletion.
- Decide whether caregiver sharing requires explicit invitations and roles.

## Future Caregiver Sharing

The next schema step should add:

- `families`
- `family_members`
- `baby_family_members`
- role values such as `owner`, `caregiver`, and `viewer`

Do not add shared access by widening RLS on the current user-owned tables. Build explicit invitation tables first.
