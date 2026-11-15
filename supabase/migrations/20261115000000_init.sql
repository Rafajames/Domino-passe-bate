-- =====================================================================
-- Passe & Bate — esquema inicial (Etapa 5). AINDA NÃO APLICADO em nenhum projeto.
-- Princípios:
--   * O servidor (Edge Functions com service_role) é a única fonte de verdade
--     da partida: embaralha, distribui, valida turnos e grava eventos.
--   * Clientes nunca leem mãos alheias nem o dorme: só recebem a PlayerView.
--   * Regras são congeladas por partida (matches.frozen_rules) — perfis podem
--     mudar depois sem afetar partidas em andamento.
--   * Rating só muda em partidas 'ranked' entre humanos (nunca bots/casual).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- perfis de jogador
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  avatar text not null default '🦜',
  region text,
  created_at timestamptz not null default now()
);

create table public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- ---------------------------------------------------------------- grupos
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  owner_id uuid not null references public.profiles (id),
  default_rule_profile_id uuid,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  primary key (group_id, user_id)
);

-- ---------------------------------------------------------------- perfis de regras (versionados)
create table public.rule_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  group_id uuid references public.groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  mode text not null check (mode in ('passe-bate', 'all-fives')),
  based_on text,
  current_version int not null default 1,
  visibility text not null default 'private' check (visibility in ('private', 'group', 'link', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Versões nunca são apagadas nem alteradas (append-only).
create table public.rule_profile_versions (
  profile_id uuid not null references public.rule_profiles (id) on delete cascade,
  version int not null,
  rules jsonb not null,
  rules_hash text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, version)
);

alter table public.groups
  add constraint groups_default_rule_profile_fk foreign key (default_rule_profile_id) references public.rule_profiles (id) on delete set null;

-- ---------------------------------------------------------------- salas e partidas
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  host_id uuid not null references public.profiles (id),
  group_id uuid references public.groups (id) on delete set null,
  rule_profile_id uuid not null references public.rule_profiles (id),
  rule_profile_version int not null,
  kind text not null default 'casual' check (kind in ('casual', 'ranked')),
  visibility text not null default 'invite' check (visibility in ('invite', 'public')),
  status text not null default 'open' check (status in ('open', 'playing', 'closed')),
  created_at timestamptz not null default now()
);

create table public.room_seats (
  room_id uuid not null references public.rooms (id) on delete cascade,
  seat smallint not null check (seat between 0 and 3),
  user_id uuid references public.profiles (id),
  is_bot boolean not null default false,
  bot_difficulty text check (bot_difficulty in ('facil', 'normal', 'dificil', 'mestre')),
  connected boolean not null default false,
  last_seen_at timestamptz,
  primary key (room_id, seat)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms (id) on delete set null,
  mode text not null check (mode in ('passe-bate', 'all-fives')),
  kind text not null check (kind in ('casual', 'ranked', 'bots')),
  frozen_rules jsonb not null,           -- cópia congelada (FrozenRules)
  rules_hash text not null,
  status text not null default 'playing' check (status in ('playing', 'finished', 'abandoned')),
  winner_side smallint,
  final_scores smallint[],
  season_id uuid,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  seat smallint not null,
  side smallint not null,
  user_id uuid references public.profiles (id),
  is_bot boolean not null default false,
  primary key (match_id, seat)
);

-- Estado secreto: semente, mãos e dorme. SOMENTE service_role (RLS sem políticas).
create table public.match_secrets (
  match_id uuid primary key references public.matches (id) on delete cascade,
  seed bigint not null,
  state jsonb not null,                  -- MatchState completo do motor
  updated_at timestamptz not null default now()
);

-- Log público de eventos (compras alheias sem a pedra) para replay e reconexão.
create table public.match_events (
  match_id uuid not null references public.matches (id) on delete cascade,
  seq int not null,
  event jsonb not null,
  created_at timestamptz not null default now(),
  primary key (match_id, seq)
);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  kind text not null check (kind in ('text', 'quick', 'emoji')),
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- competição
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

alter table public.matches add constraint matches_season_fk foreign key (season_id) references public.seasons (id);

-- Glicko-2 por modalidade × formato × (temporada | geral).
create table public.ratings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('passe-bate', 'all-fives')),
  format text not null check (format in ('individual', 'duplas')),
  season_id uuid references public.seasons (id),
  rating double precision not null default 1500,
  rd double precision not null default 350,
  volatility double precision not null default 0.06,
  games int not null default 0,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, mode, format, season_id)
);

create table public.rating_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  mode text not null,
  format text not null,
  rating_before double precision not null,
  rating_after double precision not null,
  created_at timestamptz not null default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organizer_id uuid not null references public.profiles (id),
  group_id uuid references public.groups (id),
  mode text not null check (mode in ('passe-bate', 'all-fives')),
  format text not null check (format in ('eliminatoria', 'grupos', 'grupos-eliminatoria')),
  rule_profile_id uuid not null references public.rule_profiles (id),
  rule_profile_version int not null,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  status text not null default 'draft' check (status in ('draft', 'registration', 'running', 'finished')),
  created_at timestamptz not null default now()
);

create table public.tournament_entries (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  entry_id uuid not null default gen_random_uuid(),
  player1_id uuid not null references public.profiles (id),
  player2_id uuid references public.profiles (id),
  seed int,
  primary key (tournament_id, entry_id)
);

create table public.achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null,
  earned_at timestamptz not null default now(),
  match_id uuid references public.matches (id),
  primary key (user_id, code)
);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.rule_profiles enable row level security;
alter table public.rule_profile_versions enable row level security;
alter table public.rooms enable row level security;
alter table public.room_seats enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_secrets enable row level security;   -- sem políticas: só service_role
alter table public.match_events enable row level security;
alter table public.chat_messages enable row level security;
alter table public.seasons enable row level security;
alter table public.ratings enable row level security;
alter table public.rating_history enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.achievements enable row level security;

create or replace function public.is_group_member(g uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from group_members where group_id = g and user_id = auth.uid()) $$;

create or replace function public.is_room_member(r uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from room_seats where room_id = r and user_id = auth.uid())
       or exists (select 1 from rooms where id = r and host_id = auth.uid()) $$;

-- Perfis públicos para leitura; cada um edita o seu.
create policy profiles_read on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid());

create policy friendships_rw on public.friendships for all
  using (user_id = auth.uid() or friend_id = auth.uid()) with check (user_id = auth.uid());

create policy groups_read on public.groups for select using (owner_id = auth.uid() or public.is_group_member(id));
create policy groups_insert on public.groups for insert with check (owner_id = auth.uid());
create policy groups_update on public.groups for update using (owner_id = auth.uid());
create policy group_members_read on public.group_members for select using (public.is_group_member(group_id));

-- Perfis de regras: dono edita; leitura conforme visibilidade.
create policy rule_profiles_read on public.rule_profiles for select using (
  owner_id = auth.uid() or visibility in ('link', 'public')
  or (visibility = 'group' and group_id is not null and public.is_group_member(group_id)));
create policy rule_profiles_insert on public.rule_profiles for insert with check (owner_id = auth.uid());
create policy rule_profiles_update on public.rule_profiles for update using (owner_id = auth.uid());
create policy rule_versions_read on public.rule_profile_versions for select using (
  exists (select 1 from rule_profiles p where p.id = profile_id));  -- herda a política acima
create policy rule_versions_insert on public.rule_profile_versions for insert with check (
  exists (select 1 from rule_profiles p where p.id = profile_id and p.owner_id = auth.uid()));
-- Sem políticas de update/delete em versões: histórico imutável.

-- Salas: membros e salas públicas abertas. Escrita de estado só via Edge Functions.
create policy rooms_read on public.rooms for select using (public.is_room_member(id) or (visibility = 'public' and status = 'open'));
create policy room_seats_read on public.room_seats for select using (public.is_room_member(room_id));

-- Partidas: participantes leem metadados e eventos públicos. Ninguém escreve pelo cliente.
create policy matches_read on public.matches for select using (
  exists (select 1 from match_players mp where mp.match_id = id and mp.user_id = auth.uid()) or status = 'finished');
create policy match_players_read on public.match_players for select using (true);
create policy match_events_read on public.match_events for select using (
  exists (select 1 from match_players mp where mp.match_id = match_events.match_id and mp.user_id = auth.uid()));

create policy chat_read on public.chat_messages for select using (public.is_room_member(room_id));
create policy chat_insert on public.chat_messages for insert with check (user_id = auth.uid() and public.is_room_member(room_id));

-- Competição: leitura pública; escrita só pelo servidor (service_role ignora RLS).
create policy seasons_read on public.seasons for select using (true);
create policy ratings_read on public.ratings for select using (true);
create policy rating_history_read on public.rating_history for select using (true);
create policy tournaments_read on public.tournaments for select using (
  visibility = 'public' or organizer_id = auth.uid() or (group_id is not null and public.is_group_member(group_id)));
create policy tournaments_insert on public.tournaments for insert with check (organizer_id = auth.uid());
create policy tournament_entries_read on public.tournament_entries for select using (true);
create policy achievements_read on public.achievements for select using (true);

create index on public.match_events (match_id, seq);
create index on public.ratings (mode, format, season_id, rating desc);
create index on public.rooms (status, visibility);
