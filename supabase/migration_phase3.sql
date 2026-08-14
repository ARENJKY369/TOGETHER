-- Migration Phase 3 — Daily Rituals & Memory Bank

-- Tables (if not exists, already in schema.sql)
create table if not exists public.pings (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  variant text not null default 'heart' check (variant in ('wave','heart','hug','kiss','sparkle')),
  message text,
  created_at timestamptz default now() not null
);
create index if not exists idx_pings_couple on public.pings(couple_id, created_at desc);

create table if not exists public.sync_taps (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tapped_at timestamptz default now() not null,
  is_synced boolean default false,
  synced_with uuid references public.sync_taps(id) on delete set null,
  created_at timestamptz default now() not null
);
create index if not exists idx_sync_couple on public.sync_taps(couple_id, tapped_at desc);

create table if not exists public.bucket_list_items (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete set null,
  is_completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);
create index if not exists idx_bucket_couple on public.bucket_list_items(couple_id, created_at desc);

create table if not exists public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  event_type text default 'custom' check (event_type in ('visit','call','anniversary','birthday','date','custom')),
  event_date date not null,
  event_time time,
  description text,
  created_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);
create index if not exists idx_calendar_couple on public.calendar_events(couple_id, event_date asc);

create table if not exists public.couple_streaks (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_completed_date date,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.pings enable row level security;
alter table public.sync_taps enable row level security;
alter table public.bucket_list_items enable row level security;
alter table public.calendar_events enable row level security;
alter table public.couple_streaks enable row level security;

-- Policies
drop policy if exists "Couple members manage pings" on public.pings;
create policy "Couple members manage pings" on public.pings for all using (couple_id = public.get_my_couple_id()) with check (couple_id = public.get_my_couple_id() and sender_id = auth.uid());

drop policy if exists "Couple members manage sync" on public.sync_taps;
create policy "Couple members manage sync" on public.sync_taps for all using (couple_id = public.get_my_couple_id()) with check (couple_id = public.get_my_couple_id() and user_id = auth.uid());

drop policy if exists "Couple members manage bucket" on public.bucket_list_items;
create policy "Couple members manage bucket" on public.bucket_list_items for all using (couple_id = public.get_my_couple_id()) with check (couple_id = public.get_my_couple_id());

drop policy if exists "Couple members manage calendar" on public.calendar_events;
create policy "Couple members manage calendar" on public.calendar_events for all using (couple_id = public.get_my_couple_id()) with check (couple_id = public.get_my_couple_id());

drop policy if exists "Couple members view streaks" on public.couple_streaks;
drop policy if exists "Couple members manage streaks" on public.couple_streaks;
create policy "Couple members view streaks" on public.couple_streaks for select using (couple_id = public.get_my_couple_id());
create policy "Couple members manage streaks" on public.couple_streaks for all using (couple_id = public.get_my_couple_id()) with check (couple_id = public.get_my_couple_id());
