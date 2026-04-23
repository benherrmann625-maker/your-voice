create table if not exists public.voice_items (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists voice_items_user_updated_idx
  on public.voice_items (user_id, updated_at desc);

alter table public.voice_items enable row level security;

drop policy if exists "Users can read their own voice items" on public.voice_items;
create policy "Users can read their own voice items"
  on public.voice_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own voice items" on public.voice_items;
create policy "Users can insert their own voice items"
  on public.voice_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own voice items" on public.voice_items;
create policy "Users can update their own voice items"
  on public.voice_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own voice items" on public.voice_items;
create policy "Users can delete their own voice items"
  on public.voice_items
  for delete
  using (auth.uid() = user_id);
