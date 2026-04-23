create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  household_name text,
  default_city text,
  experience_level text default 'debutant',
  interface_mode text not null default 'guided',
  notification_opt_in boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.plant_notes
add column if not exists location_label text,
add column if not exists pot_size text,
add column if not exists substrate_type text,
add column if not exists purchase_date date,
add column if not exists pets_present boolean not null default false,
add column if not exists children_present boolean not null default false;

create table if not exists public.plant_journal_entries (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  entry_type text not null default 'note',
  title text,
  note text,
  image_url text,
  observed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.plant_health_checks (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  image_url text,
  summary text not null,
  urgency text not null default 'medium',
  likely_cause text,
  recommendations jsonb not null default '[]'::jsonb,
  raw_observations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

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

drop trigger if exists set_plant_journal_entries_updated_at on public.plant_journal_entries;
create trigger set_plant_journal_entries_updated_at
before update on public.plant_journal_entries
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.plant_journal_entries enable row level security;
alter table public.plant_health_checks enable row level security;

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

drop policy if exists "plant_journal_entries_select" on public.plant_journal_entries;
create policy "plant_journal_entries_select"
on public.plant_journal_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.plants p
    where p.id = plant_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.plant_shares ps
          where ps.plant_id = p.id
            and lower(ps.user_email) = lower(auth.jwt() ->> 'email')
        )
      )
  )
);

drop policy if exists "plant_journal_entries_modify" on public.plant_journal_entries;
create policy "plant_journal_entries_modify"
on public.plant_journal_entries
for all
to authenticated
using (
  exists (
    select 1
    from public.plants p
    where p.id = plant_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.plants p
    where p.id = plant_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "plant_health_checks_select" on public.plant_health_checks;
create policy "plant_health_checks_select"
on public.plant_health_checks
for select
to authenticated
using (
  exists (
    select 1
    from public.plants p
    where p.id = plant_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.plant_shares ps
          where ps.plant_id = p.id
            and lower(ps.user_email) = lower(auth.jwt() ->> 'email')
        )
      )
  )
);

drop policy if exists "plant_health_checks_modify" on public.plant_health_checks;
create policy "plant_health_checks_modify"
on public.plant_health_checks
for all
to authenticated
using (
  exists (
    select 1
    from public.plants p
    where p.id = plant_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.plants p
    where p.id = plant_id
      and p.owner_id = auth.uid()
  )
);
