# Database Security Check (RLS)

Project: `flashc-buddy` (Supabase ref `hgjolqujejuqcjigzhod`)
Migration: `supabase/migrations/20261010000000_decks_and_cards.sql`

## Schema check (SQL Editor) — 2026-10-10 ✅
| Item | Expected | Result |
|---|---|---|
| `decks`, `cards` exist with RLS enabled | rowsecurity = true | ✅ |
| Policies | `own decks`, `own cards` | ✅ |
| Triggers | `cards_set_user_id`, `cards_touch`, `decks_touch` | ✅ |
| Grants to `anon` | none | ✅ |
| Auth: confirm email | on | ✅ |
| Auth: minimum password length | 8 | ✅ |

## Anonymous access (curl with publishable key, not logged in) — 2026-10-10 ✅
| Attempt | Expected | Result |
|---|---|---|
| `GET /rest/v1/decks` | refused | ✅ 401 `permission denied for table decks` |
| `POST /rest/v1/decks {"name":"hacked"}` | refused | ✅ 401 `permission denied for table decks` |

## Two-user checks — run from the app in Task 8
Create User A and User B. As User A, create deck "A's deck" with 2 cards.

| As | Attempt | Expected | Result |
|---|---|---|---|
| B | List decks | does not see "A's deck" | ☐ |
| B | Rename A's deck (by id) | 0 rows changed | ☐ |
| B | Delete A's deck (by id) | 0 rows deleted | ☐ |
| B | Add a card with A's `deck_id` | error `deck not found` | ☐ |
| A | Delete own deck | deck and its 2 cards gone | ☐ |
| A | Create deck named `"   "` | rejected by check constraint | ☐ |
