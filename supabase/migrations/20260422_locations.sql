create extension if not exists pgcrypto;

create table if not exists public.plant_locations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.plants
add column if not exists location_id uuid references public.plant_locations (id) on delete set null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_plant_locations_updated_at on public.plant_locations;
create trigger set_plant_locations_updated_at
before update on public.plant_locations
for each row
execute function public.set_updated_at();

alter table public.plant_locations enable row level security;

drop policy if exists "plant_locations_select_own" on public.plant_locations;
create policy "plant_locations_select_own"
on public.plant_locations
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "plant_locations_modify_own" on public.plant_locations;
create policy "plant_locations_modify_own"
on public.plant_locations
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
