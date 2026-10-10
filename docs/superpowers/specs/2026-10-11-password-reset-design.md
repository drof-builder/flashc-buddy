# Design: Forgot password + email links that open the app

Status: Accepted (2026-10-11) · Issues: #4 (forgot password), #5 (confirmation link)
Related: [Step 1 design](../../design/design-doc-step1.md) · [Google sign-in design](2026-10-11-google-sign-in-design.md)

## User stories

**R1 — Forgot password.** As a learner who forgot my password, I want a reset link by
email, so I can get back into my account.
- "Forgot password?" on Log in opens a screen with an email field and "Send reset link".
- After sending it always says: "If an account exists for this email, we sent a reset
  link." (never reveals whether the email is registered).
- Resend is disabled for 60 s after each send. Invalid email → field error, nothing sent.
  Offline → "No connection. Try again when you're online."

**R2 — Set a new password.**
- The email link opens FlashC Buddy on "Set new password" (new + confirm, 8+ characters).
- Success → toast "Password updated." → deck list.
- Expired or used link → "This link has expired. Request a new one." + "Back to log in"
  (signed out; Log in has "Forgot password?") or "Back to decks" (signed in). Supabase's
  error link carries no type, so reset and confirmation errors look the same. Was: a button to
  "Forgot password?".
- "Cancel" logs out, so a half-finished reset never leaves the user signed in.

**C1 — Confirmation link opens the app.**
- After sign up, the confirmation link opens FlashC Buddy and signs the user in.
- Expired link → the same expired message + a button back to Log in (resend lives there).

**Non-goals:** a web page for links opened on a laptop (new issue); custom email service
(new issue); keeping the reset screen after the app is killed mid-reset.

## How it works

```
email link → Supabase verifies → flashcbuddy://auth-callback#access_token=…&refresh_token=…&type=recovery|signup
                                   (or #error_code=otp_expired&error_description=…)
auth-callback screen:
  parseAuthLink(url)            (src/domain/authLink.ts, pure)
  type=recovery → AuthProvider.setRecovering(true) BEFORE signing in
  authRepo.completeAuthLink(url) → supabase.auth.setSession(tokens)
  recovery → "(recovery)/set-password"   signup → decks
```

- Redirect URL constant `AUTH_REDIRECT_URL = 'flashcbuddy://auth-callback'` (data layer),
  used by `resetPasswordForEmail(..., { redirectTo })` and `signUp(..., { options: { emailRedirectTo } })`.
- Supabase → Authentication → URL Configuration → Redirect URLs: `flashcbuddy://**`.
- Routing: `auth-callback` sits outside the protected groups (reachable signed in or out).
  AuthProvider status gains `'recovering'` (signed in, but must set a password first):
  the root layout shows the `(recovery)` group only in that state.
- Data layer: `authRepo.requestPasswordReset(email)`, `authRepo.completeAuthLink(url)`
  → `Result<'recovery' | 'signup'>`, `authRepo.updatePassword(password)`.
- New messages: `linkExpired`, `resetEmailSent`; `otp_expired` / `access_denied` map to
  `linkExpired`.

## Testing
- Unit: `parseAuthLink` (fragment and query forms, recovery/signup, error link, missing
  tokens, unrelated URL); each new authRepo function incl. offline and errors.
- Screens: forgot password (validation, generic success text, cooldown), set password
  (validation, success, cancel logs out), auth-callback (recovery → set password,
  signup → home, expired → message).
- Phone (development build): real reset email → link opens app → new password works;
  new sign-up → confirmation link opens app signed in.

## Risks
- Supabase's built-in email sender is heavily rate-limited (a few per hour) — testing
  may show "Too many emails sent". Fix later with a custom SMTP provider (new issue).
- Links opened on a laptop can't open the app (new issue for a fallback web page).
