# Continue with Google — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Continue with Google" button to log in and sign up that signs the user in via a Google ID token, alongside email + password.

**Architecture:** `src/data/googleAuth.ts` wraps the native Google Sign-In library (only `src/data/` imports it). `authRepo.signInWithGoogle()` gets the ID token and calls `supabase.auth.signInWithIdToken`; the existing session listener moves the user to the deck screens. The button hides where Google can't work (Expo Go, missing client ID).

**Tech Stack:** `@react-native-google-signin/google-signin` (free API), `expo-dev-client`, Supabase Auth (Google provider), EAS Build, Jest.

**Spec:** `docs/superpowers/specs/2026-10-11-google-sign-in-design.md`

## Global Constraints

- Only files in `src/data/` import `@react-native-google-signin/google-signin` or Supabase.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is the only new config value; missing → Google button hidden, never a crash.
- Exact copy: button `Continue with Google`; divider `or`; Play Services message `Google sign-in needs Google Play services on this phone. Use email instead.`; offline and generic messages reuse `MESSAGES.noConnection` / `MESSAGES.generic`.
- Cancelling the Google picker shows no message.
- Supabase Google provider: Client IDs = `<web>,<android>` (web first), Skip nonce check = on, no client secret.
- Android package `com.drofbuilder.flashcbuddy`; Android OAuth client SHA-1 = the EAS keystore's (Expo dashboard), never a local one.
- Commits authored by drof-builder, no Claude co-author trailer.
- Expo SDK 57: install native packages with `npx expo install`; check current docs before using any Expo/EAS API.

## Review Focus

1. **Missing client ID in a build:** button hidden, email still works → test in Task 2.
2. **Running in Expo Go:** button hidden, no import crash → test in Task 2.
3. **Google succeeds but Supabase rejects the token** (provider off, wrong client IDs): generic message, and Google is signed out so the next tap shows the picker again → test in Task 3.
4. **Picker opened twice by a double tap:** the second tap is ignored (the button runs through `useBusy`) → test in Task 4 (button disabled while busy).
5. **Same address as an existing email account:** lands in the same account and decks → manual check in Task 5.

---

### Task 1: External setup and project config

**Files:**
- Modify: `app.json` (plugin), `eas.json` (`development` profile), `package.json` (deps, jest setup), `.env.example`, `.env` (local only)
- Create: `jest.setup.ts` (Google Sign-In jest mock), if needed by the library's documented jest setup

**Interfaces:**
- Produces: `process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (local `.env` + EAS development/preview/production); installed `@react-native-google-signin/google-signin` and `expo-dev-client`.

- [ ] **Step 1 (user + Claude): Google Cloud.** The user signs in to Google in the Playwright window. Then, in Google Cloud Console:
  - Create project `flashc-buddy`.
  - OAuth consent screen: External, app name `FlashC Buddy`, user's support email, scopes `openid email profile`, status Testing, the user's Google address as a test user.
  - Create a **Web** OAuth client (name `FlashC Buddy web`).
  - Create an **Android** OAuth client: package `com.drofbuilder.flashcbuddy`, SHA-1 copied from expo.dev → project credentials → Android keystore.
  - Record both client IDs. They're public, so no secret is stored.
- [ ] **Step 2: Supabase.** Authentication → Providers → Google: enable it; Client IDs `<web>,<android>`; Skip nonce check on; save. Verify by reopening the page.
- [ ] **Step 3: Config values.** Add `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to `.env` and as a blank entry in `.env.example`. Add it to EAS (`eas env:set … --environment development --environment preview --environment production --visibility plaintext`).
- [ ] **Step 4: Dependencies.**
  - Run `npx expo install @react-native-google-signin/google-signin expo-dev-client`.
  - Add the library's config plugin to `app.json` per its current Expo docs. If it requires `iosUrlScheme`, use `com.googleusercontent.apps.<web client id without .apps.googleusercontent.com>` (iOS isn't built).
  - Add the library's documented Jest mock to the Jest setup.
- [ ] **Step 5: EAS profile.** Add `"development": {"developmentClient": true, "distribution": "internal", "environment": "development", "android": {"buildType": "apk"}}` to `eas.json`.
- [ ] **Step 6: Verify.** `npm test && npm run typecheck && npm run lint` pass; `npx expo-doctor@latest` passes; `npx expo export --platform android` bundles.
- [ ] **Step 7: Commit** `build: add Google Sign-In library, dev client and config`.

### Task 2: `googleAuth` wrapper

**Files:**
- Create: `src/data/googleAuth.ts`
- Test: `src/data/googleAuth.test.ts`

**Interfaces:**
- Produces:
  - `type GoogleTokenResult = { kind: 'token'; idToken: string } | { kind: 'cancelled' } | { kind: 'error'; error: unknown }`
  - `isGoogleSignInAvailable(): boolean` — false when running in Expo Go (`Constants.executionEnvironment === ExecutionEnvironment.StoreClient`), when the client ID is empty, or when the library can't load (lazy `require` in try/catch).
  - `getGoogleIdToken(): Promise<GoogleTokenResult>` — configures once with `webClientId`; calls `hasPlayServices` and `signIn`; a success with no `idToken` → `error`.
  - `signOutOfGoogle(): Promise<void>` — swallows errors.
  - `isPlayServicesError(error: unknown): boolean` — true for the library's `PLAY_SERVICES_NOT_AVAILABLE` status code.

- [ ] **Step 1: Write failing tests:**
  - available is false when the client ID is empty;
  - available is false in Expo Go;
  - a success response gives `{ kind: 'token', idToken: 'tok' }`;
  - a cancelled response gives `{ kind: 'cancelled' }`;
  - a thrown Play Services error gives `kind: 'error'` and `isPlayServicesError(error) === true`;
  - a success without an idToken gives `kind: 'error'`;
  - `signOutOfGoogle` resolves even when the library throws.
- [ ] **Step 2:** `npx jest src/data/googleAuth` → FAIL (module not found).
- [ ] **Step 3:** Implement per the Interfaces block. Read the installed library's types for the exact response and status-code names.
- [ ] **Step 4:** `npx jest src/data/googleAuth` → PASS; full checks pass.
- [ ] **Step 5: Commit** `feat(data): wrap Google Sign-In`.

### Task 3: `authRepo.signInWithGoogle` and sign-out

**Files:**
- Modify: `src/data/authRepo.ts`, `src/data/errors.ts`
- Test: `src/data/authRepo.test.ts`

**Interfaces:**
- Consumes: Task 2's functions; existing `isOnline`, `toUserMessage`, `MESSAGES`.
- Produces:
  - `authRepo.signInWithGoogle(): Promise<Result<'signedIn' | 'cancelled'>>`
  - `MESSAGES.googlePlayServices = 'Google sign-in needs Google Play services on this phone. Use email instead.'`
  - `authRepo.signOut()` also awaits `signOutOfGoogle()`.

- [ ] **Step 1: Write failing tests** (mock `./googleAuth` and `./supabaseClient`):
  - offline → no-connection error, and `getGoogleIdToken` is not called;
  - cancelled → `{ ok: true, data: 'cancelled' }`, and Supabase is not called;
  - Play Services error → `MESSAGES.googlePlayServices`;
  - token → `signInWithIdToken({ provider: 'google', token: 'tok' })` is called and the result is `{ ok: true, data: 'signedIn' }`;
  - Supabase returns an error → generic message, and `signOutOfGoogle` is called (Review Focus 3);
  - `signOut` calls `signOutOfGoogle`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS; full checks pass.
- [ ] **Step 5: Commit** `feat(auth): sign in with a Google ID token`.

### Task 4: "Continue with Google" button on log in and sign up

**Files:**
- Create: `src/features/auth/GoogleButton.tsx`
- Modify: `src/app/(auth)/login.tsx`, `src/app/(auth)/signup.tsx`
- Test: `src/features/auth/GoogleButton.test.tsx`, plus additions to `__tests__/screens/login.test.tsx`

**Interfaces:**
- Consumes: `isGoogleSignInAvailable`, `authRepo.signInWithGoogle`, `Button`, `useBusy`.
- Produces: `<GoogleButton />`. It renders nothing when unavailable; otherwise a `Continue with Google` button, an `or` divider below it, and its own error text. The button runs through `useBusy` and passes `loading`.

- [ ] **Step 1: Write failing tests:**
  - hidden when unavailable;
  - pressing calls `signInWithGoogle` once;
  - cancelled shows no text;
  - an error shows its message;
  - the button is disabled while `loading` (Review Focus 4, via `Button`'s `loading`);
  - the login screen renders `Continue with Google` when available.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; place `<GoogleButton />` at the top of both screens.
- [ ] **Step 4:** Run → PASS; full checks pass; Android export bundles.
- [ ] **Step 5: Commit** `feat(auth): add Continue with Google button`.

### Task 5: Dev build, phone check, release

**Files:**
- Modify: `docs/checklists/step1-acceptance.md` (Google rows), `README.md` (dev-build note)

- [ ] **Step 1:** `eas build -p android --profile development --non-interactive --no-wait`; wait for `FINISHED`; give the user the install link.
- [ ] **Step 2 (user, phone):**
  - New Google user lands on decks.
  - An existing email user with the same address sees their own decks (Review Focus 5).
  - Cancel shows nothing.
  - Airplane mode shows the no-connection message.
  - After logging out, the account picker appears again.
  - Fix any failure with a test first.
- [ ] **Step 3:** Add the Google rows to the checklist and the dev-build note to the README; commit `docs: Google sign-in checks and dev build`.
- [ ] **Step 4:** Final whole-branch review; fix Critical/Important findings test-first.
- [ ] **Step 5:** Push the branch, open a PR into `master` (includes `apk-build`), wait for green CI, and merge.
- [ ] **Step 6:** `eas build -p android --profile preview` for the updated APK (version 1.1.0 in `app.json` before building).
