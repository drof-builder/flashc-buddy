// Sign up, log in, log out. Never throws: every function returns a Result.
import type { Result } from '@/domain/types';

import { MESSAGES, toUserMessage } from './errors';
import { isOnline } from './network';
import { supabase } from './supabaseClient';

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

/** Works offline too: then it only forgets the login on this phone. */
async function signOut(): Promise<Result<void>> {
  try {
    const { error } = (await isOnline())
      ? await supabase.auth.signOut()
      : await supabase.auth.signOut({ scope: 'local' });
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
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session !== null);
  });
  return () => data.subscription.unsubscribe();
}

export const authRepo = { signUp, signIn, signOut, resendConfirmation, onSessionChange };
