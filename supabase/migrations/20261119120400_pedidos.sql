-- =====================================================================
-- Memória — pedidos vindos da página inicial
-- ("Solicitar uma galeria", "Quero colaborar", "Solicitar informações")
-- Qualquer pessoa envia; só a organização lê.
-- =====================================================================
create table if not exists public.pedidos (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null default 'galeria' check (tipo in ('galeria','fotografo','informacao')),
  nome         text not null check (char_length(nome) between 1 and 120),
  contacto     text not null check (char_length(contacto) between 3 and 160),
  tipo_evento  text check (char_length(tipo_evento) <= 60),
  data_evento  date,
  mensagem     text check (char_length(mensagem) <= 2000),
  estado       text not null default 'novo' check (estado in ('novo','respondido','arquivado')),
  criado_em    timestamptz not null default now()
);
create index if not exists pedidos_estado_idx on public.pedidos (estado, criado_em desc);

alter table public.pedidos enable row level security;
drop policy if exists "pedidos: enviar" on public.pedidos;
drop policy if exists "pedidos: admin"  on public.pedidos;
create policy "pedidos: enviar" on public.pedidos for insert to anon, authenticated with check (estado = 'novo');
create policy "pedidos: admin"  on public.pedidos for all using (public.e_admin()) with check (public.e_admin());

grant insert on public.pedidos to anon;
grant select, insert, update, delete on public.pedidos to authenticated;
