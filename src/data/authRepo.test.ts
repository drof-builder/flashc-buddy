import AsyncStorage from '@react-native-async-storage/async-storage';

import { authRepo } from './authRepo';
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
      onAuthStateChange: jest.fn(),
    },
  },
}));
jest.mock('./network', () => ({ isOnline: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), removeItem: jest.fn() },
}));

const storage = AsyncStorage as unknown as Record<string, jest.Mock>;
const auth = supabase.auth as unknown as Record<string, jest.Mock>;
const online = isOnline as jest.Mock;
const NO_CONNECTION = "No connection. Try again when you're online.";

beforeEach(() => {
  jest.clearAllMocks();
  online.mockResolvedValue(true);
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

  it('succeeds for a new email and trims it', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] } }, error: null });
    await expect(authRepo.signUp(' me@example.com ', 'password1')).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'me@example.com', password: 'password1' });
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
