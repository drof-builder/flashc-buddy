# Data Model: Build Step 1 (Accounts + Decks + Cards)

Status: Draft â€” awaiting approval

## How this was derived
Nouns in the user stories became tables; facts about them became columns.

| Noun in the stories | Becomes |
|---|---|
| account (email, password) | `auth.users` â€” provided by Supabase, we don't build it |
| deck (name) | `decks` table |
| card (front, back) | `cards` table |

## Relationships
- One **user** has many **decks**. A deck belongs to exactly one user.
- One **deck** has many **cards**. A card belongs to exactly one deck.

```
auth.users 1 â”€â”€< decks 1 â”€â”€< cards
```
(`1 â”€â”€<` means "one to many")

## Tables

### `decks`
| Column | Type | Rules | Why |
|---|---|---|---|
| `id` | uuid | primary key | Unique ID for each deck |
| `user_id` | uuid | â†’ `auth.users.id`, not null, **on delete cascade** | Who owns the deck. Cascade: deleting a user deletes their decks |
| `name` | text | not null, 1â€“100 chars after trimming spaces | Story 4 rules |
| `created_at` | timestamptz | default now() | Sorting, debugging |
| `updated_at` | timestamptz | default now(), updated on every change | Needed later for offline sync ("what changed since?") |

### `cards`
| Column | Type | Rules | Why |
|---|---|---|---|
| `id` | uuid | primary key | Unique ID for each card |
| `deck_id` | uuid | â†’ `decks.id`, not null, **on delete cascade** | Which deck it's in. Cascade = Story 6: deleting a deck deletes its cards |
| `user_id` | uuid | â†’ `auth.users.id`, not null, on delete cascade | Owner, copied from the deck (see decision D2) |
| `front` | text | not null, 1â€“500 chars after trimming | Story 7 rules |
| `back` | text | not null, 1â€“500 chars after trimming | Story 7 rules |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now(), updated on every change | Offline sync later |

## Security (Row Level Security)
Both tables have RLS enabled with one rule: **a row is visible and editable
only if `user_id = auth.uid()`** (the logged-in user). This enforces
"I can only see my own decks and cards" inside the database, so even a
bug in the app can't leak someone else's data.

## Design decisions

**D1 â€” IDs are UUIDs, not counting numbers (1, 2, 3â€¦).**
UUIDs can be generated on the phone without asking the server. That
matters in build step 3: a card created offline needs an ID before it
reaches the database. Counting numbers would clash between two phones.

**D2 â€” `cards` stores `user_id` even though it could be found via the deck.**
Without it, the security rule for cards would have to look up the deck
on every query. Storing it makes the rule simple and fast.
Trade-off: duplicated data that must stay consistent â€” the database
must reject a card whose `user_id` doesn't match its deck's owner.

**D3 â€” The deck's card count is NOT stored; it's counted when needed.**
A stored count can drift out of sync with the real number of cards
(e.g. if an update fails halfway). Counting is always correct and
cheap at our size. Rule of thumb: don't store what you can calculate,
until it becomes slow.

**D4 â€” No `profiles` table yet.**
Nothing in step 1 needs extra user info (display name, avatar). We add
it when a story needs it. (YAGNI: "You Aren't Gonna Need It.")

## Coming in later steps (not built now)
- Step 2: `card_reviews` table for SM-2 (ease factor, interval,
  repetitions, next review date) â€” one row per card per user.
- Step 3: offline storage on the phone mirrors these tables; `updated_at`
  and UUIDs make syncing possible.
