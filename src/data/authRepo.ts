// Sign up, log in, log out. Never throws: every function returns a Result.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Result } from '@/domain/types';

import { MESSAGES, toUserMessage } from './errors';
import { isOnline } from './network';
import { AUTH_STORAGE_KEY, supabase } from './supabaseClient';

const ok: Result<void> = { ok: true, data: undefined };
const fail = (error: unknown): Result<void> => ({ ok: false, error: toUserMessage(error) });
const offline: Result<void> = { ok: false, error: MESSAGES.noConnection };

async function signUp(email: string, password: string): Promise<Result<void>> {
  if (!(await isOnline())) return offline;
  try {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return fail(error);
    // With email confirmation on, Supabase hides "already registered" (so attackers
    // can't probe for accounts) by returning a user with no identities instead.
    if (data.user && data.user.identities?.length === 0) {
      return { ok: false, error: MESSAGES.emailTaken };
    }
    return ok;
  } catch (error) {
    return fail(error);
  }
}

async function signIn(email: string, password: string): Promise<Result<void>> {
  if (!(await isOnline())) return offline;
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? fail(error) : ok;
  } catch (error) {
    return fail(error);
  }
}

/** Deletes the saved login from this phone. */
async function forgetSavedLogin(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  await AsyncStorage.removeItem(`${AUTH_STORAGE_KEY}-user`);
}

/**
 * Logging out must always work (a shared phone). Online, also end the session
 * on the server. If that isn't possible — offline, or the server call fails —
 * clear the saved login ourselves: with an expired token supabase-js would
 * otherwise fail to refresh and return early WITHOUT logging out.
 */
async function signOut(): Promise<Result<void>> {
  try {
    if (await isOnline()) {
      const { error } = await supabase.auth.signOut();
      if (!error) return ok;
    }
    await forgetSavedLogin();
    // Storage is empty now, so this just fires SIGNED_OUT for the app.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    return error ? fail(error) : ok;
  } catch (error) {
    return fail(error);
  }
}

async function resendConfirmation(email: string): Promise<Result<void>> {
  if (!(await isOnline())) return offline;
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    return error ? fail(error) : ok;
  } catch (error) {
    return fail(error);
  }
}

/** Calls back with true/false whenever login state changes (including at startup). */
function onSessionChange(callback: (signedIn: boolean) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION' && session === null) {
      // Opening the app offline with an expired token: supabase-js can't
      // refresh, reports "no session", but KEEPS the saved login and refreshes
      // it once back online. So trust the saved login if one exists; screens
      // show "No connection" until then. (A truly invalid login is removed from
      // storage by supabase-js, so this then reads as signed out.)
      callback((await AsyncStorage.getItem(AUTH_STORAGE_KEY)) !== null);
      return;
    }
    callback(session !== null);
  });
  return () => data.subscription.unsubscribe();
}

export const authRepo = { signUp, signIn, signOut, resendConfirmation, onSessionChange };
