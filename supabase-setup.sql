-- Esegui questo script nel SQL Editor del tuo progetto Supabase.
create table if not exists public.shared_workspace (
  id integer primary key,
  rows jsonb not null default '[]'::jsonb,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  constraint shared_workspace_singleton check (id = 1)
);

alter table public.shared_workspace enable row level security;

-- ATTENZIONE: accesso pubblico a chiunque abbia il link.
drop policy if exists "Public can read shared workspace" on public.shared_workspace;
drop policy if exists "Public can insert shared workspace" on public.shared_workspace;
drop policy if exists "Public can update shared workspace" on public.shared_workspace;

create policy "Public can read shared workspace"
on public.shared_workspace for select to anon using (true);

create policy "Public can insert shared workspace"
on public.shared_workspace for insert to anon with check (id = 1);

create policy "Public can update shared workspace"
on public.shared_workspace for update to anon using (id = 1) with check (id = 1);

grant select, insert, update on public.shared_workspace to anon;

-- Abilita gli eventi Realtime per questa tabella.
do $$
begin
  alter publication supabase_realtime add table public.shared_workspace;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'La publication supabase_realtime non esiste: abilita Realtime dalla dashboard Supabase per shared_workspace.';
end $$;
