alter table public.sleeps
  add column if not exists group_id text;

alter table public.walks
  add column if not exists group_id text;

create index if not exists sleeps_group_id_idx
  on public.sleeps (group_id)
  where group_id is not null;

create index if not exists walks_group_id_idx
  on public.walks (group_id)
  where group_id is not null;
