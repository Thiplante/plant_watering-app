create extension if not exists pgcrypto;

create table if not exists public.plant_notes (
  plant_id uuid primary key references public.plants (id) on delete cascade,
  repotted_at date,
  leaf_status text,
  fertilizer_added_at date,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_id uuid references public.plants (id) on delete cascade,
  notification_key text not null,
  type text not null,
  level text not null default 'info',
  title text not null,
  message text not null,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notifications_user_key_unique unique (user_id, notification_key)
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

drop trigger if exists set_plant_notes_updated_at on public.plant_notes;
create trigger set_plant_notes_updated_at
before update on public.plant_notes
for each row
execute function public.set_updated_at();

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at
before update on public.notifications
for each row
execute function public.set_updated_at();

alter table public.plant_notes enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "plant_notes_select" on public.plant_notes;
create policy "plant_notes_select"
on public.plant_notes
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

drop policy if exists "plant_notes_upsert" on public.plant_notes;
create policy "plant_notes_upsert"
on public.plant_notes
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

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_modify_own" on public.notifications;
create policy "notifications_modify_own"
on public.notifications
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
