import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js/dist/module';

global.Buffer = global.Buffer || Buffer;

function getSupabaseConfig() {
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  return {
    anonKey: extra.supabaseAnonKey || '',
    url: extra.supabaseUrl || '',
  };
}

export const supabaseConfig = getSupabaseConfig();
export const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
  })
  : null;

if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
