-- Run this in your Supabase SQL Editor
create table if not exists devis (
  id bigserial primary key,
  devis_number text generated always as ('D-' || lpad(id::text, 4, '0')) stored,
  client_name text not null,
  client_address text,
  client_phone text,
  client_email text,
  project_id bigint references projects(id) on delete set null,
  items jsonb not null default '[]',
  notes text,
  tva numeric not null default 21,
  photos jsonb default '[]',
  created_at timestamptz not null default now()
);

-- Allow anon read/write (same as your other tables)
alter table devis enable row level security;
create policy "Allow all" on devis for all using (true) with check (true);
