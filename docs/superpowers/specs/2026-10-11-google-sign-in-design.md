# Design: "Continue with Google" sign-in

Status: Accepted (2026-10-11) — decisions delegated to Claude ("do what is better")
Related: [ADR 0001](../../decisions/0001-native-android-with-expo.md) ·
[Step 1 design](../../design/design-doc-step1.md) ·
[Step 1 user stories](../../product/user-stories-step1.md)

## 1. Goal and non-goals

**Goal:** a learner can sign up or log in with one tap using their Google account,
next to the existing email + password option.

**Non-goals:** removing email sign-up (it stays as the fallback); Apple sign-in;
iPhone; the paid "Universal" Google Sign-In module; account settings to unlink Google.

## 2. User stories

### Story G1: Continue with Google
As a learner, I want to sign in with my Google account, so that I don't need a
password or an email confirmation step.

**Acceptance criteria**
- Log in and Sign up each show a "Continue with Google" button above the email
  form, separated by an "or" line.
- Tapping it opens Android's Google account picker; choosing an account lands me
  on my deck list (new or returning user — no separate sign-up step, no email
  confirmation).
- The button is disabled with a spinner while signing in (no double taps).
- If I signed up earlier with email + password using the same Google address,
  I land in that same account with the same decks.
- Cancelling the picker shows nothing and leaves me on the screen.
- Offline → "No connection. Try again when you're online."
- No Google Play Services on the phone → "Google sign-in needs Google Play
  services on this phone. Use email instead."
- Any other failure → "Something went wrong. Please try again."

### Story G2: Log out forgets the Google choice
**Acceptance criteria**
- After logging out, the next "Continue with Google" shows the account picker
  again instead of silently reusing the last account.

## 3. How it works

```
Login / Sign-up screen
   │  tap "Continue with Google"
   ▼
authRepo.signInWithGoogle()           (src/data/authRepo.ts)
   │  1. isOnline()?                 no → noConnection
   │  2. getGoogleIdToken()           (src/data/googleAuth.ts → native picker)
   │        cancelled → { ok:true, data:'cancelled' } (screen shows nothing)
   │  3. supabase.auth.signInWithIdToken({ provider:'google', token })
   ▼
Supabase verifies the token with Google, creates or finds the user,
links it to an existing user with the same verified email
   ▼
onAuthStateChange → AuthProvider → root layout swaps to the deck screens
```

- **Library:** `@react-native-google-signin/google-signin` (free "Original" API),
  installed with `npx expo install`, registered as a config plugin in `app.json`.
  `GoogleSignin.configure({ webClientId })` runs once, in `googleAuth.ts`.
- **Layering:** only `src/data/` imports the Google library (same rule as
  Supabase). `googleAuth.ts` wraps it:
  - `isGoogleSignInAvailable(): boolean` — false when the native module is
    missing (Expo Go, tests) → screens hide the button.
  - `getGoogleIdToken(): Promise<GoogleTokenResult>` where
    `GoogleTokenResult = { kind:'token', idToken } | { kind:'cancelled' } | { kind:'error', error }`.
  - `signOutOfGoogle(): Promise<void>` — never throws.
- **authRepo additions:** `signInWithGoogle(): Promise<Result<'signedIn' | 'cancelled'>>` —
  `{ ok:true, data:'cancelled' }` means the user closed the picker (screen shows
  nothing); `signOut()` also calls `signOutOfGoogle()`.
- **Errors** map through `data/errors.ts`; new messages: `googlePlayServices`.
- **Config:** `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (public, like the Supabase key)
  in `.env` / `.env.example` and in EAS environment variables. Missing → the
  Google button is hidden (same as Expo Go), never a crash.

## 4. Decisions

**D1 — Skip Supabase's nonce check.** The free Google library cannot send a nonce,
so Supabase's "Skip nonce check" is turned on. Risk: a stolen Google ID token
could be replayed to sign in during its ~1 hour lifetime. Accepted for this
project; revisit with the paid module or a web OAuth flow if the app grows.

**D2 — Hide the button where Google can't work** (Expo Go, missing client ID)
instead of showing a broken button. Email sign-in keeps working everywhere.

**D3 — Development build replaces Expo Go for daily work.** Add `expo-dev-client`
and an EAS `development` profile (APK, internal). Built once, installed on the
phone; then `npx expo start` + reload as before. A new dev build is needed only
when native dependencies change.

**D4 — Account linking by email** relies on Supabase's automatic linking of
identities with the same verified email. No app code needed; to be verified on the phone (checklist G1.3).

## 5. External setup

| Where | What |
|---|---|
| Google Cloud Console (user's Google account) | Project `flashc-buddy`; OAuth consent screen (External, app name "FlashC Buddy", support email, scopes: email, profile, openid); **Web** OAuth client; **Android** OAuth client with package `com.drofbuilder.flashcbuddy` + SHA-1 of the EAS signing key (from the Expo dashboard credentials page) |
| Supabase → Auth → Providers → Google | Enabled; Client IDs = `<web id>,<android id>` (web first); Skip nonce check = on. No client secret needed for ID-token sign-in. |
| Expo | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in development/preview/production; development + preview builds |

The consent screen stays in **Testing** with the user's Google address as a test
user until the app is shared; publishing with only basic scopes needs no review.

## 6. Testing

- **Unit (Jest, Google library mocked):** `googleAuth` maps success / cancel /
  Play Services missing / other errors; `authRepo.signInWithGoogle` covers
  offline (no picker shown), cancelled, Supabase error, success, and
  `signOut` calling `signOutOfGoogle`.
- **Screens:** button hidden when unavailable; pressing calls `signInWithGoogle`;
  cancelled shows no error; errors shown under the button.
- **Manual on the phone (dev build):** new Google user lands on decks; existing
  email user with the same address sees their decks; cancel; airplane mode;
  log out then the account picker appears again.

## 7. Risks

- **SHA-1 mismatch** (most common failure: "DEVELOPER_ERROR"): the Android
  client must use the EAS keystore's SHA-1. Mitigation: copy it from the Expo
  dashboard, not a local keystore.
- **Google blocks automated browsers** when signing in to Google Cloud:
  the user signs in to Google themselves.
- **Free-tier build minutes:** one development build + one preview build.
