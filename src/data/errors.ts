// Turns technical errors (Supabase, network) into messages the user sees.
// Every user-facing error string in the data layer lives here.

export const MESSAGES = {
  noConnection: "No connection. Try again when you're online.",
  timeout: 'The connection is too slow right now. Please try again.',
  invalidCredentials: 'Incorrect email or password.',
  emailNotConfirmed: 'Please confirm your email first',
  emailTaken: 'An account with this email already exists.',
  tooManyEmails: 'Too many emails sent. Please wait a minute and try again.',
  deckNotFound: 'This deck no longer exists.',
  cardNotFound: 'This card no longer exists.',
  googlePlayServices: 'Google sign-in needs Google Play services on this phone. Use email instead.',
  linkExpired: 'This link has expired. Request a new one.',
  samePassword: 'Choose a password different from your old one.',
  weakPassword: 'Password must be at least 8 characters.',
  generic: 'Something went wrong. Please try again.',
} as const;

// Supabase auth error codes -> messages.
const BY_CODE: Record<string, string> = {
  invalid_credentials: MESSAGES.invalidCredentials,
  email_not_confirmed: MESSAGES.emailNotConfirmed,
  user_already_exists: MESSAGES.emailTaken,
  email_exists: MESSAGES.emailTaken,
  over_email_send_rate_limit: MESSAGES.tooManyEmails,
  otp_expired: MESSAGES.linkExpired,
  same_password: MESSAGES.samePassword,
  weak_password: MESSAGES.weakPassword,
};

type ErrorLike = { code?: unknown; name?: unknown; message?: unknown };

function isNetworkError(error: ErrorLike): boolean {
  const message = typeof error.message === 'string' ? error.message : '';
  return (
    error instanceof TypeError ||
    error.name === 'AuthRetryableFetchError' ||
    /network request failed|failed to fetch/i.test(message)
  );
}

export function toUserMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as ErrorLike;
    if (e.name === 'TimeoutError') return MESSAGES.timeout;
    if (isNetworkError(e)) return MESSAGES.noConnection;
    if (typeof e.code === 'string' && BY_CODE[e.code]) return BY_CODE[e.code];
    // Raised by the set_card_user_id trigger when the deck is gone or not yours.
    if (typeof e.message === 'string' && e.message.includes('deck not found')) {
      return MESSAGES.deckNotFound;
    }
  }
  console.error(error);
  return MESSAGES.generic;
}
