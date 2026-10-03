# Design Doc: flashC-buddy, Build Step 1 (Accounts + Decks + Cards)

Status: Accepted (2026-10-03)
Related: [ADR 0001](../decisions/0001-native-android-with-expo.md) ·
[Problem statement](../product/problem-statement.md) ·
[User stories](../product/user-stories-step1.md) ·
[Data model](data-model.md)

## 1. Goals and non-goals

**Goals (this step)**
- Implement user stories 1–9: sign up with email confirmation, log in/out,
  create/rename/delete decks, add/edit/delete cards.
- Set up the project structure, testing and CI that later steps build on.
- Structure the code so that later steps (SM-2, offline, more study modes)
  and the future web app can reuse the logic.

**Non-goals (this step)**
- Studying, SM-2, offline mode (build steps 2–4).
- Polished visual design. Plain, readable screens are enough for now.

## 2. Architecture overview

The app is split into **layers**. Each layer may only use the layer below it.

```
┌─────────────────────────────────────────┐
│ Screens (src/app/)                      │  what the user sees and taps
├─────────────────────────────────────────┤
│ Feature hooks (src/features/*/)         │  screen state: loading, errors, data
├─────────────────────────────────────────┤
│ Data layer (src/data/)                  │  the ONLY code that talks to Supabase
├─────────────────────────────────────────┤
│ Domain (src/domain/)                    │  pure rules: validation, (later) SM-2
└─────────────────────────────────────────┘
                    │
                    ▼
        Supabase (auth + Postgres + RLS)
```

**Why layers?**
- **Replaceable data source.** In build step 3 (offline), only `src/data/`
  changes to read from phone storage first. Screens don't change.
- **Reusable logic.** `src/domain/` has no React or Supabase code, so the
  future web app can copy or share it unchanged.
- **Testable.** Domain code is tested with plain unit tests; the data layer
  is tested with a fake Supabase client.

**Rule:** a screen never imports Supabase directly. If you see
`import { supabase }` outside `src/data/`, that's a bug.

## 3. Folder structure

```
flashc-buddy/
├─ docs/                       decisions, product, design (what we've written)
├─ supabase/
│  └─ migrations/              SQL files that create tables + security rules
├─ src/
│  ├─ app/                     screens (Expo Router: file name = route)
│  │  ├─ (auth)/
│  │  │  ├─ login.tsx
│  │  │  ├─ signup.tsx
│  │  │  └─ check-email.tsx
│  │  └─ (main)/
│  │     ├─ index.tsx               deck list (+ log out button)
│  │     └─ deck/[deckId]/
│  │        ├─ index.tsx            deck detail: card list
│  │        └─ card-form.tsx        add / edit a card
│  ├─ features/
│  │  ├─ auth/      useAuth.ts, AuthProvider.tsx
│  │  ├─ decks/     useDecks.ts, DeckForm.tsx
│  │  └─ cards/     useCards.ts, CardForm.tsx
│  ├─ data/
│  │  ├─ supabaseClient.ts
│  │  ├─ authRepo.ts
│  │  ├─ decksRepo.ts
│  │  ├─ cardsRepo.ts
│  │  └─ errors.ts              turns technical errors into user messages
│  ├─ domain/
│  │  ├─ validation.ts          name/front/back rules from the user stories
│  │  └─ types.ts               Deck, Card types
│  └─ ui/                       shared pieces: Button, TextField, ConfirmDialog, Toast
└─ __tests__/ (or *.test.ts next to files)
```

## 4. Key technology choices (smaller than an ADR)

| Need | Choice | Why |
|---|---|---|
| Project template | `create-expo-app` (TypeScript) | Official, current Expo setup |
| Navigation | **Expo Router** (decision 1) | File-based routes; Expo's default for new projects |
| Talking to Supabase | `@supabase/supabase-js` | Official client |
| Remembering login | Supabase session saved in AsyncStorage | Supabase's documented approach for Expo |
| Detecting offline | `@react-native-community/netinfo` | Needed for "No connection" messages |
| Server data in screens | Hand-written hooks (decision 2) | Keeps loading/error logic visible while learning |
| Database changes | SQL migration files + Supabase CLI (`supabase db push`) | Database setup is versioned in git like code |
| Tests | Jest + `jest-expo` + React Native Testing Library | Standard for Expo |
| CI | GitHub Actions (free for public repos) | Runs typecheck + tests on every push |

## 5. How things flow

### 5.1 Sign up (Story 1)
1. `signup.tsx` validates fields with `domain/validation.ts`. Invalid → show
   field errors, send nothing.
2. If offline (NetInfo) → show "No connection…", send nothing.
3. Calls `authRepo.signUp(email, password)` → Supabase sends the confirmation email.
4. On success → navigate to `check-email.tsx` (has "Resend email", 60s cooldown).
5. Errors (e.g. email already registered) → mapped by `data/errors.ts` to the
   exact messages in the user stories.

### 5.2 Log in / stay logged in / log out (Stories 2–3)
- `AuthProvider` listens to Supabase's auth state and exposes `session` to the app.
- The root layout shows `(auth)` screens when there is no session and
  `(main)` screens when there is. Because the whole group is swapped,
  Back can't return to decks after logging out.
- Unconfirmed email on login → "Please confirm your email first" + resend.

### 5.3 Decks and cards (Stories 4–9)
- Screen → hook (`useDecks` / `useCards`) → repo → Supabase.
- Repos return a **result object** instead of throwing:
  `{ ok: true, data } | { ok: false, error: UserMessage }`.
  Hooks never need try/catch; screens just show `error` if present.
- Deck list fetches decks **with their card count** in one query
  (Supabase can count related rows), per data-model decision D3.
- Delete deck → confirm dialog → `decksRepo.delete(id)`; the database's
  `on delete cascade` removes cards.

## 6. Database setup (first migration)
- Create `decks` and `cards` as in the data model.
- `decks.user_id` **defaults to `auth.uid()`**, so the app never sends it.
- `cards.user_id` is **filled by a database trigger from the card's deck**,
  so it can never mismatch (data-model decision D2). The app never sends it.
- RLS on both tables: select/insert/update/delete only where
  `user_id = auth.uid()`; inserting a card also requires owning the deck.
- Trigger to keep `updated_at` current on every update.
- Check constraints for lengths (1–100 for deck names, 1–500 for card sides),
  so bad data is rejected even if app validation has a bug.

## 7. Error handling (one consistent pattern)

| Situation | How it's shown |
|---|---|
| Invalid input | Message under the field; nothing sent |
| Offline when action needs internet | Toast: "No connection. Try again when you're online." |
| Known server error (wrong password, email taken) | Exact message from the user story |
| Unknown error | Toast: "Something went wrong. Please try again." + logged to console |
| Request in progress | Button disabled + spinner (no double taps) |
| Destructive action | Confirm dialog first |

All error-message text lives in `data/errors.ts` and `domain/validation.ts`,
so it's easy to find and test.

## 8. Testing strategy

Following the test pyramid: many small fast tests, few slow ones.

| Level | What | How |
|---|---|---|
| Unit (most) | `domain/validation.ts`, `data/errors.ts` | Plain Jest, no mocks |
| Data layer | Each repo function: success + error cases | Jest with a fake Supabase client |
| Screens (some) | Forms show errors, buttons disable, navigation | React Native Testing Library |
| Database security | User A cannot read/change User B's decks | Manual checklist against the real Supabase project (automate later) |
| End-to-end | Every acceptance criterion in the user stories | Manual checklist on my Android phone before step 1 is "done" |

**Test-first:** for domain and data-layer code, write the test from the
acceptance criterion first, see it fail, then write the code.

**CI** (GitHub Actions) runs on every push: `tsc --noEmit` (type check),
lint, and `jest`. A red CI means don't build on top of it.

## 9. Configuration and secrets
- Supabase URL and **anon key** go in `.env` (read via Expo's
  `EXPO_PUBLIC_` variables). The anon key is designed to be public;
  RLS is what protects data.
- The **service-role key** must never be in the app or the repo.
- `.env` is git-ignored; `.env.example` (with blank values) is committed.

## 10. Risks and open questions
- **Email confirmation link opens in the phone's browser**, which by default
  lands on a page that doesn't exist. The account is still confirmed.
  v1 accepts this; the check-email screen says "after confirming, come back
  and log in". Revisit with a proper redirect page later.
- **Supabase free tier pauses a project after ~1 week of no activity.**
  Fine for development; it can be resumed from the dashboard.
- **Expo Go limits:** some native libraries don't run in Expo Go. Everything
  in this step does. Offline storage (step 3) may need a development build.

## 11. Decisions
✅ **1. Navigation: Expo Router.** File-based routes are easy to see and are
Expo's default for new projects.
✅ **2. Server data in screens: hand-written hooks.** Chosen for learning:
loading, error and refresh logic stay visible. Revisit TanStack Query if
caching/refetch code grows repetitive.
