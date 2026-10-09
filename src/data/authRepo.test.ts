import { authRepo } from './authRepo';
import { isOnline } from './network';
import { supabase } from './supabaseClient';

jest.mock('./supabaseClient', () => ({
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

  it('still signs out on this phone when offline', async () => {
    online.mockResolvedValue(false);
    auth.signOut.mockResolvedValue({ error: null });
    await expect(authRepo.signOut()).resolves.toEqual({ ok: true, data: undefined });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
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
});
