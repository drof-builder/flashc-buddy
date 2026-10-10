// Thin wrapper around the native Google Sign-In module.
// Only src/data/ may use Google directly (see docs/design/design-doc-step1.md).
//
// The native module crashes the moment it is imported where it isn't built in
// (Expo Go), so it is loaded lazily and only after checking we're not in Expo Go.
import Constants, { ExecutionEnvironment } from 'expo-constants';

type GoogleSignInLib = typeof import('@react-native-google-signin/google-signin');

export type GoogleTokenResult =
  | { kind: 'token'; idToken: string }
  | { kind: 'cancelled' }
  | { kind: 'error'; error: unknown };

let lib: GoogleSignInLib | null | undefined;
let configured = false;

const webClientId = () => process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const inExpoGo = () => Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function loadLib(): GoogleSignInLib | null {
  if (lib !== undefined) return lib;
  if (inExpoGo()) return (lib = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lib = require('@react-native-google-signin/google-signin') as GoogleSignInLib;
  } catch {
    lib = null;
  }
  return lib;
}

/** False in Expo Go or when the client ID is missing: the button is then hidden. */
export function isGoogleSignInAvailable(): boolean {
  return webClientId() !== '' && loadLib() !== null;
}

/** Shows Android's Google account picker and returns the chosen account's ID token. */
export async function getGoogleIdToken(): Promise<GoogleTokenResult> {
  const google = loadLib();
  if (!google || !webClientId()) {
    return { kind: 'error', error: new Error('Google sign-in is not available here') };
  }
  try {
    if (!configured) {
      google.GoogleSignin.configure({ webClientId: webClientId() });
      configured = true;
    }
    await google.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await google.GoogleSignin.signIn();
    if (google.isCancelledResponse(response)) return { kind: 'cancelled' };
    const idToken = response.data?.idToken;
    if (!idToken) return { kind: 'error', error: new Error('Google returned no ID token') };
    return { kind: 'token', idToken };
  } catch (error) {
    if (google.isErrorWithCode(error) && error.code === google.statusCodes.SIGN_IN_CANCELLED) {
      return { kind: 'cancelled' };
    }
    return { kind: 'error', error };
  }
}

/** Forgets the chosen Google account so the picker shows next time. Never throws. */
export async function signOutOfGoogle(): Promise<void> {
  const google = loadLib();
  if (!google) return;
  try {
    await google.GoogleSignin.signOut();
  } catch {
    // Nothing to undo: the app session is what matters.
  }
}

export function isPlayServicesError(error: unknown): boolean {
  const google = loadLib();
  return (
    !!google &&
    google.isErrorWithCode(error) &&
    error.code === google.statusCodes.PLAY_SERVICES_NOT_AVAILABLE
  );
}
