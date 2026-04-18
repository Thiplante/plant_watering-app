alter table public.plants
add column if not exists custom_name text,
add column if not exists identified_name text,
add column if not exists scientific_name text,
add column if not exists identification_confidence integer,
add column if not exists identification_options jsonb not null default '[]'::jsonb;
