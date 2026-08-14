-- Migration Phase 2 — Chat, Stickers, GIFs, Reactions
-- Run after Phase 1 schema if you already deployed Phase 1

-- Messages table already existed in Phase 1, ensure indexes
create index if not exists idx_messages_couple_id on public.messages(couple_id, created_at desc);
create index if not exists idx_messages_search on public.messages using gin (to_tsvector('english', content));

-- Message reactions table
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

alter table public.message_reactions enable row level security;

drop policy if exists "Couple members view reactions" on public.message_reactions;
drop policy if exists "Couple members manage reactions" on public.message_reactions;

create policy "Couple members view reactions"
on public.message_reactions for select
using (couple_id = public.get_my_couple_id());

create policy "Couple members manage reactions"
on public.message_reactions for all
using (couple_id = public.get_my_couple_id())
with check (couple_id = public.get_my_couple_id() and user_id = auth.uid());

-- Ensure messages RLS is correct (split into separate policies)
drop policy if exists "Couple members can manage messages" on public.messages;
drop policy if exists "Couple members can view messages" on public.messages;
drop policy if exists "Couple members can insert messages" on public.messages;
drop policy if exists "Couple members can update messages" on public.messages;
drop policy if exists "Couple members can delete messages" on public.messages;

create policy "Couple members can view messages"
on public.messages for select using (couple_id = public.get_my_couple_id());

create policy "Couple members can insert messages"
on public.messages for insert with check (couple_id = public.get_my_couple_id() and sender_id = auth.uid());

create policy "Couple members can update messages"
on public.messages for update using (couple_id = public.get_my_couple_id()) with check (couple_id = public.get_my_couple_id());

create policy "Couple members can delete messages"
on public.messages for delete using (couple_id = public.get_my_couple_id());

-- Note: Realtime enabled by default on Supabase for messages table — no extra config needed if Realtime enabled in dashboard.
-- For typing indicator, we use Supabase Realtime Broadcast (no table), so nothing to migrate.
