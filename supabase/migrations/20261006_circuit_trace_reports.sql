create table if not exists circuit_trace_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  machine text not null,
  fault text not null,
  circuit_id text not null,
  readings jsonb not null default '[]'::jsonb,
  conclusion jsonb,
  safety_confirmed jsonb not null
);
