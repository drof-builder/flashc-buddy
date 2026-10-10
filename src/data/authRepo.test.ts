import AsyncStorage from '@react-native-async-storage/async-storage';

import { authRepo } from './authRepo';
import { getGoogleIdToken, isPlayServicesError, signOutOfGoogle } from './googleAuth';
import { isOnline } from './network';
import { supabase } from './supabaseClient';

jest.mock('./supabaseClient', () => ({
  AUTH_STORAGE_KEY: 'test-auth',
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resend: jest.fn(),
      signInWithIdToken: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      setSession: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));
jest.mock('./network', () => ({ isOnline: jest.fn() }));
jest.mock('./googleAuth', () => ({
  getGoogleIdToken: jest.fn(),
  isPlayServicesError: jest.fn(),
  signOutOfGoogle: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), removeItem: jest.fn() },
}));

const storage = AsyncStorage as unknown as Record<string, jest.Mock>;
const auth = supabase.auth as unknown as Record<string, jest.Mock>;
const online = isOnline as jest.Mock;
const googleToken = getGoogleIdToken as jest.Mock;
const playServicesError = isPlayServicesError as jest.Mock;
const googleSignOut = signOutOfGoogle as jest.Mock;
const NO_CONNECTION = "No connection. Try again when you're online.";

beforeEach(() => {
  jest.clearAllMocks();
  online.mockResolvedValue(true);
  playServicesError.mockReturnValue(false);
  googleSignOut.mockResolvedValue(undefined);
});

describe('authRepo.signUp', () => {
  it('returns the no-connection error without calling Supabase when offline', async () => {
    online.mockResolvedValue(false);
    await expect(authRepo.signUp('me@example.com', 'password1')).resolves.toEqual({
      ok: false,
      error: NO_CONNECTION,
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('detects an already registered email (Supabase returns no identities, no error)', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [] } }, error: null });
    await expect(authRepo.signUp('me@example.com', 'password1')).resolves.toEqual({
      ok: false,
      error: 'An account with this email already exists.',
    });
  });

  it('succeeds for a new email, trims it, and sends the confirmation link to the app', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] } }, error: null });
    await expect(authRepo.signUp(' me@example.com ', 'password1')).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'me@example.com',
      password: 'password1',
      options: { emailRedirectTo: 'flashcbuddy://auth-callback' },
    });
  });
});

describe('authRepo.signIn', () => {
  it('maps wrong credentials to the user message', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'invalid_credentials' } });
    await expect(authRepo.signIn('me@example.com', 'nope')).resolves.toEqual({
      ok: false,
      error: 'Incorrect email or password.',
    });
  });

  it('succeeds with correct credentials', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    await expect(authRepo.signIn('me@example.com', 'password1')).resolves.toEqual({
      ok: true,
      data: undefined,
    });
  });
});

describe('authRepo.signOut', () => {
  it('signs out everywhere when online', async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await expect(authRepo.signOut()).resolves.toEqual({ ok: true, data: undefined });
    expect(auth.signOut).toHaveBeenCalledWith();
  });

  it('offline: forgets the saved login first, then signs out on this phone', async () => {
    // With an expired token offline, supabase-js would fail to refresh and
    // return early WITHOUT clearing the session — so clear storage ourselves.
    online.mockResolvedValue(false);
    auth.signOut.mockResolvedValue({ error: null });

    await expect(authRepo.signOut()).resolves.toEqual({ ok: true, data: undefined });

    expect(storage.removeItem).toHaveBeenCalledWith('test-auth');
    expect(storage.removeItem).toHaveBeenCalledWith('test-auth-user');
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    const cleared = storage.removeItem.mock.invocationCallOrder[0];
    expect(cleared).toBeLessThan(auth.signOut.mock.invocationCallOrder[0]);
  });

  it('online but the server call fails: still logs out on this phone', async () => {
    auth.signOut
      .mockResolvedValueOnce({ error: { name: 'AuthRetryableFetchError' } })
      .mockResolvedValueOnce({ error: null });

    await expect(authRepo.signOut()).resolves.toEqual({ ok: true, data: undefined });

    expect(storage.removeItem).toHaveBeenCalledWith('test-auth');
    expect(auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
  });
});

describe('authRepo.resendConfirmation', () => {
  it('asks Supabase to resend the sign-up email', async () => {
    auth.resend.mockResolvedValue({ data: {}, error: null });
    await expect(authRepo.resendConfirmation('me@example.com')).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'me@example.com' });
  });
});

describe('authRepo.onSessionChange', () => {
  it('reports signed in / out and returns an unsubscribe function', () => {
    const unsubscribe = jest.fn();
    let listener: (event: string, session: unknown) => void = () => {};
    auth.onAuthStateChange.mockImplementation((cb) => {
      listener = cb;
      return { data: { subscription: { unsubscribe } } };
    });
    const cb = jest.fn();

    const stop = authRepo.onSessionChange(cb);
    listener('INITIAL_SESSION', { user: {} });
    listener('SIGNED_OUT', null);
    stop();

    expect(cb.mock.calls).toEqual([[true], [false]]);
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('opening the app offline with a saved (expired) login counts as signed in', async () => {
    // supabase-js reports INITIAL_SESSION null when it can't refresh offline,
    // but keeps the saved login. Trust the saved login until it's really gone.
    let listener: (event: string, session: unknown) => Promise<void> | void = () => {};
    auth.onAuthStateChange.mockImplementation((cb) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    storage.getItem.mockResolvedValue('{"refresh_token":"r"}');
    const cb = jest.fn();

    authRepo.onSessionChange(cb);
    await listener('INITIAL_SESSION', null);

    expect(storage.getItem).toHaveBeenCalledWith('test-auth');
    expect(cb).toHaveBeenCalledWith(true);
  });

  it('opening the app with no saved login counts as signed out', async () => {
    let listener: (event: string, session: unknown) => Promise<void> | void = () => {};
    auth.onAuthStateChange.mockImplementation((cb) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    storage.getItem.mockResolvedValue(null);
    const cb = jest.fn();

    authRepo.onSessionChange(cb);
    await listener('INITIAL_SESSION', null);

    expect(cb).toHaveBeenCalledWith(false);
  });
});

describe('authRepo.signInWithGoogle', () => {
  it('offline: shows the no-connection error without opening the Google picker', async () => {
    online.mockResolvedValue(false);
    await expect(authRepo.signInWithGoogle()).resolves.toEqual({ ok: false, error: NO_CONNECTION });
    expect(googleToken).not.toHaveBeenCalled();
  });

  it('cancelled picker: nothing to show, Supabase not called', async () => {
    googleToken.mockResolvedValue({ kind: 'cancelled' });
    await expect(authRepo.signInWithGoogle()).resolves.toEqual({ ok: true, data: 'cancelled' });
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it('no Google Play services: explains and suggests email', async () => {
    const error = { code: 'PLAY_SERVICES_NOT_AVAILABLE' };
    googleToken.mockResolvedValue({ kind: 'error', error });
    playServicesError.mockReturnValue(true);
    await expect(authRepo.signInWithGoogle()).resolves.toEqual({
      ok: false,
      error: 'Google sign-in needs Google Play services on this phone. Use email instead.',
    });
  });

  it('other Google errors: generic message', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    googleToken.mockResolvedValue({ kind: 'error', error: new Error('DEVELOPER_ERROR') });
    await expect(authRepo.signInWithGoogle()).resolves.toEqual({
      ok: false,
      error: 'Something went wrong. Please try again.',
    });
    // so a retry shows the picker instead of reusing the same failing account
    expect(googleSignOut).toHaveBeenCalled();
  });

  it('signs in to Supabase with the Google ID token', async () => {
    googleToken.mockResolvedValue({ kind: 'token', idToken: 'tok' });
    auth.signInWithIdToken.mockResolvedValue({ data: { session: {} }, error: null });

    await expect(authRepo.signInWithGoogle()).resolves.toEqual({ ok: true, data: 'signedIn' });
    expect(auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'google', token: 'tok' });
  });

  it('Supabase rejects the token: generic message and Google is signed out so the picker shows next time', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    googleToken.mockResolvedValue({ kind: 'token', idToken: 'tok' });
    auth.signInWithIdToken.mockResolvedValue({ data: {}, error: { code: 'provider_disabled' } });

    await expect(authRepo.signInWithGoogle()).resolves.toEqual({
      ok: false,
      error: 'Something went wrong. Please try again.',
    });
    expect(googleSignOut).toHaveBeenCalled();
  });
});

describe('authRepo.signOut and Google', () => {
  it('also forgets the Google account, so the picker shows next time', async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await authRepo.signOut();
    expect(googleSignOut).toHaveBeenCalled();
  });

  it('ends the app session first, so a slow Google call can never block logging out', async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await authRepo.signOut();
    expect(auth.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      googleSignOut.mock.invocationCallOrder[0],
    );
  });
});

describe('authRepo.requestPasswordReset', () => {
  it('sends a reset email that links back into the app', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    await expect(authRepo.requestPasswordReset(' me@example.com ')).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('me@example.com', {
      redirectTo: 'flashcbuddy://auth-callback',
    });
  });

  it('offline: no request is sent', async () => {
    online.mockResolvedValue(false);
    await expect(authRepo.requestPasswordReset('me@example.com')).resolves.toEqual({
      ok: false,
      error: NO_CONNECTION,
    });
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('too many emails: explains the wait', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { code: 'over_email_send_rate_limit' },
    });
    await expect(authRepo.requestPasswordReset('me@example.com')).resolves.toEqual({
      ok: false,
      error: 'Too many emails sent. Please wait a minute and try again.',
    });
  });
});

describe('authRepo.completeAuthLink', () => {
  const link = 'flashcbuddy://auth-callback#access_token=AT&refresh_token=RT';

  it('a password-reset link signs in and reports recovery', async () => {
    auth.setSession.mockResolvedValue({ data: {}, error: null });
    await expect(authRepo.completeAuthLink(`${link}&type=recovery`)).resolves.toEqual({
      ok: true,
      data: 'recovery',
    });
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'AT', refresh_token: 'RT' });
  });

  it('a confirmation link signs in and reports signup', async () => {
    auth.setSession.mockResolvedValue({ data: {}, error: null });
    await expect(authRepo.completeAuthLink(`${link}&type=signup`)).resolves.toEqual({
      ok: true,
      data: 'signup',
    });
  });

  it('an expired link explains and asks for a new one', async () => {
    await expect(
      authRepo.completeAuthLink('flashcbuddy://auth-callback#error=access_denied&error_code=otp_expired'),
    ).resolves.toEqual({ ok: false, error: 'This link has expired. Request a new one.' });
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it('a broken link is treated as expired', async () => {
    await expect(authRepo.completeAuthLink('flashcbuddy://auth-callback')).resolves.toEqual({
      ok: false,
      error: 'This link has expired. Request a new one.',
    });
  });

  it('Supabase refusing the tokens is treated as expired', async () => {
    auth.setSession.mockResolvedValue({ data: {}, error: { code: 'session_expired' } });
    await expect(authRepo.completeAuthLink(`${link}&type=recovery`)).resolves.toEqual({
      ok: false,
      error: 'This link has expired. Request a new one.',
    });
  });

  it('offline: explains, no sign-in attempted', async () => {
    online.mockResolvedValue(false);
    await expect(authRepo.completeAuthLink(`${link}&type=recovery`)).resolves.toEqual({
      ok: false,
      error: NO_CONNECTION,
    });
    expect(auth.setSession).not.toHaveBeenCalled();
  });
});

describe('authRepo.updatePassword', () => {
  it('sets the new password', async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: null });
    await expect(authRepo.updatePassword('newpassword1')).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword1' });
  });

  it('reports a server error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    auth.updateUser.mockResolvedValue({ data: {}, error: { code: 'unexpected_failure' } });
    await expect(authRepo.updatePassword('newpassword1')).resolves.toEqual({
      ok: false,
      error: 'Something went wrong. Please try again.',
    });
  });

  it('offline: nothing sent', async () => {
    online.mockResolvedValue(false);
    await expect(authRepo.updatePassword('newpassword1')).resolves.toEqual({
      ok: false,
      error: NO_CONNECTION,
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});
