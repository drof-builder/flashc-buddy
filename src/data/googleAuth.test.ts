// The native Google Sign-In module and expo-constants are faked here, so these
// tests cover our logic: availability, success, cancel and error mapping.

let mockEnvironment = 'bare';
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get executionEnvironment() {
      return mockEnvironment;
    },
  },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isErrorWithCode: (error: unknown) =>
    !!error && typeof (error as { code?: unknown }).code === 'string',
  isCancelledResponse: (response: { type: string }) => response.type === 'cancelled',
}));

type GoogleAuth = typeof import('./googleAuth');
const google = jest.requireMock('@react-native-google-signin/google-signin').GoogleSignin as Record<
  string,
  jest.Mock
>;

/** Loads googleAuth fresh, with the given client ID set. */
function load(clientId = 'web-client-id'): GoogleAuth {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = clientId;
  let mod!: GoogleAuth;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module per test
    mod = require('./googleAuth');
  });
  return mod;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEnvironment = 'bare';
  google.hasPlayServices.mockResolvedValue(true);
});

describe('isGoogleSignInAvailable', () => {
  it('is true in a development or release build with a client ID', () => {
    expect(load().isGoogleSignInAvailable()).toBe(true);
  });

  it('is false when the client ID is missing (button hidden, no crash)', () => {
    expect(load('').isGoogleSignInAvailable()).toBe(false);
  });

  it('is false in Expo Go, which has no Google module', () => {
    mockEnvironment = 'storeClient';
    expect(load().isGoogleSignInAvailable()).toBe(false);
  });
});

describe('getGoogleIdToken', () => {
  it('returns the ID token on success, configured with the web client ID', async () => {
    google.signIn.mockResolvedValue({ type: 'success', data: { idToken: 'tok' } });
    const auth = load();

    await expect(auth.getGoogleIdToken()).resolves.toEqual({ kind: 'token', idToken: 'tok' });
    expect(google.configure).toHaveBeenCalledWith({ webClientId: 'web-client-id' });
  });

  it('reports a closed picker as cancelled', async () => {
    google.signIn.mockResolvedValue({ type: 'cancelled', data: null });
    await expect(load().getGoogleIdToken()).resolves.toEqual({ kind: 'cancelled' });
  });

  it('reports a cancel error code as cancelled too', async () => {
    google.signIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
    await expect(load().getGoogleIdToken()).resolves.toEqual({ kind: 'cancelled' });
  });

  it('reports missing Play Services as an error it can recognise', async () => {
    const error = { code: 'PLAY_SERVICES_NOT_AVAILABLE' };
    google.hasPlayServices.mockRejectedValue(error);
    const auth = load();

    const result = await auth.getGoogleIdToken();

    expect(result).toEqual({ kind: 'error', error });
    expect(auth.isPlayServicesError(error)).toBe(true);
    expect(google.signIn).not.toHaveBeenCalled();
  });

  it('treats a success without an ID token as an error', async () => {
    google.signIn.mockResolvedValue({ type: 'success', data: { idToken: null } });
    const result = await load().getGoogleIdToken();
    expect(result.kind).toBe('error');
  });

  it('configures Google only once', async () => {
    google.signIn.mockResolvedValue({ type: 'success', data: { idToken: 'tok' } });
    const auth = load();
    await auth.getGoogleIdToken();
    await auth.getGoogleIdToken();
    expect(google.configure).toHaveBeenCalledTimes(1);
  });
});

describe('signOutOfGoogle', () => {
  it('signs out of Google', async () => {
    google.signOut.mockResolvedValue(null);
    await load().signOutOfGoogle();
    expect(google.signOut).toHaveBeenCalled();
  });

  it('after an app restart, sets Google up before signing out (native signOut needs it)', async () => {
    google.signOut.mockResolvedValue(null);
    const auth = load(); // fresh start: nothing configured yet

    await auth.signOutOfGoogle();

    expect(google.configure).toHaveBeenCalledWith({ webClientId: 'web-client-id' });
    expect(google.configure.mock.invocationCallOrder[0]).toBeLessThan(
      google.signOut.mock.invocationCallOrder[0],
    );
  });

  it('never throws, even if Google fails', async () => {
    google.signOut.mockRejectedValue(new Error('boom'));
    await expect(load().signOutOfGoogle()).resolves.toBeUndefined();
  });
});

it('isPlayServicesError is false for other errors', () => {
  expect(load().isPlayServicesError({ code: 'IN_PROGRESS' })).toBe(false);
  expect(load().isPlayServicesError(new Error('x'))).toBe(false);
});
