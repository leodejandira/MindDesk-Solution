-- Ponto com selfie + geolocalização (auditoria pelo gerente).
-- Rodar uma vez no SQL Editor do Supabase. É idempotente (pode rodar de novo sem erro).

-- 1. Locais onde o ponto pode ser batido (geofence por raio).
create table if not exists public.locais_trabalho (
  id serial primary key,
  tenant_id integer not null,
  nome text not null,
  latitude double precision not null,
  longitude double precision not null,
  raio_metros integer not null default 150 check (raio_metros > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Dados de auditoria em cada registro de ponto.
--    Registros antigos ficam com status 'aprovado', então relatórios existentes não mudam.
alter table public.pontos
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists precisao_metros double precision,
  add column if not exists local_trabalho_id integer references public.locais_trabalho(id),
  add column if not exists distancia_metros double precision,
  add column if not exists localizacao_falsa boolean not null default false,
  add column if not exists metodo text,
  add column if not exists foto_url text,
  add column if not exists status_validacao text not null default 'aprovado';

do $$ begin
  alter table public.pontos add constraint pontos_status_validacao_check
    check (status_validacao in ('aprovado', 'pendente_revisao', 'rejeitado'));
exception when duplicate_object then null; end $$;

-- 3. Bucket PRIVADO para as selfies (biometria = dado sensível na LGPD).
--    O gerente vê as fotos por link assinado temporário, gerado pelo back-end.
insert into storage.buckets (id, name, public)
values ('pontos', 'pontos', false)
on conflict (id) do nothing;
