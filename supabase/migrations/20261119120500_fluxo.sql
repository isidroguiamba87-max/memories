-- =====================================================================
-- Memória — fluxo Convidado / Administrador (v1.0)
--   eventos: informação (descrição, local, mapa, contactos, capa) e permissões
--   videos: vídeo oficial (upload), transmissão em directo ou link
--   visitas: visualizações por dia
--   ficheiros.etiqueta: origem declarada (fotógrafo · MC · convidado)
--   acessos.na_pagina: QR de convidados mostrado na página pública
--   publicar: eventos novos começam como rascunho (publico = false)
-- Pode ser corrido mais do que uma vez.
-- =====================================================================

-- ---------- eventos ----------
alter table public.eventos
  add column if not exists descricao        text,
  add column if not exists local_nome       text,
  add column if not exists endereco         text,
  add column if not exists mapa             text,
  add column if not exists telefone         text,
  add column if not exists email            text,
  add column if not exists capa_path        text,
  add column if not exists permitir_envios  boolean not null default true,
  add column if not exists mostrar_videos   boolean not null default true,
  add column if not exists galeria_publica  boolean not null default true,
  add column if not exists publicado_em     timestamptz;

do $$ begin
  alter table public.eventos add constraint eventos_descricao_tam check (char_length(descricao) <= 4000);
exception when duplicate_object then null; end $$;

-- ---------- acessos / ficheiros ----------
alter table public.acessos   add column if not exists na_pagina boolean not null default false;
alter table public.ficheiros add column if not exists etiqueta  text;
do $$ begin
  alter table public.ficheiros add constraint ficheiros_etiqueta_ok check (etiqueta in ('fotografo','mc','convidado'));
exception when duplicate_object then null; end $$;

update public.acessos set na_pagina = true
 where perfil = 'convidado' and nome = 'QR geral dos convidados'
   and not exists (select 1 from public.acessos b where b.evento_id = acessos.evento_id and b.na_pagina);

-- ---------- vídeos ----------
create table if not exists public.videos (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references public.eventos(id) on delete cascade,
  parte_id      uuid references public.partes(id) on delete set null,
  titulo        text not null check (char_length(titulo) between 1 and 160),
  tipo          text not null check (tipo in ('upload','live','link')),
  storage_path  text unique,
  url           text,
  duracao       text,
  oficial       boolean not null default true,
  ordem         int not null default 0,
  criado_em     timestamptz not null default now(),
  constraint videos_origem check ((tipo = 'upload' and storage_path is not null) or (tipo <> 'upload' and url is not null))
);
create index if not exists videos_evento_idx on public.videos (evento_id, ordem);

-- ---------- visitas ----------
create table if not exists public.visitas (
  evento_id  uuid not null references public.eventos(id) on delete cascade,
  dia        date not null default current_date,
  n          int  not null default 0,
  primary key (evento_id, dia)
);

create or replace function public.registar_visita(p_evento_id uuid)
returns void language sql volatile security definer set search_path = public as $$
  insert into public.visitas (evento_id, dia, n)
  select id, current_date, 1 from public.eventos where id = p_evento_id and publico
  on conflict (evento_id, dia) do update set n = public.visitas.n + 1;
$$;

-- QR de convidados mostrado na página pública de cada evento publicado
create or replace function public.tokens_publicos()
returns table (evento_id uuid, token text)
language sql stable security definer set search_path = public as $$
  select distinct on (a.evento_id) a.evento_id, a.token
    from public.acessos a join public.eventos e on e.id = a.evento_id
   where e.publico and e.permitir_envios and a.perfil = 'convidado' and a.ativo and a.na_pagina
     and (a.expira_em is null or a.expira_em > now())
   order by a.evento_id, a.criado_em;
$$;

-- ---------- token válido só se o evento aceitar envios ----------
create or replace function public.token_valido(p_token text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.acessos a join public.eventos e on e.id = a.evento_id
                 where a.token = p_token and a.ativo and (a.expira_em is null or a.expira_em > now())
                   and (e.permitir_envios or a.perfil = 'fotografo'));
$$;

-- ---------- acesso_info: inclui informação e permissões do evento ----------
create or replace function public.acesso_info(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a public.acessos;
begin
  select * into a from public.acessos
   where token = p_token and ativo and (expira_em is null or expira_em > now());
  if not found then return null; end if;

  return jsonb_build_object(
    'acesso', jsonb_build_object('id', a.id, 'perfil', a.perfil, 'nome', a.nome),
    'evento', (select jsonb_build_object('id', e.id, 'slug', e.slug, 'titulo', e.titulo, 'local', e.local,
                                         'categoria_id', e.categoria_id, 'descricao', e.descricao,
                                         'local_nome', e.local_nome, 'endereco', e.endereco, 'mapa', e.mapa,
                                         'telefone', e.telefone, 'email', e.email,
                                         'permitir_envios', e.permitir_envios or a.perfil = 'fotografo')
                 from public.eventos e where e.id = a.evento_id),
    'partes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'slug', p.slug, 'titulo', p.titulo, 'data', p.data, 'tipo_id', p.tipo_id,
               'tema_id', coalesce(p.tema_id, t.tema_id), 'momento_actual_id', p.momento_actual_id,
               'momentos', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'hora', m.hora, 'nome', m.nome, 'local', m.local, 'ordem', m.ordem) order by m.ordem)
                                       from public.momentos m where m.parte_id = p.id), '[]'::jsonb),
               'missoes',  coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'icone', q.icone, 'titulo', q.titulo, 'momento_id', q.momento_id) order by q.ordem)
                                       from public.missoes q where q.parte_id = p.id), '[]'::jsonb))
             order by p.data nulls last, p.ordem)
        from public.partes p join public.tipos_evento t on t.id = p.tipo_id
       where p.evento_id = a.evento_id and public.parte_permitida(a.id, p.id)), '[]'::jsonb)
  );
end $$;

-- ---------- registar_envio: respeita "Permitir envios" e guarda a origem declarada ----------
drop function if exists public.registar_envio(text, uuid, uuid, uuid, text, jsonb);
create or replace function public.registar_envio(
  p_token text, p_parte_id uuid, p_momento_id uuid, p_missao_id uuid,
  p_autor text, p_ficheiros jsonb, p_etiqueta text default null)
returns int language plpgsql volatile security definer set search_path = public as $$
declare a public.acessos; f jsonb; n int := 0; v_et text;
begin
  select * into a from public.acessos
   where token = p_token and ativo and (expira_em is null or expira_em > now())
   for update;
  if not found then raise exception 'Link inválido ou desactivado'; end if;
  if a.perfil = 'convidado' and not (select permitir_envios from public.eventos where id = a.evento_id) then
    raise exception 'A organização fechou os envios deste evento';
  end if;
  if not public.parte_permitida(a.id, p_parte_id) then raise exception 'Este link não dá acesso a esta parte do evento'; end if;
  if jsonb_typeof(p_ficheiros) <> 'array' or jsonb_array_length(p_ficheiros) = 0 then raise exception 'Sem ficheiros'; end if;
  if jsonb_array_length(p_ficheiros) > 20 then raise exception 'Máximo de 20 ficheiros por envio'; end if;
  v_et := case when p_etiqueta in ('fotografo','mc','convidado') then p_etiqueta
               when a.perfil = 'fotografo' then 'fotografo' else 'convidado' end;

  for f in select * from jsonb_array_elements(p_ficheiros) loop
    if (f->>'path') not like p_token || '/' || p_parte_id::text || '/%' then
      raise exception 'Caminho de ficheiro inválido: %', f->>'path';
    end if;
    insert into public.ficheiros (parte_id, momento_id, missao_id, acesso_id, storage_path, tipo, mime,
                                  tamanho, largura, altura, autor_nome, origem, estado, etiqueta)
    values (p_parte_id, p_momento_id, p_missao_id, a.id, f->>'path', coalesce(f->>'tipo','imagem'), f->>'mime',
            (f->>'tamanho')::bigint, (f->>'largura')::int, (f->>'altura')::int,
            nullif(left(trim(coalesce(p_autor, '')), 80), ''),
            case a.perfil when 'fotografo' then 'fotografo' else 'participante' end,
            case a.perfil when 'fotografo' then 'publicada' else 'pendente' end, v_et);
    n := n + 1;
  end loop;

  update public.acessos set usos = usos + 1 where id = a.id;
  return n;
end $$;

-- ---------- criar_evento: rascunho + QR geral mostrado na página ----------
create or replace function public.criar_evento(
  p_slug text, p_titulo text, p_categoria text, p_local text, p_partes jsonb)
returns uuid language plpgsql volatile security invoker set search_path = public as $$
declare v_ev uuid; p jsonb; v_slug text := p_slug; i int := 2;
begin
  if not public.e_admin() then raise exception 'Só a organização pode criar eventos'; end if;
  if jsonb_typeof(p_partes) <> 'array' or jsonb_array_length(p_partes) = 0 then
    raise exception 'O evento precisa de pelo menos uma parte';
  end if;
  while exists (select 1 from public.eventos where slug = v_slug) loop
    v_slug := p_slug || '-' || i; i := i + 1;
  end loop;
  insert into public.eventos (slug, titulo, categoria_id, local, publico)
  values (v_slug, trim(p_titulo), p_categoria, nullif(trim(coalesce(p_local, '')), ''), false)
  returning id into v_ev;
  for p in select * from jsonb_array_elements(p_partes) loop
    perform public.criar_parte_de_modelo(v_ev, (p->>'modelo_id')::uuid, p->>'titulo', nullif(p->>'data', '')::date);
  end loop;
  insert into public.acessos (evento_id, perfil, nome, na_pagina)
  values (v_ev, 'convidado', 'QR geral dos convidados', true), (v_ev, 'fotografo', 'Fotógrafo principal', false);
  return v_ev;
end $$;

-- ---------- segurança ----------
alter table public.videos  enable row level security;
alter table public.visitas enable row level security;

drop policy if exists "videos: leitura publica" on public.videos;
drop policy if exists "videos: admin"           on public.videos;
drop policy if exists "visitas: admin"          on public.visitas;
create policy "videos: leitura publica" on public.videos for select
  using (public.e_admin() or exists (select 1 from public.eventos e where e.id = evento_id and e.publico and e.mostrar_videos));
create policy "videos: admin"  on public.videos  for all using (public.e_admin()) with check (public.e_admin());
create policy "visitas: admin" on public.visitas for select using (public.e_admin());

-- fotos públicas só com "Galeria pública" ligada
drop policy if exists "ficheiros: leitura publica" on public.ficheiros;
create policy "ficheiros: leitura publica" on public.ficheiros for select
  using (public.e_admin() or (estado = 'publicada' and exists
         (select 1 from public.eventos e where e.id = evento_id and e.publico and e.galeria_publica)));

-- Storage: ler fotos publicadas, vídeos e capas de eventos publicados
drop policy if exists "ficheiros: ler publicados" on storage.objects;
create policy "ficheiros: ler publicados" on storage.objects for select to anon, authenticated
  using (bucket_id = 'ficheiros' and (
         public.e_admin()
      or exists (select 1 from public.ficheiros f join public.eventos e on e.id = f.evento_id
                  where f.storage_path = name and f.estado = 'publicada' and e.publico and e.galeria_publica)
      or exists (select 1 from public.videos v join public.eventos e on e.id = v.evento_id
                  where v.storage_path = name and e.publico and e.mostrar_videos)
      or exists (select 1 from public.eventos e where e.capa_path = name and e.publico)));

-- Storage: a organização carrega capas e vídeos em "admin/…"
drop policy if exists "ficheiros: admin carrega" on storage.objects;
create policy "ficheiros: admin carrega" on storage.objects for insert to authenticated
  with check (bucket_id = 'ficheiros' and (storage.foldername(name))[1] = 'admin' and public.e_admin());

grant select on public.videos to anon;
grant select, insert, update, delete on public.videos, public.visitas to authenticated;
grant execute on function public.registar_visita(uuid) to anon, authenticated;
grant execute on function public.tokens_publicos()     to anon, authenticated;
grant execute on function public.acesso_info(text)     to anon, authenticated;
grant execute on function public.token_valido(text)    to anon, authenticated;
revoke execute on function public.registar_envio(text, uuid, uuid, uuid, text, jsonb, text) from public;
grant  execute on function public.registar_envio(text, uuid, uuid, uuid, text, jsonb, text) to anon, authenticated;
