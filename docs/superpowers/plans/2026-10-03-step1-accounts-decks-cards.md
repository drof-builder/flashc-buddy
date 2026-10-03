# Build Step 1 (Accounts + Decks + Cards) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working Android app (via Expo Go) where a user can sign up with email confirmation, log in/out, and create/rename/delete decks and add/edit/delete cards, all stored in Supabase and protected by RLS.

**Architecture:** Four layers — screens (`src/app`, Expo Router) → feature hooks (`src/features`) → data layer (`src/data`, the only code importing Supabase) → domain (`src/domain`, pure TS). Repos return `Result<T>` objects instead of throwing. The database enforces ownership, lengths and cascades itself.

**Tech Stack:** Expo (latest SDK via `create-expo-app`), TypeScript, Expo Router, `@supabase/supabase-js`, AsyncStorage, `@react-native-community/netinfo`, Jest + `jest-expo` + React Native Testing Library, Supabase CLI, GitHub Actions. Node v24 / npm 11 already installed.

**Spec:** `docs/design/design-doc-step1.md` (with `docs/design/data-model.md` and `docs/product/user-stories-step1.md`)

**Working mode (learner):** Claude implements; the user makes decisions and answers the "Learning check" at the end of each task before the next task starts.

## Global Constraints

- Only files under `src/data/` may import `@supabase/supabase-js` or `src/data/supabaseClient.ts`.
- `src/domain/` imports nothing from React, React Native, Expo or Supabase.
- Repo functions never throw; they return `Result<T> = { ok: true; data: T } | { ok: false; error: string }` where `error` is a user-facing message.
- The app never sends `user_id`; the database sets it (decks: default `auth.uid()`, cards: trigger from deck).
- Deck name: 1–100 characters after trimming. Card front/back: 1–500 characters after trimming. Length counted in Unicode code points (same as Postgres `char_length`).
- Password: at least 8 characters.
- Exact user-facing messages (copy verbatim):
  - `Passwords don't match.`
  - `An account with this email already exists.`
  - `No connection. Try again when you're online.`
  - `Incorrect email or password.`
  - `Please confirm your email first`
  - `Something went wrong. Please try again.`
  - Delete deck confirm: `Delete '<name>' and its N cards? This can't be undone.`
  - Logout confirm: title `Log out?`, buttons `Cancel` / `Log out`
- Buttons that start a request are disabled (opacity 0.5) until it finishes.
- Secrets: `.env` is git-ignored; only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are used. The service-role key never appears in the repo.
- Every file Claude writes is UTF-8; never round-trip files through Windows PowerShell `Get-Content`/`Set-Content` without `-Encoding utf8`.

## Review Focus

1. **Emoji / non-Latin text in names** — JS `.length` counts UTF-16 units but Postgres `char_length` counts code points; a 100-emoji deck name must be accepted by both or rejected by both. → test in Task 2.
2. **Sign up with an already-registered email** — with email confirmation on, Supabase returns success with `user.identities` empty instead of an error; the user must still see `An account with this email already exists.` → test in Task 4.
3. **Leading/trailing spaces** — `"  Biology  "` is saved as `"Biology"`; `"   "` is rejected by app and DB. → tests in Tasks 2 and 6.
4. **Double-tap on submit** — two quick taps create one deck/account, not two. → test in Task 6.
5. **App reopened after hours in background** — user is still logged in (session refreshed via `AppState` + `startAutoRefresh`), not bounced to login. → manual check in Task 8.

---

### Task 1: Project scaffold, test runner and CI

**Files:**
- Create (via generator): `package.json`, `app.json`, `tsconfig.json`, `src/app/_layout.tsx`, `src/app/index.tsx`
- Create: `.gitattributes`, `.env.example`, `jest.config.js` (or `jest` key in `package.json`), `__tests__/smoke.test.ts`, `.github/workflows/ci.yml`
- Modify: `.gitignore` (add `.env`)

**Interfaces:**
- Produces: npm scripts `test` (`jest`), `typecheck` (`tsc --noEmit`), `lint` (`expo lint`).

- [ ] **Step 1:** Generate the Expo default (Expo Router + TypeScript) template into a temp folder (`npx create-expo-app@latest ../flashc-buddy-tmp`), move its contents into the repo root (keeping `docs/` and `.git/`), run `npm run reset-project` to clear the example screens, and move routes to `src/app/` (Expo Router supports `src/app`). Set `app.json` → `name: "FlashC Buddy"`, `slug: "flashc-buddy"`.
- [ ] **Step 2:** Add `.gitattributes` with `* text=auto eol=lf` and `*.png binary`, `*.jpg binary`; add `.env` to `.gitignore`; add `.env.example` with the two `EXPO_PUBLIC_` keys blank.
- [ ] **Step 3:** Install test deps (`npx expo install jest-expo jest @testing-library/react-native -- --save-dev`, plus `@types/jest`), set Jest preset to `jest-expo`, add the three npm scripts.
- [ ] **Step 4: Write smoke test** `__tests__/smoke.test.ts`: `expect(1 + 1).toBe(2)`.
- [ ] **Step 5:** Run `npm test && npm run typecheck && npm run lint`. Expected: all pass.
- [ ] **Step 6:** Add `.github/workflows/ci.yml`: on push/PR, Node 24, `npm ci`, then typecheck, lint, test.
- [ ] **Step 7: Verify on phone:** `npx expo start`, scan QR with Expo Go on Android. Expected: blank app screen loads.
- [ ] **Step 8: Commit** `chore: scaffold Expo app with tests and CI`

**Learning check:** What does `npm test` run, and why does CI run the same commands on every push?

---

### Task 2: Domain types and validation (test-first)

**Files:**
- Create: `src/domain/types.ts`, `src/domain/validation.ts`
- Test: `src/domain/validation.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `type Result<T> = { ok: true; data: T } | { ok: false; error: string }`
  - `type Deck = { id: string; name: string; cardCount: number; createdAt: string; updatedAt: string }`
  - `type Card = { id: string; deckId: string; front: string; back: string; createdAt: string; updatedAt: string }`
- Produces (`validation.ts`) — each returns an error message or `null` when valid:
  - `validateEmail(email: string): string | null` → `"Enter a valid email address."`
  - `validatePassword(password: string): string | null` → `"Password must be at least 8 characters."`
  - `validatePasswordsMatch(password: string, confirm: string): string | null` → `"Passwords don't match."`
  - `validateDeckName(name: string): string | null` → `"Name can't be empty."` / `"Name must be 100 characters or fewer."`
  - `validateCardSide(text: string, side: 'Front' | 'Back'): string | null` → `"<side> can't be empty."` / `"<side> must be 500 characters or fewer."`
  - `textLength(text: string): number` — code-point length of the trimmed text (`[...text.trim()].length`)

- [ ] **Step 1: Write failing tests** in `validation.test.ts`:

```ts
expect(validateDeckName('')).toBe("Name can't be empty.");
expect(validateDeckName('   ')).toBe("Name can't be empty.");
expect(validateDeckName('  Biology  ')).toBeNull();
expect(validateDeckName('a'.repeat(100))).toBeNull();
expect(validateDeckName('a'.repeat(101))).toBe('Name must be 100 characters or fewer.');
expect(validateDeckName('😀'.repeat(100))).toBeNull();          // Review Focus 1
expect(validateDeckName('😀'.repeat(101))).toBe('Name must be 100 characters or fewer.');
expect(validateCardSide('', 'Front')).toBe("Front can't be empty.");
expect(validateCardSide('b'.repeat(501), 'Back')).toBe('Back must be 500 characters or fewer.');
expect(validateCardSide('ok', 'Back')).toBeNull();
expect(validateEmail('not-an-email')).toBe('Enter a valid email address.');
expect(validateEmail('me@example.com')).toBeNull();
expect(validatePassword('1234567')).toBe('Password must be at least 8 characters.');
expect(validatePassword('12345678')).toBeNull();
expect(validatePasswordsMatch('abcdefgh', 'abcdefgX')).toBe("Passwords don't match.");
```

- [ ] **Step 2:** Run `npx jest src/domain` — Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `types.ts` and `validation.ts` per the Interfaces block. Email check: a simple `something@something.something` pattern; the server is the real authority.
- [ ] **Step 4:** Run `npx jest src/domain` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(domain): add types and validation rules`

**Learning check:** Why does `'😀'.length` give 2 in JavaScript, and why does that matter for the 100-character rule?

---

### Task 3: Database schema, security and Supabase project

**Files:**
- Create: `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/<timestamp>_decks_and_cards.sql`
- Create: `docs/checklists/rls-check.md`

**Interfaces:**
- Produces tables `public.decks(id, user_id, name, created_at, updated_at)` and `public.cards(id, deck_id, user_id, front, back, created_at, updated_at)` exactly as in `docs/design/data-model.md`.

- [ ] **Step 1 (user action):** Create a free Supabase project at supabase.com. In Authentication settings: keep **Confirm email ON**, set **minimum password length to 8** (default is 6). Copy Project URL and anon key into a local `.env`.
- [ ] **Step 2:** `npx supabase init`, `npx supabase login`, `npx supabase link --project-ref <ref>`.
- [ ] **Step 3:** Write the migration. Required contents:

```sql
-- decks
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index decks_user_id_idx on public.decks(user_id);

-- cards
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  front text not null check (char_length(btrim(front)) between 1 and 500),
  back  text not null check (char_length(btrim(back))  between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cards_deck_id_idx on public.cards(deck_id);

-- cards.user_id always copied from the deck; fails if the deck isn't visible (not yours)
create function public.set_card_user_id() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  select d.user_id into new.user_id from public.decks d where d.id = new.deck_id;
  if new.user_id is null then
    raise exception 'deck not found';
  end if;
  return new;
end $$;
create trigger cards_set_user_id before insert or update of deck_id on public.cards
  for each row execute function public.set_card_user_id();

-- updated_at
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger decks_touch before update on public.decks
  for each row execute function public.touch_updated_at();
create trigger cards_touch before update on public.cards
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.decks enable row level security;
alter table public.cards enable row level security;
create policy "own decks" on public.decks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own cards" on public.cards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
```

- [ ] **Step 4:** `npx supabase db push`. Expected: migration applied, no errors.
- [ ] **Step 5:** Write `docs/checklists/rls-check.md` and run it in the Supabase dashboard (Table Editor / SQL editor, or later from the app with two accounts): User B cannot see, rename or delete User A's deck; inserting a card into User A's deck as User B fails; deleting a deck removes its cards; inserting a name of only spaces fails. Record pass/fail.
- [ ] **Step 6: Commit** `feat(db): add decks and cards tables with RLS`

**Learning check:** If someone edits the app to send another user's `deck_id` when adding a card, what stops it?

---

### Task 4: Data layer foundation and auth repo

**Files:**
- Create: `src/data/supabaseClient.ts`, `src/data/network.ts`, `src/data/errors.ts`, `src/data/authRepo.ts`
- Test: `src/data/errors.test.ts`, `src/data/authRepo.test.ts`

**Interfaces:**
- Consumes: `Result<T>` from Task 2.
- Produces:
  - `supabase` client (AsyncStorage session storage, `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`), plus an `AppState` listener calling `supabase.auth.startAutoRefresh()` / `stopAutoRefresh()`.
  - `isOnline(): Promise<boolean>` (NetInfo; treat `isConnected === false` as offline).
  - `toUserMessage(error: unknown): string` — maps Supabase auth codes `invalid_credentials` → `Incorrect email or password.`, `email_not_confirmed` → `Please confirm your email first`, `user_already_exists` → `An account with this email already exists.`, network failures (`TypeError` / "Network request failed") → `No connection. Try again when you're online.`, anything else → `Something went wrong. Please try again.` (and `console.error` the original).
  - `authRepo.signUp(email: string, password: string): Promise<Result<void>>`
  - `authRepo.signIn(email: string, password: string): Promise<Result<void>>`
  - `authRepo.signOut(): Promise<Result<void>>`
  - `authRepo.resendConfirmation(email: string): Promise<Result<void>>`
  - `authRepo.onSessionChange(cb: (signedIn: boolean) => void): () => void` (returns unsubscribe)
  - Every repo function first checks `isOnline()` and returns the no-connection error without calling Supabase when offline.

- [ ] **Step 1: Write failing tests** (`jest.mock` `supabaseClient` and `network`):
  - `toUserMessage({ code: 'invalid_credentials' })` → `'Incorrect email or password.'`; same for the other codes; `toUserMessage(new TypeError('Network request failed'))` → no-connection message; `toUserMessage('weird')` → generic message.
  - `signUp` when offline → `{ ok: false, error: "No connection. Try again when you're online." }` and Supabase not called.
  - `signUp` when Supabase returns `{ data: { user: { identities: [] } }, error: null }` → `{ ok: false, error: 'An account with this email already exists.' }` (Review Focus 2).
  - `signUp` success → `{ ok: true, data: undefined }`.
  - `signIn` with `{ error: { code: 'invalid_credentials' } }` → incorrect-credentials message.
- [ ] **Step 2:** Run `npx jest src/data` — Expected: FAIL.
- [ ] **Step 3:** Implement the four files per the Interfaces block.
- [ ] **Step 4:** Run `npx jest src/data` — Expected: PASS. Run `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(data): add Supabase client, error mapping and auth repo`

**Learning check:** Why does `signUp` need a special check for `identities: []` instead of just looking at `error`?

---

### Task 5: Auth screens and session routing (Stories 1–2)

**Files:**
- Create: `src/ui/Button.tsx`, `src/ui/TextField.tsx`, `src/ui/Toast.tsx`, `src/ui/confirm.ts`
- Create: `src/features/auth/AuthProvider.tsx` (exports `AuthProvider`, `useAuth`)
- Create: `src/app/(auth)/login.tsx`, `src/app/(auth)/signup.tsx`, `src/app/(auth)/check-email.tsx`, `src/app/(main)/index.tsx` (placeholder "Your decks")
- Modify: `src/app/_layout.tsx`
- Test: `src/app/(auth)/signup.test.tsx`, `src/app/(auth)/login.test.tsx`

**Interfaces:**
- Consumes: `authRepo` (Task 4), validators (Task 2).
- Produces:
  - `Button` props `{ title: string; onPress: () => void; disabled?: boolean; loading?: boolean }` (disabled or loading → opacity 0.5, no presses).
  - `TextField` props `{ label: string; value: string; onChangeText: (t: string) => void; error?: string | null; secureTextEntry?: boolean }`.
  - `showToast(message: string): void` (auto-dismiss 2.5s) and `<ToastHost />` mounted in the root layout.
  - `confirm(title: string, message: string, confirmLabel: string): Promise<boolean>` (wraps `Alert.alert`, destructive style).
  - `useAuth(): { status: 'loading' | 'signedOut' | 'signedIn' }`.
  - Root layout: shows `(auth)` group when `signedOut`, `(main)` when `signedIn`, a spinner while `loading`.
  - `check-email` screen receives `email` as a route param; "Resend email" disabled for 60 s after each send; text tells the user to come back and log in after confirming.

- [ ] **Step 1: Write failing screen tests** (mock `authRepo`):
  - Signup: pressing "Sign up" with mismatched passwords shows `Passwords don't match.` and `authRepo.signUp` is not called.
  - Signup: while `signUp` is pending, the button is disabled; a second press does not call `signUp` again.
  - Signup: on success, navigates to `check-email` with the email param.
  - Login: `signIn` returning `Please confirm your email first` shows that text and a "Resend email" button.
- [ ] **Step 2:** Run tests — Expected: FAIL.
- [ ] **Step 3:** Implement UI components, provider, layout and screens.
- [ ] **Step 4:** Run `npm test && npm run typecheck` — Expected: PASS.
- [ ] **Step 5: Verify on phone:** sign up with a real email → check-email screen → confirm via email link → log in → placeholder deck list. Close and reopen the app → still logged in.
- [ ] **Step 6: Commit** `feat(auth): add sign up, email confirmation and log in`

**Learning check:** After log out, why can't the Back button return to the deck list?

---

### Task 6: Decks — list, create, rename, delete, log out (Stories 3–6)

**Files:**
- Create: `src/data/decksRepo.ts`, `src/features/decks/useDecks.ts`, `src/features/decks/DeckForm.tsx`
- Modify: `src/app/(main)/index.tsx`
- Test: `src/data/decksRepo.test.ts`, `src/app/(main)/index.test.tsx`

**Interfaces:**
- Consumes: `Deck`, `Result`, `validateDeckName` (Task 2); `isOnline`, `toUserMessage`, `supabase` (Task 4); `Button`, `TextField`, `confirm`, `showToast`, `authRepo.signOut` (Tasks 4–5).
- Produces:
  - `decksRepo.listDecks(): Promise<Result<Deck[]>>` — one query `select('id, name, created_at, updated_at, cards(count)')`, ordered by `created_at` desc, mapped to `Deck` (snake_case → camelCase, `cardCount` from the count).
  - `decksRepo.createDeck(name: string): Promise<Result<Deck>>` — saves `name.trim()`.
  - `decksRepo.renameDeck(id: string, name: string): Promise<Result<Deck>>` — saves `name.trim()`.
  - `decksRepo.deleteDeck(id: string): Promise<Result<void>>`.
  - `useDecks(): { decks: Deck[]; loading: boolean; error: string | null; refresh(): Promise<void>; create(name: string): Promise<string | null>; rename(id: string, name: string): Promise<string | null>; remove(id: string): Promise<string | null> }` — mutations return `null` on success or the error message; list refreshes after each successful mutation.

- [ ] **Step 1: Write failing tests:**
  - `listDecks` maps `{ id, name, created_at, updated_at, cards: [{ count: 3 }] }` → `{ id, name, createdAt, updatedAt, cardCount: 3 }`.
  - `createDeck('  Biology  ')` sends `{ name: 'Biology' }` and no `user_id` (Review Focus 3).
  - Offline → no-connection error, Supabase not called.
  - Deck list screen: two rapid presses on "Save" in the new-deck form call `create` once (Review Focus 4).
  - Deck list screen: "Delete" on deck `Biology` with 3 cards calls `confirm` with `Delete 'Biology' and its 3 cards? This can't be undone.`; cancelling does not call `remove`.
  - Deck list screen: "Log out" calls `confirm('Log out?', …, 'Log out')` and only then `authRepo.signOut`.
- [ ] **Step 2:** Run tests — Expected: FAIL.
- [ ] **Step 3:** Implement repo, hook, form and screen (empty state text when no decks; error text + retry when loading fails).
- [ ] **Step 4:** Run `npm test && npm run typecheck` — Expected: PASS.
- [ ] **Step 5: Verify on phone:** create, rename, delete decks; log out; log in on a second device (or Expo Go on another phone / emulator) and see the same decks.
- [ ] **Step 6: Commit** `feat(decks): add deck list with create, rename, delete and log out`

**Learning check:** The deck list shows "3 cards" — where does that 3 come from, given there is no `card_count` column?

---

### Task 7: Cards — list, add, edit, delete (Stories 7–9)

**Files:**
- Create: `src/data/cardsRepo.ts`, `src/features/cards/useCards.ts`, `src/features/cards/CardForm.tsx`
- Create: `src/app/(main)/deck/[deckId]/index.tsx`, `src/app/(main)/deck/[deckId]/card-form.tsx`
- Modify: `src/app/(main)/index.tsx` (tap deck → deck detail)
- Test: `src/data/cardsRepo.test.ts`, `src/app/(main)/deck/[deckId]/card-form.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Result`, `validateCardSide` (Task 2); data foundation (Task 4); UI pieces (Task 5).
- Produces:
  - `cardsRepo.listCards(deckId: string): Promise<Result<Card[]>>` ordered by `created_at` asc.
  - `cardsRepo.createCard(deckId: string, front: string, back: string): Promise<Result<Card>>` — trims both, never sends `user_id`.
  - `cardsRepo.updateCard(id: string, front: string, back: string): Promise<Result<Card>>` — updates only `front`/`back`.
  - `cardsRepo.deleteCard(id: string): Promise<Result<void>>`.
  - `useCards(deckId: string)` — same shape as `useDecks` with `create(front, back)`, `update(id, front, back)`, `remove(id)`.
  - `card-form` route params: `deckId` (required), `cardId` (optional → edit mode, prefilled).

- [ ] **Step 1: Write failing tests:**
  - `createCard('d1', ' Q ', ' A ')` sends `{ deck_id: 'd1', front: 'Q', back: 'A' }` with no `user_id`.
  - `updateCard` sends only `front` and `back`.
  - Card form: empty Back shows `Back can't be empty.` and does not save.
  - Card form: "Save and add another" saves, clears both fields, and stays on the form; "Save" saves and goes back.
  - Deleting a card asks for confirmation first.
- [ ] **Step 2:** Run tests — Expected: FAIL.
- [ ] **Step 3:** Implement repo, hook, form, deck detail screen (card list, Add card, edit on tap, delete with confirm; if the deck no longer exists, show the error and go back to the list).
- [ ] **Step 4:** Run `npm test && npm run typecheck` — Expected: PASS.
- [ ] **Step 5: Verify on phone:** add 20 cards using "Save and add another"; edit one; delete one; deck count on the list updates.
- [ ] **Step 6: Commit** `feat(cards): add card list, add, edit and delete`

**Learning check:** Why does adding a card send `deck_id` but not `user_id`?

---

### Task 8: Step 1 acceptance

**Files:**
- Create: `docs/checklists/step1-acceptance.md`

- [ ] **Step 1:** Write `step1-acceptance.md`: one checkbox per acceptance criterion in `docs/product/user-stories-step1.md` (Stories 1–9 + the two "applies to all" rules), plus Review Focus 5: background the app for 1+ hour, reopen → still logged in.
- [ ] **Step 2 (user + Claude):** Walk through the checklist on the Android phone, with airplane mode for the "No connection" criteria. Record pass/fail; any failure becomes a fix task before step 1 is done.
- [ ] **Step 3:** Re-run `docs/checklists/rls-check.md` from the app with two accounts.
- [ ] **Step 4:** Run `npm test && npm run typecheck && npm run lint` — Expected: all pass.
- [ ] **Step 5: Commit** `docs: record step 1 acceptance results`
- [ ] **Step 6 (ask the user first):** Create a GitHub repo `drof-builder/flashc-buddy` and push, so CI runs. Public or private is the user's decision (Actions minutes are free for public repos).

**Learning check:** Which acceptance criteria were checked by automated tests, and which only by hand? Why is that split reasonable for step 1?
