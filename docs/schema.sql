-- =============================================================================
-- Torneo Calcetto — schema Supabase (Postgres)
-- Da eseguire sul progetto Supabase collegato al frontend (SQL editor o CLI).
-- Riferimento di progetto: vedi CLAUDE.md e il piano di implementazione.
--
-- Idempotente: rilanciare l'intero file su un database già provisionato
-- (es. dopo una modifica a una singola funzione) non genera errori
-- "already exists" — tabelle/indici usano IF NOT EXISTS, trigger e policy
-- vengono droppati e ricreati, la publication realtime salta le tabelle
-- già aggiunte.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELLE
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_id uuid not null references public.profiles (id),
  secret_code text not null unique,
  public_code text not null unique,
  phase text not null default 'setup'
    check (phase in ('setup', 'group', 'playoff', 'semifinal', 'final', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_members (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  role text not null check (role in ('host', 'admin', 'player', 'spectator')),
  status text not null default 'active' check (status in ('active', 'banned')),
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);
create index if not exists tournament_members_tournament_idx on public.tournament_members (tournament_id);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  name text not null,
  group_seed int null check (group_seed between 1 and 6),
  created_at timestamptz not null default now(),
  unique (tournament_id, name),
  unique (tournament_id, group_seed)
);
create index if not exists teams_tournament_idx on public.teams (tournament_id);

-- Rosa: una riga per ogni persona associata al torneo, registrata o ospite.
-- Disaccoppiata da tournament_members per permettere giocatori "segnaposto"
-- senza account (guest_name) accanto ai Giocatori registrati (member_id).
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  member_id uuid null references public.tournament_members (id) on delete cascade,
  guest_name text null,
  team_id uuid null references public.teams (id) on delete set null,
  goals int not null default 0 check (goals >= 0),
  created_at timestamptz not null default now(),
  check (num_nonnulls(member_id, guest_name) = 1),
  unique (tournament_id, member_id)
);
-- Rilancio su un database già provisionato prima dell'introduzione dei
-- Marcatori: aggiunge la colonna solo se manca.
alter table public.players add column if not exists goals int not null default 0 check (goals >= 0);

create index if not exists players_tournament_idx on public.players (tournament_id);
create index if not exists players_team_idx on public.players (team_id);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  phase text not null check (phase in ('group', 'playoff', 'semifinal', 'final')),
  slot text null check (slot in ('A', 'B', 'SF1', 'SF2', 'F34', 'F12')),
  home_team_id uuid not null references public.teams (id),
  away_team_id uuid not null references public.teams (id),
  home_goals int null check (home_goals >= 0),
  away_goals int null check (away_goals >= 0),
  winner_team_id uuid null references public.teams (id),
  status text not null default 'scheduled' check (status in ('scheduled', 'played')),
  created_at timestamptz not null default now(),
  check (home_team_id is distinct from away_team_id),
  check (winner_team_id is null or winner_team_id in (home_team_id, away_team_id)),
  check (status = 'scheduled' or (home_goals is not null and away_goals is not null)),
  pair_key text generated always as (
    least(home_team_id::text, away_team_id::text) || '|' ||
    greatest(home_team_id::text, away_team_id::text)
  ) stored
);
create index if not exists matches_tournament_idx on public.matches (tournament_id);

-- Un solo scontro per coppia di squadre nel girone (15 partite per 6 squadre)
create unique index if not exists matches_group_pair_uidx
  on public.matches (tournament_id, pair_key) where phase = 'group';

-- Un solo match per slot del tabellone a eliminazione diretta
create unique index if not exists matches_slot_uidx
  on public.matches (tournament_id, slot) where slot is not null;

-- -----------------------------------------------------------------------------
-- 2. FUNZIONI DI SUPPORTO (SECURITY DEFINER, search_path bloccato)
-- -----------------------------------------------------------------------------

-- Ruolo dell'utente corrente nel torneo; null se non iscritto o bannato.
create or replace function public.my_role(t uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.tournament_members
  where tournament_id = t and user_id = auth.uid() and status = 'active';
$$;

create or replace function public.is_member(t uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.my_role(t) is not null;
$$;

create or replace function public.is_staff(t uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.my_role(t) in ('host', 'admin');
$$;

create or replace function public.is_open(t uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select phase <> 'completed' from public.tournaments where id = t;
$$;

-- Gerarchia dei permessi: l'Host gestisce chiunque tranne sé stesso;
-- l'Admin gestisce solo Giocatori e Spettatori (mai Host o altri Admin).
create or replace function public.can_manage(t uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.my_role(t)
    when 'host' then target_role in ('admin', 'player', 'spectator')
    when 'admin' then target_role in ('player', 'spectator')
    else false
  end;
$$;

-- Codice casuale senza caratteri ambigui (niente 0/O, 1/I).
create or replace function public.random_code(len int)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
begin
  for i in 1..len loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. TRIGGER
-- -----------------------------------------------------------------------------

-- Crea automaticamente il profilo alla registrazione (username da user_metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vincolo "esattamente 6 squadre": rifiuta la 7ª riga
create or replace function public.check_team_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.teams where tournament_id = new.tournament_id) >= 6 then
    raise exception 'Un torneo può avere al massimo 6 squadre';
  end if;
  return new;
end;
$$;

drop trigger if exists teams_limit_trigger on public.teams;
create trigger teams_limit_trigger
  before insert on public.teams
  for each row execute function public.check_team_limit();

-- Regole di validazione di un risultato:
--  - un match "played" deve avere entrambi i punteggi
--  - a gol diversi il vincitore è dedotto automaticamente
--  - a gol pari nelle fasi KO il vincitore va indicato esplicitamente
create or replace function public.validate_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'played' then
    if new.home_goals is null or new.away_goals is null then
      raise exception 'Inserisci il punteggio per registrare il risultato';
    end if;
    if new.home_goals <> new.away_goals then
      new.winner_team_id := case
        when new.home_goals > new.away_goals then new.home_team_id
        else new.away_team_id
      end;
    elsif new.phase <> 'group' and new.winner_team_id is null then
      raise exception 'In caso di pareggio indica la squadra vincitrice';
    end if;
  else
    new.winner_team_id := null;
    new.home_goals := null;
    new.away_goals := null;
  end if;
  return new;
end;
$$;

drop trigger if exists matches_validate_trigger on public.matches;
create trigger matches_validate_trigger
  before insert or update on public.matches
  for each row execute function public.validate_match();

-- -----------------------------------------------------------------------------
-- 4. RPC — le uniche porte di scrittura per iscrizione, ruoli e avanzamento fase
-- -----------------------------------------------------------------------------

create or replace function public.create_tournament(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_secret text;
  v_public text;
  v_member_id uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Il nome del torneo è obbligatorio';
  end if;

  loop
    v_secret := public.random_code(24);
    exit when not exists (select 1 from public.tournaments where secret_code = v_secret);
  end loop;

  loop
    v_public := public.random_code(8);
    exit when not exists (select 1 from public.tournaments where public_code = v_public);
  end loop;

  insert into public.tournaments (name, host_id, secret_code, public_code)
  values (trim(p_name), auth.uid(), v_secret, v_public)
  returning id into v_id;

  insert into public.tournament_members (tournament_id, user_id, role)
  values (v_id, auth.uid(), 'host')
  returning id into v_member_id;

  insert into public.players (tournament_id, member_id)
  values (v_id, v_member_id);

  return v_id;
end;
$$;

create or replace function public.join_tournament(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_role text;
  v_member_id uuid;
  v_existing public.tournament_members%rowtype;
  v_code text := upper(trim(p_code));
begin
  select * into v_tournament from public.tournaments where secret_code = v_code;
  if found then
    v_role := 'player';
  else
    select * into v_tournament from public.tournaments where public_code = v_code;
    if found then
      v_role := 'spectator';
    else
      raise exception 'Codice non valido';
    end if;
  end if;

  select * into v_existing from public.tournament_members
    where tournament_id = v_tournament.id and user_id = auth.uid();

  if found then
    if v_existing.status = 'banned' then
      raise exception 'Sei stato escluso da questo torneo';
    end if;
    return v_tournament.id; -- già iscritto: idempotente
  end if;

  insert into public.tournament_members (tournament_id, user_id, role)
  values (v_tournament.id, auth.uid(), v_role)
  returning id into v_member_id;

  if v_role = 'player' then
    insert into public.players (tournament_id, member_id) values (v_tournament.id, v_member_id);
  end if;

  return v_tournament.id;
end;
$$;

-- I codici non sono leggibili via SELECT diretto (vedi §5): solo lo staff
-- può recuperarli, per condividerli con chi deve iscriversi.
create or replace function public.get_tournament_codes(p_tournament uuid)
returns table (secret_code text, public_code text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff(p_tournament) then
    raise exception 'Permesso negato';
  end if;
  return query
    select t.secret_code, t.public_code from public.tournaments t where t.id = p_tournament;
end;
$$;

-- Promozione/retrocessione. Solo l'Host può nominare un Admin;
-- il resto segue can_manage().
create or replace function public.set_member_role(p_tournament uuid, p_target_user uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role text := public.my_role(p_tournament);
  v_target_role text;
begin
  select role into v_target_role from public.tournament_members
    where tournament_id = p_tournament and user_id = p_target_user;

  if v_target_role is null then
    raise exception 'Utente non iscritto al torneo';
  end if;
  if p_new_role not in ('admin', 'player') then
    raise exception 'Ruolo non assegnabile';
  end if;
  if p_new_role = 'admin' and v_caller_role <> 'host' then
    raise exception 'Solo l''Host può nominare un Admin';
  end if;
  if not public.can_manage(p_tournament, v_target_role) then
    raise exception 'Permesso negato';
  end if;

  update public.tournament_members set role = p_new_role
    where tournament_id = p_tournament and user_id = p_target_user;
end;
$$;

-- Espulsione: rimuove l'iscrizione, l'utente può rientrare col codice.
create or replace function public.remove_member(p_tournament uuid, p_target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_role text;
begin
  select role into v_target_role from public.tournament_members
    where tournament_id = p_tournament and user_id = p_target_user;
  if v_target_role is null then
    raise exception 'Utente non iscritto al torneo';
  end if;
  if not public.can_manage(p_tournament, v_target_role) then
    raise exception 'Permesso negato';
  end if;
  delete from public.tournament_members
    where tournament_id = p_tournament and user_id = p_target_user;
end;
$$;

-- Ban/riammissione: l'utente bannato non può più rientrare con nessun codice.
create or replace function public.set_member_status(p_tournament uuid, p_target_user uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_role text;
begin
  if p_status not in ('active', 'banned') then
    raise exception 'Stato non valido';
  end if;
  select role into v_target_role from public.tournament_members
    where tournament_id = p_tournament and user_id = p_target_user;
  if v_target_role is null then
    raise exception 'Utente non iscritto al torneo';
  end if;
  if not public.can_manage(p_tournament, v_target_role) then
    raise exception 'Permesso negato';
  end if;
  update public.tournament_members set status = p_status
    where tournament_id = p_tournament and user_id = p_target_user;
end;
$$;

-- Unica porta di avanzamento fase, con le verifiche del regolamento.
create or replace function public.close_phase(p_tournament uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phase text;
  v_team_count int;
  v_unplayed int;
  v_teams uuid[];
  t1 uuid; t2 uuid; t3 uuid; t4 uuid; t5 uuid; t6 uuid;
  v_a_winner uuid; v_b_winner uuid;
  v_sf1_winner uuid; v_sf1_loser uuid;
  v_sf2_winner uuid; v_sf2_loser uuid;
begin
  if not public.is_staff(p_tournament) then
    raise exception 'Permesso negato';
  end if;

  select phase into v_phase from public.tournaments where id = p_tournament for update;
  if v_phase is null then
    raise exception 'Torneo non trovato';
  end if;

  if v_phase = 'setup' then
    select count(*) into v_team_count from public.teams where tournament_id = p_tournament;
    if v_team_count <> 6 then
      raise exception 'Servono esattamente 6 squadre per iniziare il girone (trovate %)', v_team_count;
    end if;

    -- girone all'italiana: ogni squadra affronta tutte le altre una volta
    -- (6 su 2 = 15 partite), generate qui invece che a mano dallo staff.
    insert into public.matches (tournament_id, phase, home_team_id, away_team_id)
    select p_tournament, 'group', t1.id, t2.id
    from public.teams t1
    join public.teams t2 on t2.tournament_id = t1.tournament_id and t2.id > t1.id
    where t1.tournament_id = p_tournament;

    update public.tournaments set phase = 'group' where id = p_tournament;

  elsif v_phase = 'group' then
    select count(*) into v_unplayed from public.matches
      where tournament_id = p_tournament and phase = 'group' and status <> 'played';
    if v_unplayed > 0 then
      raise exception 'Ci sono ancora % partite del girone da giocare', v_unplayed;
    end if;

    with stats as (
      select
        tm.id as team_id,
        coalesce(sum(case
          when m.home_team_id = tm.id and m.home_goals > m.away_goals then 3
          when m.away_team_id = tm.id and m.away_goals > m.home_goals then 3
          when m.home_goals = m.away_goals then 1
          else 0
        end), 0) as points,
        coalesce(sum(case
          when m.home_team_id = tm.id then m.home_goals - m.away_goals
          when m.away_team_id = tm.id then m.away_goals - m.home_goals
        end), 0) as gd,
        coalesce(sum(case
          when m.home_team_id = tm.id then m.home_goals
          when m.away_team_id = tm.id then m.away_goals
        end), 0) as gf
      from public.teams tm
      left join public.matches m
        on m.tournament_id = tm.tournament_id
        and m.phase = 'group'
        and m.status = 'played'
        and (m.home_team_id = tm.id or m.away_team_id = tm.id)
      where tm.tournament_id = p_tournament
      group by tm.id
    )
    select array_agg(team_id order by points desc, gd desc, gf desc, team_id)
      into v_teams from stats;

    if array_length(v_teams, 1) <> 6 then
      raise exception 'Servono esattamente 6 squadre per chiudere il girone';
    end if;

    for i in 1..6 loop
      update public.teams set group_seed = i where id = v_teams[i];
    end loop;

    t3 := v_teams[3]; t4 := v_teams[4]; t5 := v_teams[5]; t6 := v_teams[6];

    insert into public.matches (tournament_id, phase, slot, home_team_id, away_team_id)
    values
      (p_tournament, 'playoff', 'A', t3, t6),
      (p_tournament, 'playoff', 'B', t4, t5);

    update public.tournaments set phase = 'playoff' where id = p_tournament;

  elsif v_phase = 'playoff' then
    select winner_team_id into v_a_winner from public.matches
      where tournament_id = p_tournament and slot = 'A';
    select winner_team_id into v_b_winner from public.matches
      where tournament_id = p_tournament and slot = 'B';
    if v_a_winner is null or v_b_winner is null then
      raise exception 'Le partite del turno preliminare non sono ancora concluse';
    end if;

    select id into t1 from public.teams where tournament_id = p_tournament and group_seed = 1;
    select id into t2 from public.teams where tournament_id = p_tournament and group_seed = 2;

    insert into public.matches (tournament_id, phase, slot, home_team_id, away_team_id)
    values
      (p_tournament, 'semifinal', 'SF1', v_a_winner, t2),
      (p_tournament, 'semifinal', 'SF2', v_b_winner, t1);

    update public.tournaments set phase = 'semifinal' where id = p_tournament;

  elsif v_phase = 'semifinal' then
    select winner_team_id,
           case when home_team_id = winner_team_id then away_team_id else home_team_id end
      into v_sf1_winner, v_sf1_loser
      from public.matches where tournament_id = p_tournament and slot = 'SF1';
    select winner_team_id,
           case when home_team_id = winner_team_id then away_team_id else home_team_id end
      into v_sf2_winner, v_sf2_loser
      from public.matches where tournament_id = p_tournament and slot = 'SF2';

    if v_sf1_winner is null or v_sf2_winner is null then
      raise exception 'Le semifinali non sono ancora concluse';
    end if;

    insert into public.matches (tournament_id, phase, slot, home_team_id, away_team_id)
    values
      (p_tournament, 'final', 'F34', v_sf1_loser, v_sf2_loser),
      (p_tournament, 'final', 'F12', v_sf1_winner, v_sf2_winner);

    update public.tournaments set phase = 'final' where id = p_tournament;

  elsif v_phase = 'final' then
    if exists (
      select 1 from public.matches
      where tournament_id = p_tournament and slot in ('F34', 'F12') and winner_team_id is null
    ) then
      raise exception 'Le finali non sono ancora concluse';
    end if;
    update public.tournaments set phase = 'completed' where id = p_tournament;

  else
    raise exception 'Il torneo è già concluso';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_members enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;

-- profiles: sé stesso o membri di un torneo condiviso; aggiornabile solo da sé stesso
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.tournament_members m1
      join public.tournament_members m2 on m1.tournament_id = m2.tournament_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- tournaments: leggibile dai membri (i codici sono protetti a livello di colonna, vedi sotto);
-- l'unico UPDATE diretto concesso è per l'Host (es. rinominare il torneo)
drop policy if exists tournaments_select on public.tournaments;
create policy tournaments_select on public.tournaments for select
  using (public.is_member(id));
drop policy if exists tournaments_update on public.tournaments;
create policy tournaments_update on public.tournaments for update
  using (public.my_role(id) = 'host') with check (public.my_role(id) = 'host');

-- I codici di invito non sono leggibili via SELECT diretto: solo tramite
-- get_tournament_codes(), riservata allo staff.
revoke select on public.tournaments from authenticated, anon;
grant select (id, name, host_id, phase, created_at) on public.tournaments to authenticated;

-- tournament_members: sola lettura diretta. Ogni scrittura (iscrizione, ruoli,
-- espulsione, ban) passa dalle RPC di sezione 4, che applicano can_manage().
drop policy if exists tournament_members_select on public.tournament_members;
create policy tournament_members_select on public.tournament_members for select
  using (public.is_member(tournament_id));

-- teams / players / matches: leggibili da ogni membro, scrivibili da Host/Admin
-- finché il torneo non è concluso
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select
  using (public.is_member(tournament_id));
drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams for all
  using (public.is_staff(tournament_id) and public.is_open(tournament_id))
  with check (public.is_staff(tournament_id) and public.is_open(tournament_id));

drop policy if exists players_select on public.players;
create policy players_select on public.players for select
  using (public.is_member(tournament_id));
drop policy if exists players_write on public.players;
create policy players_write on public.players for all
  using (public.is_staff(tournament_id) and public.is_open(tournament_id))
  with check (public.is_staff(tournament_id) and public.is_open(tournament_id));

drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches for select
  using (public.is_member(tournament_id));
drop policy if exists matches_write on public.matches;
create policy matches_write on public.matches for all
  using (public.is_staff(tournament_id) and public.is_open(tournament_id))
  with check (public.is_staff(tournament_id) and public.is_open(tournament_id));

-- -----------------------------------------------------------------------------
-- 6. REALTIME
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['tournament_members', 'teams', 'players', 'matches', 'tournaments'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
