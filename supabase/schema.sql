-- SLOTS VS. SLOTS leaderboards. Run once in the Supabase SQL editor (Dashboard > SQL Editor > New query > Run).
-- Safe to re-run. The game uses the public anon key; row-level security and the grants below keep it honest:
--   * anyone can read the boards (but never a player's pid: it is the secret that owns a name),
--   * a name is claimed once, by one pid (claim_name), and scores only go up under the name your pid owns,
--   * a daily board takes one score per player; nobody can edit or delete through the API.

create table if not exists public.players (
  name text primary key check (name ~ '^[A-Z0-9-]{3,12}$'),
  pid text not null unique check (char_length(pid) between 8 and 64),
  created_at timestamptz not null default now()
);

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (name ~ '^[A-Z0-9-]{3,12}$'),
  title text not null default '' check (char_length(title) <= 24),
  pid text not null check (char_length(pid) between 8 and 64),
  board text not null check (board ~ '^(all|daily:[0-9]{4}-[0-9]{2}-[0-9]{2}|weekly:[0-9]{4}-W[0-9]{2})$'),
  -- Caps per board: a daily or weekly run tops out near 6,000; a GOLD-stake clear near 15,000 (ALL TIME has no endless pots).
  score integer not null check (score >= 0 and score <= case when board = 'all' then 60000 else 8000 end),
  cabinet text not null check (cabinet in ('knight', 'tesla', 'jukebox', 'joker', 'midas', 'thorn')),
  stake smallint not null check (stake between 0 and 5),
  won boolean not null,
  level smallint not null check (level between 1 and 999)
);
-- Re-runs keep the machine list current (THE JUKEBOX replaced BRIAR; old BRIAR scores stay valid).
alter table public.scores drop constraint if exists scores_cabinet_check;
alter table public.scores add constraint scores_cabinet_check check (cabinet in ('knight', 'tesla', 'jukebox', 'joker', 'midas', 'thorn'));
create index if not exists scores_board_score on public.scores (board, score desc);
create index if not exists scores_board_pid on public.scores (board, pid);

-- Names the boards refuse (the game checks the same list: src/core/profile.ts NAME_BLOCKLIST).
create or replace function public.name_blocked(p_name text) returns boolean
language sql immutable as $$
  select exists (select 1 from unnest(array['FUCK', 'SHIT', 'CUNT', 'NIGG', 'FAGG', 'NAZI', 'HITLER', 'KKK', 'WHORE', 'SLUT', 'PUSSY', 'ASSHOLE', 'BITCH', 'RETARD', 'PENIS', 'VAGINA', 'DILDO', 'TWAT', 'WANK', 'CHINK', 'KIKE', 'TRANNY']) w where replace(p_name, '-', '') like '%' || w || '%')
$$;

-- Claim a name for a pid: 'ok' (now yours, or already yours), 'taken', or 'have' (this pid already owns another name,
-- which it keeps: renames go through the dashboard for now).
create or replace function public.claim_name(p_name text, p_pid text) returns text
language plpgsql security definer set search_path = public as $$
declare owner text; mine text;
begin
  if public.name_blocked(p_name) then return 'blocked'; end if;
  select pid into owner from players where name = p_name;
  if owner is not null then return case when owner = p_pid then 'ok' else 'taken' end; end if;
  select name into mine from players where pid = p_pid;
  if mine is not null then return 'have:' || mine; end if;
  insert into players (name, pid) values (p_name, p_pid);
  return 'ok';
exception when unique_violation then return 'taken';
end $$;

create or replace function public.owns_name(p_name text, p_pid text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from players where name = p_name and pid = p_pid)
$$;

create or replace function public.has_score(p_board text, p_pid text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from scores where board = p_board and pid = p_pid)
$$;

-- One score per player every 20 seconds (a run takes minutes; this stops scripted floods).
create or replace function public.score_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from scores where pid = new.pid and created_at > now() - interval '20 seconds' and board = new.board) then
    raise exception 'too many scores, slow down';
  end if;
  return new;
end $$;
drop trigger if exists scores_rate_limit on public.scores;
create trigger scores_rate_limit before insert on public.scores for each row execute function public.score_rate_limit();

alter table public.players enable row level security;
alter table public.scores enable row level security;

drop policy if exists "read players" on public.players;
drop policy if exists "claim a name" on public.players;
drop policy if exists "read scores" on public.scores;
drop policy if exists "post a score" on public.scores;

create policy "read scores" on public.scores for select to anon using (true);
create policy "post a score" on public.scores for insert to anon with check (
  public.owns_name(name, pid) and (board not like 'daily:%' or not public.has_score(board, pid))
);

-- Columns, not tables: the pid can be written but never read back.
revoke all on public.players from anon;
revoke all on public.scores from anon;
grant select (name, title, board, score, cabinet, stake, won, level, created_at) on public.scores to anon;
grant insert (name, title, pid, board, score, cabinet, stake, won, level) on public.scores to anon;
grant execute on function public.claim_name(text, text) to anon;
