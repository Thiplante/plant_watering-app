create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
add column if not exists display_name text,
add column if not exists household_name text,
add column if not exists default_city text,
add column if not exists experience_level text default 'debutant',
add column if not exists interface_mode text default 'guided',
add column if not exists notification_opt_in boolean not null default false,
add column if not exists onboarding_completed boolean not null default false,
add column if not exists created_at timestamptz not null default timezone('utc', now()),
add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.profiles
set interface_mode = coalesce(interface_mode, 'guided')
where interface_mode is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_modify_own" on public.profiles;
create policy "profiles_modify_own"
on public.profiles
for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
