-- ══════════════════════════════════════════════════════════════════
-- MODULE DECOUPE — à exécuter dans le SQL Editor de Supabase
-- Crée : decoupe_glossaire, decoupe_reglages, decoupe_chutes, decoupe_runs
-- ══════════════════════════════════════════════════════════════════

-- ── Glossaire de traduction (Nom de l'objet : EN/FR → terme atelier) ──
-- cle = terme source normalisé (minuscules, sans accents, espaces réduits)
create table if not exists decoupe_glossaire (
  id bigserial primary key,
  cle text not null unique,
  terme_source text not null,        -- tel qu'il sort de Palette, pour l'affichage
  terme_fr text not null,            -- ce qui est écrit dans la liste et le bon
  garder_tel_quel boolean not null default false,  -- FILLEUR, PAN FIN, PLINTHE BAS…
  created_at timestamptz not null default now()
);

-- ── Réglages de découpe, par matière (+ une ligne 'DEFAUT') ──
create table if not exists decoupe_reglages (
  id bigserial primary key,
  materiau text not null unique,     -- 'DEFAUT' ou ex. '0H251/W06 18mm'
  veine boolean not null default true,   -- true = sens du fil, rotation interdite
  kerf_mm numeric not null default 5,    -- trait de scie
  rive_mm numeric not null default 0,    -- coupe de rive sur les 4 bords
  panneau_long_mm numeric,               -- panneau neuf, 1er chiffre = sens du fil
  panneau_larg_mm numeric,
  traduire boolean not null default true,
  created_at timestamptz not null default now()
);

insert into decoupe_reglages (materiau, veine, kerf_mm, rive_mm, panneau_long_mm, panneau_larg_mm)
values ('DEFAUT', true, 5, 0, 2800, 2070)
on conflict (materiau) do nothing;

-- ── Chutes d'atelier disponibles (stock pour l'optimiseur) ──
create table if not exists decoupe_chutes (
  id bigserial primary key,
  materiau text not null,
  long_mm numeric not null,          -- 1er chiffre = sens du fil si matière veinée
  larg_mm numeric not null,
  quantite integer not null default 1,
  rive_mm numeric not null default 0,  -- 0 = chute calibrée, 5 = chute ébréchée
  note text,
  disponible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists decoupe_chutes_materiau_idx on decoupe_chutes (materiau);

-- ── Historique des traitements (quel CSV, quels réglages, quel résultat) ──
create table if not exists decoupe_runs (
  id bigserial primary key,
  project_id bigint references projects(id) on delete set null,
  reference text not null,           -- référence portée par le bon de commande
  fichier_source text,
  nb_pieces integer,
  reglages jsonb not null default '{}',
  resultat jsonb not null default '{}',   -- supprimées, arrondies, termes inconnus…
  created_at timestamptz not null default now()
);

-- ── Mêmes règles d'accès que vos autres tables ──
alter table decoupe_glossaire enable row level security;
alter table decoupe_reglages  enable row level security;
alter table decoupe_chutes    enable row level security;
alter table decoupe_runs      enable row level security;
create policy "Allow all" on decoupe_glossaire for all using (true) with check (true);
create policy "Allow all" on decoupe_reglages  for all using (true) with check (true);
create policy "Allow all" on decoupe_chutes    for all using (true) with check (true);
create policy "Allow all" on decoupe_runs      for all using (true) with check (true);
