-- Run this in Supabase Dashboard > SQL Editor.
-- It adds the events feature without replacing shared_workspace.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 100),
  description text check (description is null or char_length(description) <= 1200),
  event_date timestamptz not null,
  location text check (location is null or char_length(location) <= 120),
  creator_nickname text not null check (char_length(trim(creator_nickname)) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 40),
  created_at timestamptz not null default now()
);

-- Prevent the same nickname from registering more than once for the same event,
-- treating upper/lower case as equivalent.
create unique index if not exists event_attendees_event_nickname_unique
  on public.event_attendees (event_id, lower(trim(nickname)));
create index if not exists events_event_date_idx on public.events (event_date);
create index if not exists event_attendees_event_id_idx on public.event_attendees (event_id);

alter table public.events enable row level security;
alter table public.event_attendees enable row level security;

-- Visitors without accounts can read and create events/register, but cannot update/delete rows.
revoke all on table public.events from anon, authenticated;
revoke all on table public.event_attendees from anon, authenticated;
grant select, insert on table public.events to anon, authenticated;
grant select, insert on table public.event_attendees to anon, authenticated;

drop policy if exists "Anyone can view events" on public.events;
drop policy if exists "Anyone can create events" on public.events;
drop policy if exists "Anyone can view event registrations" on public.event_attendees;
drop policy if exists "Anyone can register for events" on public.event_attendees;

create policy "Anyone can view events"
  on public.events for select to anon, authenticated using (true);
create policy "Anyone can create events"
  on public.events for insert to anon, authenticated with check (true);
create policy "Anyone can view event registrations"
  on public.event_attendees for select to anon, authenticated using (true);
create policy "Anyone can register for events"
  on public.event_attendees for insert to anon, authenticated with check (true);

-- Enable Supabase Realtime for both new tables if the publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events') then
      execute 'alter publication supabase_realtime add table public.events';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_attendees') then
      execute 'alter publication supabase_realtime add table public.event_attendees';
    end if;
  end if;
end $$;
