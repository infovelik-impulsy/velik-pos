-- Run this in Supabase SQL Editor

create table if not exists ventas (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  fecha date default current_date,
  appointment_id text,
  contact_id text,
  cliente_nombre text not null,
  cliente_telefono text,
  profesional_id text not null,
  profesional_nombre text not null,
  servicios jsonb not null default '[]',
  total numeric not null,
  metodo_pago text not null check (metodo_pago in ('efectivo','transferencia','tarjeta','mixto')),
  pagado_efectivo numeric default 0,
  pagado_digital numeric default 0,
  comision_profesional numeric not null,
  comision_velik numeric not null,
  notas text,
  estado text default 'completada'
);

create table if not exists gastos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  fecha date default current_date,
  descripcion text not null,
  monto numeric not null,
  categoria text default 'operativo'
);

create table if not exists comisiones_config (
  id uuid default gen_random_uuid() primary key,
  profesional_id text unique not null,
  profesional_nombre text not null,
  porcentaje_profesional numeric default 50,
  porcentaje_velik numeric default 50
);

-- Seed commission config for the 3 professionals
insert into comisiones_config (profesional_id, profesional_nombre, porcentaje_profesional, porcentaje_velik) values
  ('Bn1QrO4ITpYI7wSohG9r', 'Carolina Paz', 50, 50),
  ('DEeqUttYKgjjsfNaS1XY', 'Laura Vanessa', 50, 50),
  ('UzLj5T8ZOrJ8reSig5os', 'Luz Aida', 50, 50)
on conflict (profesional_id) do nothing;
