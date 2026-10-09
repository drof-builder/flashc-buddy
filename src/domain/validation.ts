// Input rules from the user stories. Each validator returns an error message
// to show the user, or null when the input is valid.
// The database enforces the same limits (see supabase/migrations); these
// checks exist to give fast, friendly feedback before anything is sent.

const DECK_NAME_MAX = 100;
const CARD_SIDE_MAX = 500;
const PASSWORD_MIN = 8;

/**
 * Length of the trimmed text in Unicode code points.
 * Matches Postgres char_length, so an emoji counts as 1 (JS .length says 2).
 */
export function textLength(text: string): number {
  return [...text.trim()].length;
}

export function validateDeckName(name: string): string | null {
  const length = textLength(name);
  if (length === 0) return "Name can't be empty.";
  if (length > DECK_NAME_MAX) return `Name must be ${DECK_NAME_MAX} characters or fewer.`;
  return null;
}

export function validateCardSide(text: string, side: 'Front' | 'Back'): string | null {
  const length = textLength(text);
  if (length === 0) return `${side} can't be empty.`;
  if (length > CARD_SIDE_MAX) return `${side} must be ${CARD_SIDE_MAX} characters or fewer.`;
  return null;
}

// Deliberately simple: something@something.something. Supabase is the real authority.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  return EMAIL_PATTERN.test(email.trim()) ? null : 'Enter a valid email address.';
}

export function validatePassword(password: string): string | null {
  return password.length >= PASSWORD_MIN
    ? null
    : `Password must be at least ${PASSWORD_MIN} characters.`;
}

export function validatePasswordsMatch(password: string, confirm: string): string | null {
  return password === confirm ? null : "Passwords don't match.";
}
