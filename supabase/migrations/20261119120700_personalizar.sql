-- =====================================================================
-- Memória — personalização
--   eventos.cor   : cor de destaque da página do evento (#RRGGBB; vazio = tema)
--   eventos.fonte : tipo de letra dos títulos (lista fechada; vazio = Cormorant Garamond)
--   site_config   : configuração da página inicial (ex.: fotos da faixa da galeria)
--   storage       : o público lê as fotos carregadas para a página inicial (admin/site/…)
-- Pode ser corrido mais do que uma vez.
-- =====================================================================

alter table public.eventos
  add column if not exists cor   text,
  add column if not exists fonte text;

do $$ begin
  alter table public.eventos add constraint eventos_cor_ok check (cor is null or cor ~ '^#[0-9A-Fa-f]{6}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.eventos add constraint eventos_fonte_ok
    check (fonte is null or fonte in ('cormorant','playfair','lora','dmserif','greatvibes','montserrat','poppins'));
exception when duplicate_object then null; end $$;

-- ---------- configuração do site (chave → JSON) ----------
create table if not exists public.site_config (
  chave           text primary key check (char_length(chave) between 1 and 60),
  valor           jsonb not null default '{}'::jsonb,
  actualizado_em  timestamptz not null default now()
);
alter table public.site_config enable row level security;
drop policy if exists "site_config: leitura publica" on public.site_config;
drop policy if exists "site_config: admin"           on public.site_config;
create policy "site_config: leitura publica" on public.site_config for select using (true);
create policy "site_config: admin" on public.site_config for all using (public.e_admin()) with check (public.e_admin());
grant select on public.site_config to anon, authenticated;
grant insert, update, delete on public.site_config to authenticated;

-- ---------- storage: fotos da página inicial ----------
-- Política separada (não substitui "ficheiros: ler publicados", que tem capas e vídeos).
drop policy if exists "ficheiros: ler site" on storage.objects;
create policy "ficheiros: ler site" on storage.objects for select to anon, authenticated
  using (bucket_id = 'ficheiros' and name like 'admin/site/%');

notify pgrst, 'reload schema';
