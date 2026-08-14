-- Together — Supabase Schema & RLS (Phase 1 + future-ready)
-- Run this in Supabase SQL Editor (or as migration)

-- Enable PG extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ====================
-- PROFILES table
-- ====================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text default 'UTC' not null,
  location text,
  relationship_start_date date,
  ldr_start_date date,
  love_languages text[] default '{}',
  invite_code text unique not null,
  couple_id uuid references public.couples(id) on delete set null,
  onboarding_completed boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Function to generate a cute invite code: e.g., LOVE-AB3K9X
create or replace function public.generate_invite_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random()*length(chars)+1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- Function to get my couple_id (for RLS)
create or replace function public.get_my_couple_id()
returns uuid as $$
  select couple_id from public.profiles where id = auth.uid()
$$ language sql stable security definer;

-- ====================
-- COUPLES table
-- ====================
create table if not exists public.couples (
  id uuid primary key default uuid_generate_v4(),
  user1_id uuid references public.profiles(id) on delete set null,
  user2_id uuid references public.profiles(id) on delete set null,
  status text default 'paired' check (status in ('waiting','paired')),
  next_visit_date date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

drop trigger if exists set_updated_at_couples on public.couples;
create trigger set_updated_at_couples
  before update on public.couples
  for each row execute function public.handle_updated_at();

-- Helper: check if current user belongs to a couple
create or replace function public.is_couple_member(couple_uuid uuid)
returns boolean as $$
  select exists(
    select 1 from public.couples
    where id = couple_uuid
    and (user1_id = auth.uid() or user2_id = auth.uid())
  )
$$ language sql stable security definer;

-- Helper: check if two users share same couple
create or replace function public.are_partners(user_a uuid, user_b uuid)
returns boolean as $$
  select exists(
    select 1 from public.profiles p1
    join public.profiles p2 on p1.couple_id = p2.couple_id
    where p1.id = user_a and p2.id = user_b and p1.couple_id is not null
  )
$$ language sql stable;

-- ====================
-- PAIRING RPC — secure pairing via invite code
-- ====================
create or replace function public.pair_with_code(invite_code_input text)
returns jsonb as $$
declare
  current_profile public.profiles;
  target_profile public.profiles;
  new_couple_id uuid;
  cleaned_code text;
begin
  cleaned_code := upper(trim(invite_code_input));
  
  -- Get current user profile
  select * into current_profile from public.profiles where id = auth.uid();
  if not found then
    return jsonb_build_object('success', false, 'error', 'Your profile not found. Complete onboarding first.');
  end if;

  if current_profile.couple_id is not null then
    return jsonb_build_object('success', false, 'error', 'You are already paired. Unlink first to pair again.');
  end if;

  if current_profile.invite_code = cleaned_code then
    return jsonb_build_object('success', false, 'error', 'You cannot pair with your own code.');
  end if;

  -- Find target profile by invite code where not already paired
  select * into target_profile from public.profiles where invite_code = cleaned_code;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Invite code not found.');
  end if;

  if target_profile.couple_id is not null then
    return jsonb_build_object('success', false, 'error', 'This invite code has already been used to pair.');
  end if;

  -- Create couple
  insert into public.couples (user1_id, user2_id, status)
  values (target_profile.id, current_profile.id, 'paired')
  returning id into new_couple_id;

  -- Update both profiles
  update public.profiles set couple_id = new_couple_id where id in (current_profile.id, target_profile.id);

  return jsonb_build_object('success', true, 'couple_id', new_couple_id);
end;
$$ language plpgsql security definer;

-- Unpair RPC
create or replace function public.unpair_couple()
returns jsonb as $$
declare
  my_couple_id uuid;
  partner_id uuid;
begin
  select couple_id into my_couple_id from public.profiles where id = auth.uid();
  if my_couple_id is null then
    return jsonb_build_object('success', false, 'error', 'You are not currently paired.');
  end if;

  -- Clear couple_id from both profiles
  update public.profiles set couple_id = null where couple_id = my_couple_id;

  -- Delete couple
  delete from public.couples where id = my_couple_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Get partner profile (secure)
create or replace function public.get_partner_profile()
returns setof public.profiles as $$
  select p2.* from public.profiles p1
  join public.profiles p2 on p1.couple_id = p2.couple_id
  where p1.id = auth.uid() and p2.id != auth.uid() and p1.couple_id is not null
$$ language sql stable security definer;

-- ====================
-- MESSAGES (Phase 2 - full)
-- ====================
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message_type text default 'text' check (message_type in ('text','gif','sticker','reaction','system')),
  content text not null,
  metadata jsonb default '{}',
  seen boolean default false,
  created_at timestamptz default now() not null
);
create index if not exists idx_messages_couple_id on public.messages(couple_id, created_at desc);
create index if not exists idx_messages_search on public.messages using gin (to_tsvector('english', content));

-- Message reactions table (Phase 2)
create table if not exists public.message_reactions (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references public.messages(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now() not null,
  unique(message_id, user_id, emoji)
);
create index if not exists idx_reactions_message on public.message_reactions(message_id);
create index if not exists idx_reactions_couple on public.message_reactions(couple_id);

-- Future tables placeholders (Phase 3)
create table if not exists public.daily_questions (
  id uuid primary key default uuid_generate_v4(),
  question_text text not null,
  category text,
  active_date date default current_date,
  created_at timestamptz default now()
);

create table if not exists public.daily_answers (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade,
  question_id uuid references public.daily_questions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  answer_text text not null,
  answered_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(couple_id, question_id, user_id)
);

create table if not exists public.feed_posts (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content_type text default 'note' check (content_type in ('photo','note','milestone','game','call','memory')),
  content_text text,
  image_url text,
  metadata jsonb default '{}',
  is_pinned boolean default false,
  created_at timestamptz default now() not null
);
create index if not exists idx_feed_couple on public.feed_posts(couple_id, created_at desc);

-- ====================
-- RLS ENABLE
-- ====================
alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.daily_questions enable row level security;
alter table public.daily_answers enable row level security;
alter table public.feed_posts enable row level security;

-- Drop existing policies to re-create idempotently
do $$
begin
  -- profiles
  drop policy if exists "Allow all for pairing lookup via service" on public.profiles;
  drop policy if exists "Users can view own profile" on public.profiles;
  drop policy if exists "Users can view partner profile" on public.profiles;
  drop policy if exists "Users can view unpaired profiles via invite code" on public.profiles;
  drop policy if exists "Users can insert own profile" on public.profiles;
  drop policy if exists "Users can update own profile" on public.profiles;
  drop policy if exists "Users can view own and partner" on public.profiles;
  -- couples
  drop policy if exists "Couple members can view their couple" on public.couples;
  drop policy if exists "Users can insert couple via RPC" on public.couples;
  drop policy if exists "Users can insert couple via RPC check" on public.couples;
  drop policy if exists "Couple members can update their couple" on public.couples;
  drop policy if exists "Couple members can delete their couple" on public.couples;
  -- messages
  drop policy if exists "Couple members can manage messages" on public.messages;
  drop policy if exists "Couple members can view messages" on public.messages;
  drop policy if exists "Couple members can insert messages" on public.messages;
  drop policy if exists "Couple members can update messages" on public.messages;
  drop policy if exists "Couple members can delete messages" on public.messages;
  -- reactions
  drop policy if exists "Couple members manage reactions" on public.message_reactions;
  drop policy if exists "Couple members view reactions" on public.message_reactions;
  -- daily
  drop policy if exists "Anyone can view daily questions" on public.daily_questions;
  drop policy if exists "Couple members manage daily answers" on public.daily_answers;
  drop policy if exists "Couple members manage feed" on public.feed_posts;
end $$;

-- PROFILES policies
-- Allow authenticated users to read profiles that share same couple OR own OR unpaired (for invite lookup)
create policy "Users can view own and partner"
on public.profiles for select
using (
  auth.uid() = id
  or couple_id = public.get_my_couple_id()
  or couple_id is null  -- needed for invite code lookup, but still isolated because only unpaired are visible
);

create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Note: couple_id updates via RPC bypass RLS via security definer, but we also allow own update above.
-- For pairing to work via RPC, the RPC is security definer, so RLS on profiles/couples is bypassed inside function.
-- However to allow direct updates for onboarding, we need update policy.

-- COUPLES policies
create policy "Couple members can view their couple"
on public.couples for select
using (public.is_couple_member(id));

create policy "Couple members can update their couple"
on public.couples for update
using (public.is_couple_member(id))
with check (public.is_couple_member(id));

create policy "Couple members can delete their couple"
on public.couples for delete
using (public.is_couple_member(id));

-- For insert, we rely on RPC security definer, but also allow authenticated to insert if they are user1 or user2 (for manual if needed)
-- Actually prevent direct insert to force RPC usage — no insert policy means only service_role or security definer can insert.
-- We'll add a restrictive insert policy for service definer compatibility: allow if auth user is one of the members
create policy "Users can insert couple via RPC check"
on public.couples for insert
with check (user1_id = auth.uid() or user2_id = auth.uid());

-- MESSAGES (Phase 2)
create policy "Couple members can view messages"
on public.messages for select
using (couple_id = public.get_my_couple_id());

create policy "Couple members can insert messages"
on public.messages for insert
with check (couple_id = public.get_my_couple_id() and sender_id = auth.uid());

create policy "Couple members can update messages"
on public.messages for update
using (couple_id = public.get_my_couple_id())
with check (couple_id = public.get_my_couple_id());

create policy "Couple members can delete messages"
on public.messages for delete
using (couple_id = public.get_my_couple_id());

-- MESSAGE REACTIONS (Phase 2)
create policy "Couple members view reactions"
on public.message_reactions for select
using (couple_id = public.get_my_couple_id());

create policy "Couple members manage reactions"
on public.message_reactions for all
using (couple_id = public.get_my_couple_id())
with check (couple_id = public.get_my_couple_id() and user_id = auth.uid());

-- DAILY QUESTIONS - readable by all authenticated
create policy "Anyone can view daily questions"
on public.daily_questions for select
using (auth.role() = 'authenticated');

-- DAILY ANSWERS - only couple members
create policy "Couple members manage daily answers"
on public.daily_answers for all
using (couple_id = public.get_my_couple_id())
with check (couple_id = public.get_my_couple_id() and user_id = auth.uid());

-- FEED POSTS
create policy "Couple members manage feed"
on public.feed_posts for all
using (couple_id = public.get_my_couple_id())
with check (couple_id = public.get_my_couple_id() and author_id = auth.uid());

-- ====================
-- STORAGE bucket for avatars & feed images
-- ====================
-- Create bucket via SQL if not exists (requires storage schema)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('feed-images', 'feed-images', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Avatar public read"
on storage.objects for select
using (bucket_id in ('avatars','feed-images'));

create policy "Users can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars' and auth.role() = 'authenticated'
);

create policy "Users can update own avatar"
on storage.objects for update
using (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Couple members upload feed"
on storage.objects for insert
with check (
  bucket_id = 'feed-images' and auth.role() = 'authenticated'
);

-- Seed some daily questions
insert into public.daily_questions (question_text, category) values
('What little moment today made you think of us?', 'reflective'),
('If we could teleport anywhere for a 1-hour coffee date, where would we go?', 'playful'),
('What is one small thing I do that always makes you feel loved?', 'love'),
('What song reminds you of us right now?', 'playful'),
('What are you most looking forward to about our next visit?', 'future'),
('What is your favorite memory of us laughing together?', 'memory'),
('If our love had a scent, what would it smell like?', 'playful'),
('What is one thing you appreciated about me this week?', 'appreciation'),
('What is a tiny ritual you want us to have every day?', 'ritual'),
('What would be our perfect lazy Sunday together?', 'future')
on conflict do nothing;
