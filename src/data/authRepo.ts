// Sign up, log in, log out. Never throws: every function returns a Result.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseAuthLink } from '@/domain/authLink';
import type { Result } from '@/domain/types';

import { MESSAGES, toUserMessage } from './errors';
import { getGoogleIdToken, isPlayServicesError, signOutOfGoogle } from './googleAuth';
import { isOnline } from './network';
import { AUTH_STORAGE_KEY, supabase } from './supabaseClient';

/** Where email links (confirmation, password reset) send the user back to: the app. */
export const AUTH_REDIRECT_URL = 'flashcbuddy://auth-callback';

const ok: Result<void> = { ok: true, data: undefined };
const fail = (error: unknown): Result<void> => ({ ok: false, error: toUserMessage(error) });
const offline: Result<void> = { ok: false, error: MESSAGES.noConnection };

async function signUp(email: string, password: string): Promise<Result<void>> {
  if (!(await isOnline())) return offline;
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: AUTH_REDIRECT_URL },
    });
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
  const result = await endSession();
  // After the app session is gone, forget the Google account so the picker
  // shows next time (shared phone). Never throws, so it can't undo the logout.
  await signOutOfGoogle();
  return result;
}

async function endSession(): Promise<Result<void>> {
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

/**
 * "Continue with Google": Google picks the account and vouches for the email,
 * Supabase signs in (or creates) the user from Google's ID token. Same email as
 * an existing account = same account (Supabase links verified emails).
 * `cancelled` = the user closed the picker; show nothing.
 */
async function signInWithGoogle(): Promise<Result<'signedIn' | 'cancelled'>> {
  if (!(await isOnline())) return { ok: false, error: MESSAGES.noConnection };
  const google = await getGoogleIdToken();
  if (google.kind === 'cancelled') return { ok: true, data: 'cancelled' };
  if (google.kind === 'error') {
    if (isPlayServicesError(google.error)) return { ok: false, error: MESSAGES.googlePlayServices };
    await signOutOfGoogle(); // a retry then shows the picker instead of the same account
    return { ok: false, error: toUserMessage(google.error) };
  }
  try {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: google.idToken,
    });
    if (!error) return { ok: true, data: 'signedIn' };
    await signOutOfGoogle(); // let the user pick again on the next try
    return { ok: false, error: toUserMessage(error) };
  } catch (error) {
    await signOutOfGoogle();
    return { ok: false, error: toUserMessage(error) };
  }
}

/**
 * Sends a password-reset email whose link opens the app. Supabase answers the
 * same whether or not the email has an account, so nobody can probe for accounts.
 */
async function requestPasswordReset(email: string): Promise<Result<void>> {
  if (!(await isOnline())) return offline;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: AUTH_REDIRECT_URL,
    });
    return error ? fail(error) : ok;
  } catch (error) {
    return fail(error);
  }
}

/**
 * Signs in from a tapped email link (flashcbuddy://auth-callback#…). Tells the
 * caller whether it was a password reset (show "Set new password") or a
 * sign-up confirmation. Any bad or expired link gets the same clear message.
 */
async function completeAuthLink(url: string): Promise<Result<'recovery' | 'signup'>> {
  const link = parseAuthLink(url);
  if (link.kind !== 'session') return { ok: false, error: MESSAGES.linkExpired };
  if (!(await isOnline())) return { ok: false, error: MESSAGES.noConnection };
  try {
    const { error } = await supabase.auth.setSession({
      access_token: link.accessToken,
      refresh_token: link.refreshToken,
    });
    if (error) {
      // Only a real refusal from Supabase means the link is bad; a network
      // problem must not send the user off to request another email.
      return { ok: false, error: isRejection(error) ? MESSAGES.linkExpired : toUserMessage(error) };
    }
    return { ok: true, data: link.type };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

/** True when Supabase answered and said no (4xx), as opposed to a network failure. */
function isRejection(error: unknown): boolean {
  const e = error as { name?: unknown; status?: unknown };
  if (e.name === 'AuthApiError') return true;
  return typeof e.status === 'number' && e.status >= 400 && e.status < 500;
}

/** Sets a new password for the signed-in user (after a password-reset link). */
async function updatePassword(password: string): Promise<Result<void>> {
  if (!(await isOnline())) return offline;
  try {
    const { error } = await supabase.auth.updateUser({ password });
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

export const authRepo = {
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  requestPasswordReset,
  completeAuthLink,
  updatePassword,
  resendConfirmation,
  onSessionChange,
};
