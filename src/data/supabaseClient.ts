// The one Supabase client for the whole app.
// Only files in src/data/ may import this (see docs/design/design-doc-step1.md).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { createTimeoutFetch, REQUEST_TIMEOUT_MS } from './timeoutFetch';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Missing Supabase settings. Copy .env.example to .env and fill in ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

/** Where the saved login lives in AsyncStorage (authRepo reads/clears it). */
export const AUTH_STORAGE_KEY = 'flashc-buddy-auth';

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage, // keeps the user logged in after the app restarts
    storageKey: AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // no web redirects in a native app
  },
  // Every request gives up after 15 s instead of spinning forever.
  global: { fetch: createTimeoutFetch(fetch, REQUEST_TIMEOUT_MS) },
});

// Refresh the login token only while the app is in the foreground, so a user
// returning after hours in the background is still logged in.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
