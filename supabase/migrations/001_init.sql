-- Who Said It? schema
-- Apply in the Supabase SQL editor or via the CLI: supabase db push

create extension if not exists "pgcrypto";

do $$ begin
  create type public.game_status as enum (
    'DRAFT',
    'COLLECTING_FACTS',
    'READY',
    'LIVE',
    'PAUSED',
    'COMPLETED'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.moderation_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.play_status as enum ('available', 'used', 'skipped', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.round_status as enum ('pending', 'voting', 'closed', 'revealed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.voting_status as enum ('idle', 'open', 'closed', 'revealed');
exception when duplicate_object then null;
end $$;

create table if not exists public.facilitators (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null default 'Facilitator',
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  game_code text not null unique,
  name text not null,
  welcome_message text,
  status public.game_status not null default 'DRAFT',
  created_by uuid not null references public.facilitators (id) on delete cascade,
  current_round_id uuid,
  scoring_enabled boolean not null default true,
  speed_bonus_enabled boolean not null default false,
  allow_self_vote boolean not null default false,
  show_vote_details boolean not null default false,
  show_leaderboard_after_round boolean not null default true,
  timer_duration_seconds integer,
  wheel_enabled boolean not null default false,
  show_leaderboard boolean not null default false,
  show_vote_distribution boolean not null default false,
  current_round_number integer not null default 0,
  current_fact_text text,
  voting_status public.voting_status not null default 'idle',
  votes_received integer not null default 0,
  revealed_author_name text,
  results_payload jsonb,
  leaderboard_payload jsonb,
  timer_ends_at timestamptz,
  presentation_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_code_format check (game_code ~ '^[0-9]{4,8}$'),
  constraint timer_duration_valid check (
    timer_duration_seconds is null
    or (timer_duration_seconds >= 5 and timer_duration_seconds <= 600)
  )
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  display_name text not null,
  client_token text not null,
  is_active boolean not null default true,
  is_removed boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint participants_name_not_blank check (length(trim(display_name)) between 1 and 60),
  constraint participants_game_token unique (game_id, client_token)
);

create unique index if not exists participants_game_name_unique
  on public.participants (game_id, lower(display_name))
  where is_removed = false;

create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  fact_text text not null,
  moderation_status public.moderation_status not null default 'pending',
  play_status public.play_status not null default 'available',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facts_text_length check (length(trim(fact_text)) between 8 and 280),
  constraint facts_rejected_not_playable check (
    moderation_status <> 'rejected' or play_status = 'rejected'
  )
);

create unique index if not exists facts_no_duplicate_text
  on public.facts (game_id, participant_id, lower(trim(fact_text)));

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  fact_id uuid not null references public.facts (id) on delete restrict,
  round_number integer not null,
  status public.round_status not null default 'pending',
  voting_opened_at timestamptz,
  voting_closed_at timestamptz,
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint rounds_game_number unique (game_id, round_number),
  constraint rounds_game_fact unique (game_id, fact_id)
);

alter table public.games
  drop constraint if exists games_current_round_fk;

alter table public.games
  add constraint games_current_round_fk
  foreign key (current_round_id) references public.rounds (id) on delete set null;

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  round_id uuid not null references public.rounds (id) on delete cascade,
  voting_participant_id uuid not null references public.participants (id) on delete cascade,
  selected_participant_id uuid not null references public.participants (id) on delete cascade,
  response_time_ms integer,
  is_correct boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint votes_one_per_player_per_round unique (round_id, voting_participant_id),
  constraint votes_response_time_nonneg check (response_time_ms is null or response_time_ms >= 0)
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  score integer not null default 0,
  correct_guesses integer not null default 0,
  total_response_time_ms bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint scores_unique_player unique (game_id, participant_id)
);

create table if not exists public.rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  hit_count integer not null default 0
);

create index if not exists games_created_by_idx on public.games (created_by);
create index if not exists games_status_idx on public.games (status);
create index if not exists participants_game_id_idx on public.participants (game_id);
create index if not exists facts_game_id_idx on public.facts (game_id);
create index if not exists facts_moderation_idx on public.facts (game_id, moderation_status);
create index if not exists rounds_game_id_idx on public.rounds (game_id);
create index if not exists votes_round_id_idx on public.votes (round_id);
create index if not exists votes_game_id_idx on public.votes (game_id);
create index if not exists scores_game_id_idx on public.scores (game_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
before update on public.games
for each row execute function public.set_updated_at();

drop trigger if exists facts_set_updated_at on public.facts;
create trigger facts_set_updated_at
before update on public.facts
for each row execute function public.set_updated_at();

drop trigger if exists votes_set_updated_at on public.votes;
create trigger votes_set_updated_at
before update on public.votes
for each row execute function public.set_updated_at();

drop trigger if exists scores_set_updated_at on public.scores;
create trigger scores_set_updated_at
before update on public.scores
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.facilitators (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'facilitator'), '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.votes_same_game()
returns trigger
language plpgsql
as $$
declare
  voter_game uuid;
  selected_game uuid;
  round_game uuid;
begin
  select game_id into voter_game from public.participants where id = new.voting_participant_id;
  select game_id into selected_game from public.participants where id = new.selected_participant_id;
  select game_id into round_game from public.rounds where id = new.round_id;

  if voter_game is distinct from new.game_id
     or selected_game is distinct from new.game_id
     or round_game is distinct from new.game_id then
    raise exception 'Vote participants and round must belong to the same game';
  end if;

  return new;
end;
$$;

drop trigger if exists votes_same_game_trg on public.votes;
create trigger votes_same_game_trg
before insert or update on public.votes
for each row execute function public.votes_same_game();

create or replace function public.facts_play_guard()
returns trigger
language plpgsql
as $$
begin
  if new.moderation_status = 'rejected' then
    new.play_status = 'rejected';
  end if;
  if new.play_status = 'used'
     and old.play_status = 'used'
     and new.moderation_status = 'approved' then
    null;
  end if;
  return new;
end;
$$;

drop trigger if exists facts_play_guard_trg on public.facts;
create trigger facts_play_guard_trg
before update on public.facts
for each row execute function public.facts_play_guard();

alter table public.facilitators enable row level security;
alter table public.games enable row level security;
alter table public.participants enable row level security;
alter table public.facts enable row level security;
alter table public.rounds enable row level security;
alter table public.votes enable row level security;
alter table public.scores enable row level security;
alter table public.rate_limits enable row level security;

drop policy if exists facilitators_self on public.facilitators;
create policy facilitators_self on public.facilitators
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists games_facilitator_all on public.games;
create policy games_facilitator_all on public.games
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Public may read a game row. Author names and unpublished facts are never stored
-- on this row until reveal. This is the realtime source of truth for players.
drop policy if exists games_public_read on public.games;
create policy games_public_read on public.games
  for select
  using (status <> 'DRAFT');

drop policy if exists participants_facilitator_all on public.participants;
create policy participants_facilitator_all on public.participants
  for all
  using (
    exists (
      select 1 from public.games g
      where g.id = participants.game_id and g.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.games g
      where g.id = participants.game_id and g.created_by = auth.uid()
    )
  );

drop policy if exists participants_public_live_names on public.participants;
create policy participants_public_live_names on public.participants
  for select
  using (
    is_removed = false
    and exists (
      select 1 from public.games g
      where g.id = participants.game_id
        and g.status in ('LIVE', 'PAUSED', 'COMPLETED')
    )
  );

drop policy if exists facts_facilitator_all on public.facts;
create policy facts_facilitator_all on public.facts
  for all
  using (
    exists (
      select 1 from public.games g
      where g.id = facts.game_id and g.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.games g
      where g.id = facts.game_id and g.created_by = auth.uid()
    )
  );

-- No anonymous SELECT on facts: authors stay hidden until copied onto games.revealed_author_name.

drop policy if exists rounds_facilitator_all on public.rounds;
create policy rounds_facilitator_all on public.rounds
  for all
  using (
    exists (
      select 1 from public.games g
      where g.id = rounds.game_id and g.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.games g
      where g.id = rounds.game_id and g.created_by = auth.uid()
    )
  );

drop policy if exists votes_facilitator_all on public.votes;
create policy votes_facilitator_all on public.votes
  for all
  using (
    exists (
      select 1 from public.games g
      where g.id = votes.game_id and g.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.games g
      where g.id = votes.game_id and g.created_by = auth.uid()
    )
  );

drop policy if exists scores_facilitator_all on public.scores;
create policy scores_facilitator_all on public.scores
  for all
  using (
    exists (
      select 1 from public.games g
      where g.id = scores.game_id and g.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.games g
      where g.id = scores.game_id and g.created_by = auth.uid()
    )
  );

drop policy if exists scores_public_read on public.scores;
create policy scores_public_read on public.scores
  for select
  using (
    exists (
      select 1 from public.games g
      where g.id = scores.game_id
        and g.status in ('LIVE', 'PAUSED', 'COMPLETED')
        and g.show_leaderboard = true
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
end $$;

notify pgrst, 'reload schema';
