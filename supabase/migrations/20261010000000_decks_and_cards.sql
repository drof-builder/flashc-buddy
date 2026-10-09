-- Build step 1: decks and cards.
-- Design: docs/design/data-model.md and docs/design/design-doc-step1.md (section 6).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  -- Filled from the logged-in user; the app never sends user_id.
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index decks_user_id_idx on public.decks(user_id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  -- Deleting a deck deletes its cards (Story 6).
  deck_id uuid not null references public.decks(id) on delete cascade,
  -- Copied from the deck by a trigger (data-model decision D2).
  user_id uuid not null references auth.users(id) on delete cascade,
  front text not null check (char_length(btrim(front)) between 1 and 500),
  back  text not null check (char_length(btrim(back))  between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cards_deck_id_idx on public.cards(deck_id);
create index cards_user_id_idx on public.cards(user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- cards.user_id always comes from the card's deck. Runs as the calling user,
-- so RLS hides other users' decks: a card for a deck that isn't yours fails.
create function public.set_card_user_id() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  select d.user_id into new.user_id from public.decks d where d.id = new.deck_id;
  if new.user_id is null then
    raise exception 'deck not found';
  end if;
  return new;
end $$;

create trigger cards_set_user_id
  before insert or update of deck_id on public.cards
  for each row execute function public.set_card_user_id();

-- Keep updated_at current (needed for offline sync in build step 3).
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger decks_touch before update on public.decks
  for each row execute function public.touch_updated_at();
create trigger cards_touch before update on public.cards
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: each user sees and changes only their own rows.
-- ---------------------------------------------------------------------------

alter table public.decks enable row level security;
alter table public.cards enable row level security;

create policy "own decks" on public.decks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own cards" on public.cards for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- The project was created with "Automatically expose new tables" on, so grant
-- explicitly anyway: logged-in users only. Anonymous visitors get nothing.
revoke all on public.decks, public.cards from anon;
grant select, insert, update, delete on public.decks, public.cards to authenticated;
