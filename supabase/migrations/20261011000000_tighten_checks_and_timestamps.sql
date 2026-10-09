-- Follow-up to 20261010000000_decks_and_cards.sql (final-review minors).
--
-- 1. Blank checks: btrim(x) only strips spaces, so a name of just a tab or a
--    newline passed the database check (the app rejects it). Strip all common
--    whitespace, like the app's JS trim().
-- 2. Timestamps: clients could set created_at (and updated_at on insert).
--    Step 3's offline sync relies on updated_at, so the database now owns both.

-- ---------------------------------------------------------------------------
-- 1. Blank / length checks
-- ---------------------------------------------------------------------------

alter table public.decks drop constraint if exists decks_name_check;
alter table public.decks add constraint decks_name_check
  check (char_length(btrim(name, E' \t\n\r')) between 1 and 100);

alter table public.cards drop constraint if exists cards_front_check;
alter table public.cards drop constraint if exists cards_back_check;
alter table public.cards add constraint cards_front_check
  check (char_length(btrim(front, E' \t\n\r')) between 1 and 500);
alter table public.cards add constraint cards_back_check
  check (char_length(btrim(back, E' \t\n\r')) between 1 and 500);

-- ---------------------------------------------------------------------------
-- 2. Server-owned timestamps
-- ---------------------------------------------------------------------------

-- On insert: ignore any timestamps the client sent.
create function public.set_timestamps_on_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at = now();
  new.updated_at = now();
  return new;
end $$;

create trigger decks_set_timestamps before insert on public.decks
  for each row execute function public.set_timestamps_on_insert();
create trigger cards_set_timestamps before insert on public.cards
  for each row execute function public.set_timestamps_on_insert();

-- On update: refresh updated_at and never let created_at change.
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  new.created_at = old.created_at;
  return new;
end $$;
