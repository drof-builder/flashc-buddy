# Build Step 1 — Acceptance Checklist

One line per acceptance criterion in `docs/product/user-stories-step1.md`.
**Auto** = covered by an automated test (`npm test`). **Phone** = check by hand
on Android with Expo Go. Mark Phone items ✅ / ❌ and note any problem.

How to run: `npx expo start` in the project folder, scan the QR code with Expo Go.
For "offline" items, turn on **airplane mode**.

## Story 1 — Sign up
| # | Criterion | Auto | Phone |
|---|---|---|---|
| 1.1 | Email, password, confirm-password fields | ✅ | ☐ |
| 1.2 | Invalid email / password < 8 shows field error, nothing sent | ✅ | ☐ |
| 1.3 | Mismatched passwords → "Passwords don't match." | ✅ | ☐ |
| 1.4 | Registered email → "An account with this email already exists." | ✅ | ☐ |
| 1.5 | Offline → "No connection. Try again when you're online." | ✅ | ☐ |
| 1.6 | Button disabled while sending (no double sign-up) | ✅ | ☐ |
| 1.7 | Success → "Check your email" screen | ✅ | ☐ |
| 1.8 | "Resend email" disabled 60 s after each send | — | ☐ |
| 1.9 | Link in email confirms account; return to app and log in | — | ☐ |

## Story 2 — Log in
| # | Criterion | Auto | Phone |
|---|---|---|---|
| 2.1 | Wrong email or password → "Incorrect email or password." | ✅ | ☐ |
| 2.2 | Offline → no-connection message | ✅ | ☐ |
| 2.3 | Unconfirmed email → "Please confirm your email first" + Resend | ✅ | ☐ |
| 2.4 | Success → deck list with all my decks | — | ☐ |
| 2.5 | Close and reopen the app → still logged in | — | ☐ |
| 2.6 | Leave app in background 1+ hour, reopen → still logged in | — | ☐ |
| 2.7 | Close app 1+ hour, open it in **airplane mode** → still on decks (shows "No connection"), not login | ✅ | ☐ |

## Story 3 — Log out
| # | Criterion | Auto | Phone |
|---|---|---|---|
| 3.1 | "Log out" button on the deck list | ✅ | ☐ |
| 3.2 | Asks "Log out?" with Cancel / Log out | ✅ | ☐ |
| 3.3 | After logging out, Back does not return to decks | — | ☐ |
| 3.4 | In **airplane mode** after 1+ hour, Log out still logs out | ✅ | ☐ |

## Story 4 — Create a deck
| # | Criterion | Auto | Phone |
|---|---|---|---|
| 4.1 | "New deck" opens a name field | ✅ | ☐ |
| 4.2 | Empty or spaces-only name → error, nothing saved | ✅ | ☐ |
| 4.3 | Name max 100 characters (emoji count as 1) | ✅ | ☐ |
| 4.4 | New deck appears in the list immediately | ✅ | ☐ |
| 4.5 | Deck appears when logged in on another phone | — | ☐ |

## Story 5 — Rename a deck
| # | Criterion | Auto | Phone |
|---|---|---|---|
| 5.1 | Same rules as creating | ✅ | ☐ |
| 5.2 | New name shows immediately and on other devices | ✅ / — | ☐ |

## Story 6 — Delete a deck
| # | Criterion | Auto | Phone |
|---|---|---|---|
| 6.1 | Confirm: "Delete '<name>' and its N cards? This can't be undone." | ✅ | ☐ |
| 6.2 | Deck and all its cards deleted | DB cascade | ☐ |
| 6.3 | Disappears from list immediately and on other devices | ✅ / — | ☐ |

## Story 7 — Add a card
| # | Criterion | Auto | Phone |
|---|---|---|---|
| 7.1 | "Add card" opens Front / Back form | ✅ | ☐ |
| 7.2 | Neither side empty or spaces-only | ✅ | ☐ |
| 7.3 | Each side max 500 characters | ✅ | ☐ |
| 7.4 | Card appears in the deck; deck's card count updates | — | ☐ |
| 7.5 | "Save and add another" — add 20 cards quickly | ✅ | ☐ |

## Story 8 — Edit a card
| # | Criterion | Auto | Phone |
|---|---|---|---|
| 8.1 | Same rules as adding | ✅ | ☐ |
| 8.2 | Edit doesn't reset study progress (no progress exists until step 2) | n/a | n/a |

## Story 9 — Delete a card
| # | Criterion | Auto | Phone |
|---|---|---|---|
| 9.1 | Asks for confirmation | ✅ | ☐ |
| 9.2 | Card removed; deck's card count updates | — | ☐ |

## Applies to all
| # | Criterion | Auto | Phone |
|---|---|---|---|
| A.1 | Only my own decks and cards (database-enforced) | see `rls-check.md` | ☐ two-user check |
| A.2 | Offline actions show a clear message, never freeze | ✅ | ☐ |
| A.3 | Very slow / stalled network: Save gives up after ~15 s with a message, not an endless spinner | ✅ | ☐ |

## Automated checks (Claude, 2026-10-10)
- `npm test` — 98 tests passing (after final-review fixes)
- `npm run typecheck` — passing
- `npm run lint` — passing
- `npx expo export --platform android` — bundles (1324 modules)

## Google sign-in (spec: docs/superpowers/specs/2026-10-11-google-sign-in-design.md)
Needs the **development build** (or an APK from version 1.1.0) — Expo Go hides the button.

| # | Criterion | Auto | Phone |
|---|---|---|---|
| G1.1 | "Continue with Google" above the email form on Log in and Sign up, with an "or" line | ✅ | ☐ |
| G1.2 | Choosing an account lands on the deck list; no email confirmation | ✅ (repo) | ☐ |
| G1.3 | Same address as an existing email account → same account, same decks | — | ☐ |
| G1.4 | Closing the picker shows nothing | ✅ | ☐ |
| G1.5 | Airplane mode → "No connection. Try again when you're online." | ✅ | ☐ |
| G1.6 | Button shows a spinner while signing in; double tap does nothing extra | ✅ | ☐ |
| G2.1 | After Log out, the next "Continue with Google" shows the account picker again | ✅ | ☐ |
| G2.2 | Sign in with Google, fully close the app, reopen it, Log out, then "Continue with Google" → the picker shows | ✅ | ☐ |
| G.3 | In Expo Go the Google button is hidden and email still works | ✅ | ☐ |
