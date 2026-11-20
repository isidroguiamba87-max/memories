-- =====================================================================
-- Memória — esquema inicial (Supabase / Postgres)
--
-- Organização:
--   catálogo      categorias · temas · tipos_evento · modelos (+ momentos e missões dos modelos)
--   eventos       eventos → partes (lobolo, casamento…) → momentos · missoes · votos
--   acessos       links/QR por evento: vários de convidados, vários de fotógrafos
--   ficheiros     fotos e vídeos (Storage, bucket privado "ficheiros")
--   organização   administradores (utilizadores do Supabase Auth)
--
-- Convidados e fotógrafos NÃO fazem login: entram pelo token do link/QR.
-- Tudo o que fazem passa por funções (acesso_info, registar_envio) que validam o token.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. CATÁLOGO (tipos de evento e modelos de programa)
-- ---------------------------------------------------------------------
create table public.categorias (
  id         text primary key,                 -- 'uniao', 'familia', ...
  nome       text not null,
  icone      text,
  descricao  text,
  ordem      int  not null default 0
);

create table public.temas (
  id              text primary key,            -- 'marfim', 'capulana', ...
  nome            text not null,
  cor_destaque    text not null,               -- --gold
  cor_secundaria  text not null,               -- --terra
  cor_fundo       text not null,               -- --ivory
  cor_areia       text not null,               -- --sand
  cor_linha       text not null                -- --line
);

create table public.tipos_evento (
  id            text primary key,              -- 'casamento', 'lobolo', ...
  categoria_id  text not null references public.categorias(id),
  nome          text not null,
  icone         text,
  descricao     text,
  tema_id       text not null references public.temas(id),
  ordem         int  not null default 0
);

create table public.modelos (                  -- modelos de programa de cada tipo
  id       uuid primary key default gen_random_uuid(),
  tipo_id  text not null references public.tipos_evento(id) on delete cascade,
  codigo   text not null,                      -- 'classico', 'completo', ...
  nome     text not null,
  ordem    int  not null default 0,
  unique (tipo_id, codigo)
);

create table public.modelo_momentos (
  id         uuid primary key default gen_random_uuid(),
  modelo_id  uuid not null references public.modelos(id) on delete cascade,
  ordem      int  not null,
  hora       time,
  nome       text not null,
  local      text,
  unique (modelo_id, ordem)
);

create table public.modelo_missoes (
  id             uuid primary key default gen_random_uuid(),
  modelo_id      uuid not null references public.modelos(id) on delete cascade,
  ordem          int  not null,
  icone          text,
  titulo         text not null,
  momento_ordem  int  not null,                -- em que momento do modelo entra
  unique (modelo_id, ordem)
);


-- ---------------------------------------------------------------------
-- 2. ORGANIZAÇÃO (quem entra no painel)
-- ---------------------------------------------------------------------
create table public.administradores (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nome       text,
  criado_em  timestamptz not null default now()
);

create or replace function public.e_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.administradores where user_id = auth.uid());
$$;


-- ---------------------------------------------------------------------
-- 3. EVENTOS E PARTES
-- ---------------------------------------------------------------------
create table public.eventos (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo            text not null,
  categoria_id      text not null references public.categorias(id),
  local             text,
  estado            text not null default 'auto'
                    check (estado in ('auto','preparacao','decorrer','encerrado')),
  publico           boolean not null default true,   -- false = página pública escondida
  capa_ficheiro_id  uuid,                            -- FK definida mais abaixo
  criado_por        uuid references auth.users(id) default auth.uid(),
  criado_em         timestamptz not null default now(),
  actualizado_em    timestamptz not null default now()
);

create table public.partes (                         -- lobolo, casamento, copo-d'água…
  id                 uuid primary key default gen_random_uuid(),
  evento_id          uuid not null references public.eventos(id) on delete cascade,
  slug               text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tipo_id            text not null references public.tipos_evento(id),
  modelo_id          uuid references public.modelos(id) on delete set null,
  titulo             text not null,
  data               date,
  local              text,
  tema_id            text references public.temas(id),   -- null = tema do tipo
  momento_actual_id  uuid,                               -- "a acontecer agora"
  ordem              int not null default 0,
  criado_em          timestamptz not null default now(),
  unique (evento_id, slug)
);

create table public.momentos (                       -- o programa de cada parte
  id        uuid primary key default gen_random_uuid(),
  parte_id  uuid not null references public.partes(id) on delete cascade,
  ordem     int  not null,
  hora      time,
  nome      text not null,
  local     text,
  constraint momentos_ordem_unica unique (parte_id, ordem) deferrable initially deferred
);

alter table public.partes
  add constraint partes_momento_actual_fk
  foreign key (momento_actual_id) references public.momentos(id) on delete set null;

create table public.missoes (                        -- missões de foto
  id          uuid primary key default gen_random_uuid(),
  parte_id    uuid not null references public.partes(id) on delete cascade,
  momento_id  uuid references public.momentos(id) on delete set null,
  ordem       int  not null default 0,
  icone       text,
  titulo      text not null
);

create table public.votos (                          -- mural de mensagens
  id          uuid primary key default gen_random_uuid(),
  parte_id    uuid not null references public.partes(id) on delete cascade,
  autor_nome  text check (char_length(autor_nome) <= 80),
  mensagem    text not null check (char_length(mensagem) between 1 and 500),
  estado      text not null default 'pendente' check (estado in ('pendente','publicado','rejeitado')),
  criado_em   timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. ACESSOS (links e QR Codes)
-- ---------------------------------------------------------------------
create table public.acessos (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references public.eventos(id) on delete cascade,
  perfil     text not null check (perfil in ('convidado','fotografo')),
  nome       text not null,                    -- "Mesas da recepção", "Studio Lume"…
  token      text unique not null
             default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  ativo      boolean not null default true,
  expira_em  timestamptz,
  usos       int not null default 0,           -- número de envios feitos com este link
  criado_em  timestamptz not null default now()
);

-- Partes a que cada acesso dá entrada. SEM linhas = todas as partes do evento.
create table public.acesso_partes (
  acesso_id  uuid not null references public.acessos(id) on delete cascade,
  parte_id   uuid not null references public.partes(id) on delete cascade,
  primary key (acesso_id, parte_id)
);


-- ---------------------------------------------------------------------
-- 5. FICHEIROS (fotos e vídeos)
-- ---------------------------------------------------------------------
create table public.ficheiros (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references public.eventos(id) on delete cascade,
  parte_id      uuid not null references public.partes(id) on delete cascade,
  momento_id    uuid references public.momentos(id) on delete set null,
  missao_id     uuid references public.missoes(id) on delete set null,
  acesso_id     uuid references public.acessos(id) on delete set null,  -- por que link chegou
  storage_path  text not null unique,          -- caminho no bucket "ficheiros"
  tipo          text not null check (tipo in ('imagem','video')),
  mime          text,
  tamanho       bigint,
  largura       int,
  altura        int,
  autor_nome    text check (char_length(autor_nome) <= 80),
  origem        text not null check (origem in ('participante','fotografo','organizacao')),
  estado        text not null default 'pendente' check (estado in ('pendente','publicada','rejeitada')),
  criado_em     timestamptz not null default now(),
  moderado_em   timestamptz,
  moderado_por  uuid references auth.users(id)
);

alter table public.eventos
  add constraint eventos_capa_fk
  foreign key (capa_ficheiro_id) references public.ficheiros(id) on delete set null;


-- ---------------------------------------------------------------------
-- 6. ÍNDICES
-- ---------------------------------------------------------------------
create index on public.partes (evento_id);
create index on public.momentos (parte_id);
create index on public.missoes (parte_id);
create index on public.votos (parte_id, estado);
create index on public.acessos (evento_id);
create index on public.ficheiros (parte_id, estado);
create index on public.ficheiros (evento_id, estado);
create index on public.ficheiros (acesso_id);
create index on public.ficheiros (momento_id);


-- ---------------------------------------------------------------------
-- 7. COERÊNCIA (triggers)
-- ---------------------------------------------------------------------
create or replace function public.tg_actualizado_em()
returns trigger language plpgsql as $$
begin new.actualizado_em := now(); return new; end $$;

create trigger eventos_actualizado_em before update on public.eventos
  for each row execute function public.tg_actualizado_em();

-- ficheiros.evento_id vem sempre da parte; momento/missão têm de ser da mesma parte.
create or replace function public.tg_ficheiro_coerente()
returns trigger language plpgsql as $$
begin
  select evento_id into new.evento_id from public.partes where id = new.parte_id;
  if new.momento_id is not null and not exists
     (select 1 from public.momentos where id = new.momento_id and parte_id = new.parte_id) then
    raise exception 'O momento não pertence a esta parte do evento';
  end if;
  if new.missao_id is not null and not exists
     (select 1 from public.missoes where id = new.missao_id and parte_id = new.parte_id) then
    raise exception 'A missão não pertence a esta parte do evento';
  end if;
  if tg_op = 'UPDATE' then
    if new.estado is distinct from old.estado and new.estado <> 'pendente' then
      new.moderado_em := now(); new.moderado_por := auth.uid();
    end if;
  end if;
  return new;
end $$;

create trigger ficheiros_coerente before insert or update on public.ficheiros
  for each row execute function public.tg_ficheiro_coerente();

-- acesso_partes só aceita partes do mesmo evento do acesso.
create or replace function public.tg_acesso_parte_coerente()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.acessos a join public.partes p on p.evento_id = a.evento_id
                 where a.id = new.acesso_id and p.id = new.parte_id) then
    raise exception 'A parte não pertence ao evento deste acesso';
  end if;
  return new;
end $$;

create trigger acesso_partes_coerente before insert or update on public.acesso_partes
  for each row execute function public.tg_acesso_parte_coerente();


-- ---------------------------------------------------------------------
-- 8. FUNÇÕES DE APOIO
-- ---------------------------------------------------------------------

-- Estado de um evento: manual, ou calculado pelas datas das partes.
create or replace function public.estado_evento(p_evento_id uuid)
returns text language sql stable as $$
  select case
    when e.estado <> 'auto' then e.estado
    when min(p.data) is null or current_date < min(p.data) then 'preparacao'
    when current_date > max(p.data) then 'encerrado'
    else 'decorrer' end
  from public.eventos e left join public.partes p on p.evento_id = e.id
  where e.id = p_evento_id
  group by e.id, e.estado;
$$;

-- Catálogo público com estado e contagem de ficheiros publicados.
create view public.v_eventos with (security_invoker = on) as
select e.*,
       public.estado_evento(e.id) as estado_calculado,
       (select count(*) from public.ficheiros f where f.evento_id = e.id and f.estado = 'publicada') as publicados,
       (select min(data) from public.partes p where p.evento_id = e.id) as data_inicio,
       (select max(data) from public.partes p where p.evento_id = e.id) as data_fim
from public.eventos e;

-- Token válido? (activo, não expirado)
create or replace function public.token_valido(p_token text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.acessos
                 where token = p_token and ativo and (expira_em is null or expira_em > now()));
$$;

-- Parte permitida para o acesso? (sem linhas em acesso_partes = todas)
create or replace function public.parte_permitida(p_acesso_id uuid, p_parte_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.acessos a join public.partes p on p.evento_id = a.evento_id
    where a.id = p_acesso_id and p.id = p_parte_id
      and ( not exists (select 1 from public.acesso_partes x where x.acesso_id = a.id)
            or exists (select 1 from public.acesso_partes x where x.acesso_id = a.id and x.parte_id = p.id) ));
$$;

-- O que a página de convidado/fotógrafo precisa ao abrir o link.
create or replace function public.acesso_info(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a public.acessos;
begin
  select * into a from public.acessos
   where token = p_token and ativo and (expira_em is null or expira_em > now());
  if not found then return null; end if;

  return jsonb_build_object(
    'acesso', jsonb_build_object('id', a.id, 'perfil', a.perfil, 'nome', a.nome),
    'evento', (select jsonb_build_object('id', e.id, 'slug', e.slug, 'titulo', e.titulo,
                                         'local', e.local, 'categoria_id', e.categoria_id)
                 from public.eventos e where e.id = a.evento_id),
    'partes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'slug', p.slug, 'titulo', p.titulo, 'data', p.data, 'tipo_id', p.tipo_id,
               'tema_id', coalesce(p.tema_id, t.tema_id), 'momento_actual_id', p.momento_actual_id,
               'momentos', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'hora', m.hora, 'nome', m.nome, 'local', m.local) order by m.ordem)
                                       from public.momentos m where m.parte_id = p.id), '[]'::jsonb),
               'missoes',  coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'icone', q.icone, 'titulo', q.titulo, 'momento_id', q.momento_id) order by q.ordem)
                                       from public.missoes q where q.parte_id = p.id), '[]'::jsonb))
             order by p.data nulls last, p.ordem)
        from public.partes p join public.tipos_evento t on t.id = p.tipo_id
       where p.evento_id = a.evento_id and public.parte_permitida(a.id, p.id)), '[]'::jsonb)
  );
end $$;

-- Regista um envio (depois de os ficheiros estarem no Storage em "<token>/<parte_id>/...").
-- Convidado → pendente; fotógrafo → publicada. Devolve o número de ficheiros registados.
-- p_ficheiros: [{"path":"…","tipo":"imagem","mime":"image/jpeg","tamanho":123,"largura":4000,"altura":3000}]
create or replace function public.registar_envio(
  p_token text, p_parte_id uuid, p_momento_id uuid, p_missao_id uuid,
  p_autor text, p_ficheiros jsonb)
returns int language plpgsql volatile security definer set search_path = public as $$
declare a public.acessos; f jsonb; n int := 0;
begin
  select * into a from public.acessos
   where token = p_token and ativo and (expira_em is null or expira_em > now())
   for update;
  if not found then raise exception 'Link inválido ou desactivado'; end if;
  if not public.parte_permitida(a.id, p_parte_id) then raise exception 'Este link não dá acesso a esta parte do evento'; end if;
  if jsonb_typeof(p_ficheiros) <> 'array' or jsonb_array_length(p_ficheiros) = 0 then raise exception 'Sem ficheiros'; end if;
  if jsonb_array_length(p_ficheiros) > 20 then raise exception 'Máximo de 20 ficheiros por envio'; end if;

  for f in select * from jsonb_array_elements(p_ficheiros) loop
    if (f->>'path') not like p_token || '/' || p_parte_id::text || '/%' then
      raise exception 'Caminho de ficheiro inválido: %', f->>'path';
    end if;
    insert into public.ficheiros (parte_id, momento_id, missao_id, acesso_id, storage_path, tipo, mime,
                                  tamanho, largura, altura, autor_nome, origem, estado)
    values (p_parte_id, p_momento_id, p_missao_id, a.id, f->>'path', coalesce(f->>'tipo','imagem'), f->>'mime',
            (f->>'tamanho')::bigint, (f->>'largura')::int, (f->>'altura')::int,
            nullif(left(trim(coalesce(p_autor, '')), 80), ''),
            case a.perfil when 'fotografo' then 'fotografo' else 'participante' end,
            case a.perfil when 'fotografo' then 'publicada' else 'pendente' end);
    n := n + 1;
  end loop;

  update public.acessos set usos = usos + 1 where id = a.id;
  return n;
end $$;

-- Painel: cria uma parte a partir de um modelo (copia momentos e missões).
create or replace function public.criar_parte_de_modelo(
  p_evento_id uuid, p_modelo_id uuid, p_titulo text, p_data date, p_slug text default null)
returns uuid language plpgsql volatile security invoker set search_path = public as $$
declare m public.modelos; v_parte uuid; v_slug text; i int := 2;
begin
  if not public.e_admin() then raise exception 'Só a organização pode criar partes'; end if;
  select * into m from public.modelos where id = p_modelo_id;
  if not found then raise exception 'Modelo não encontrado'; end if;

  v_slug := coalesce(p_slug, m.tipo_id);
  while exists (select 1 from public.partes where evento_id = p_evento_id and slug = v_slug) loop
    v_slug := coalesce(p_slug, m.tipo_id) || '-' || i; i := i + 1;
  end loop;

  insert into public.partes (evento_id, slug, tipo_id, modelo_id, titulo, data)
  values (p_evento_id, v_slug, m.tipo_id, m.id, coalesce(nullif(trim(p_titulo), ''),
          (select nome from public.tipos_evento where id = m.tipo_id)), p_data)
  returning id into v_parte;

  insert into public.momentos (parte_id, ordem, hora, nome, local)
  select v_parte, mm.ordem, mm.hora, mm.nome, mm.local
    from public.modelo_momentos mm where mm.modelo_id = m.id;

  insert into public.missoes (parte_id, momento_id, ordem, icone, titulo)
  select v_parte, mo.id, mi.ordem, mi.icone, mi.titulo
    from public.modelo_missoes mi
    join public.momentos mo on mo.parte_id = v_parte and mo.ordem = mi.momento_ordem
   where mi.modelo_id = m.id;

  update public.partes set momento_actual_id =
    (select id from public.momentos where parte_id = v_parte order by ordem limit 1)
   where id = v_parte;

  return v_parte;
end $$;


-- ---------------------------------------------------------------------
-- 9. SEGURANÇA (RLS)
-- ---------------------------------------------------------------------
alter table public.categorias      enable row level security;
alter table public.temas           enable row level security;
alter table public.tipos_evento    enable row level security;
alter table public.modelos         enable row level security;
alter table public.modelo_momentos enable row level security;
alter table public.modelo_missoes  enable row level security;
alter table public.administradores enable row level security;
alter table public.eventos         enable row level security;
alter table public.partes          enable row level security;
alter table public.momentos        enable row level security;
alter table public.missoes         enable row level security;
alter table public.votos           enable row level security;
alter table public.acessos         enable row level security;
alter table public.acesso_partes   enable row level security;
alter table public.ficheiros       enable row level security;

-- catálogo: todos lêem, só a organização altera
create policy "catalogo: leitura" on public.categorias      for select using (true);
create policy "catalogo: leitura" on public.temas           for select using (true);
create policy "catalogo: leitura" on public.tipos_evento    for select using (true);
create policy "catalogo: leitura" on public.modelos         for select using (true);
create policy "catalogo: leitura" on public.modelo_momentos for select using (true);
create policy "catalogo: leitura" on public.modelo_missoes  for select using (true);
create policy "catalogo: admin"   on public.categorias      for all using (public.e_admin()) with check (public.e_admin());
create policy "catalogo: admin"   on public.temas           for all using (public.e_admin()) with check (public.e_admin());
create policy "catalogo: admin"   on public.tipos_evento    for all using (public.e_admin()) with check (public.e_admin());
create policy "catalogo: admin"   on public.modelos         for all using (public.e_admin()) with check (public.e_admin());
create policy "catalogo: admin"   on public.modelo_momentos for all using (public.e_admin()) with check (public.e_admin());
create policy "catalogo: admin"   on public.modelo_missoes  for all using (public.e_admin()) with check (public.e_admin());

-- administradores: cada um vê-se a si; só admins gerem a lista
create policy "admins: ver-se"  on public.administradores for select using (user_id = auth.uid() or public.e_admin());
create policy "admins: gerir"   on public.administradores for all using (public.e_admin()) with check (public.e_admin());

-- eventos e conteúdo público
create policy "eventos: leitura publica" on public.eventos for select using (publico or public.e_admin());
create policy "eventos: admin"           on public.eventos for all using (public.e_admin()) with check (public.e_admin());

create policy "partes: leitura publica" on public.partes for select
  using (public.e_admin() or exists (select 1 from public.eventos e where e.id = evento_id and e.publico));
create policy "partes: admin" on public.partes for all using (public.e_admin()) with check (public.e_admin());

create policy "momentos: leitura publica" on public.momentos for select
  using (public.e_admin() or exists (select 1 from public.partes p join public.eventos e on e.id = p.evento_id
                                     where p.id = parte_id and e.publico));
create policy "momentos: admin" on public.momentos for all using (public.e_admin()) with check (public.e_admin());

create policy "missoes: leitura publica" on public.missoes for select
  using (public.e_admin() or exists (select 1 from public.partes p join public.eventos e on e.id = p.evento_id
                                     where p.id = parte_id and e.publico));
create policy "missoes: admin" on public.missoes for all using (public.e_admin()) with check (public.e_admin());

-- mural: público lê o que foi aprovado; qualquer pessoa escreve (fica pendente)
create policy "votos: leitura publica" on public.votos for select
  using (public.e_admin() or (estado = 'publicado' and exists
         (select 1 from public.partes p join public.eventos e on e.id = p.evento_id where p.id = parte_id and e.publico)));
create policy "votos: escrever pendente" on public.votos for insert
  with check (estado = 'pendente' and exists
         (select 1 from public.partes p join public.eventos e on e.id = p.evento_id where p.id = parte_id and e.publico));
create policy "votos: admin" on public.votos for all using (public.e_admin()) with check (public.e_admin());

-- acessos: só a organização (convidados usam acesso_info/registar_envio)
create policy "acessos: admin"       on public.acessos       for all using (public.e_admin()) with check (public.e_admin());
create policy "acesso_partes: admin" on public.acesso_partes for all using (public.e_admin()) with check (public.e_admin());

-- ficheiros: público vê só os publicados de eventos públicos
create policy "ficheiros: leitura publica" on public.ficheiros for select
  using (public.e_admin() or (estado = 'publicada' and exists
         (select 1 from public.eventos e where e.id = evento_id and e.publico)));
create policy "ficheiros: admin" on public.ficheiros for all using (public.e_admin()) with check (public.e_admin());

-- funções: as de token ficam abertas; as internas não
revoke execute on function public.registar_envio(text, uuid, uuid, uuid, text, jsonb) from public;
grant  execute on function public.registar_envio(text, uuid, uuid, uuid, text, jsonb) to anon, authenticated;
grant  execute on function public.acesso_info(text) to anon, authenticated;
grant  execute on function public.token_valido(text) to anon, authenticated;
revoke execute on function public.criar_parte_de_modelo(uuid, uuid, text, date, text) from public, anon;
grant  execute on function public.criar_parte_de_modelo(uuid, uuid, text, date, text) to authenticated;


-- ---------------------------------------------------------------------
-- 10. STORAGE (bucket privado "ficheiros")
-- Caminho: <token>/<parte_id>/<nome-aleatorio>.<ext>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ficheiros', 'ficheiros', false, 104857600, array['image/*','video/*'])
on conflict (id) do nothing;

-- carregar: só com token válido na primeira pasta do caminho
create policy "ficheiros: carregar com token" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'ficheiros' and public.token_valido((storage.foldername(name))[1]));

-- ler (URLs assinados): organização vê tudo; público só o que está publicado
create policy "ficheiros: ler publicados" on storage.objects for select to anon, authenticated
  using (bucket_id = 'ficheiros' and (public.e_admin() or exists (
         select 1 from public.ficheiros f join public.eventos e on e.id = f.evento_id
          where f.storage_path = name and f.estado = 'publicada' and e.publico)));

-- organização altera e apaga
create policy "ficheiros: admin altera" on storage.objects for update to authenticated
  using (bucket_id = 'ficheiros' and public.e_admin());
create policy "ficheiros: admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'ficheiros' and public.e_admin());
