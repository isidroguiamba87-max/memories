-- Memória — ficheiro único para colar no SQL Editor do Supabase (esquema + catálogo + permissões).
-- Gerado a partir de supabase/migrations/. Correr uma única vez num projecto novo.

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

-- =====================================================================
-- Memória — catálogo inicial: categorias, temas, tipos de evento e modelos
-- Gerado a partir de assets/js/dados.js. Pode ser corrido mais do que uma vez.
-- =====================================================================

insert into public.categorias (id, nome, icone, descricao, ordem) values
  ('uniao', 'Casamentos & união', '💍', 'Casamento, lobolo, noivado e bodas', 0),
  ('familia', 'Família & celebrações', '🎈', 'Batizados, aniversários, chás e graduações', 1),
  ('corporativo', 'Corporativo', '🏢', 'Conferências, lançamentos e galas', 2),
  ('homenagem', 'Homenagens', '🕊️', 'Cerimónias de homenagem e memória', 3)
on conflict (id) do update set nome = excluded.nome, icone = excluded.icone, descricao = excluded.descricao, ordem = excluded.ordem;

insert into public.temas (id, nome, cor_destaque, cor_secundaria, cor_fundo, cor_areia, cor_linha) values
  ('marfim', 'Marfim e dourado', '#A8824C', '#9E4F36', '#FAF7F2', '#EDE4D7', '#DCD0BE'),
  ('capulana', 'Capulana (terra e ocre)', '#B5541C', '#7A2E1C', '#FBF4EA', '#F2DFC6', '#E3C7A2'),
  ('oceano', 'Oceano (praia)', '#2F7F86', '#C46A4A', '#F5F8F7', '#DFECEA', '#C6DAD6'),
  ('prata', 'Prata', '#7E848E', '#4F5664', '#F8F8F6', '#EAEAE6', '#D6D6D0'),
  ('ternura', 'Ternura (tons suaves)', '#7F98C2', '#C27F86', '#FAF9F7', '#ECEFF5', '#D7DCE6'),
  ('festa', 'Festa (vibrante)', '#B83F7A', '#D98E04', '#FCF8F5', '#F6E6EC', '#EBCFDB'),
  ('corporativo', 'Corporativo (azul)', '#2D5BB8', '#1B2B4A', '#F6F7FA', '#E6EBF3', '#D0D8E6'),
  ('memoria', 'Memória (sóbrio)', '#6B7D6A', '#4A4A46', '#F6F5F1', '#E8E7E0', '#D4D2C8')
on conflict (id) do update set nome = excluded.nome, cor_destaque = excluded.cor_destaque, cor_secundaria = excluded.cor_secundaria,
  cor_fundo = excluded.cor_fundo, cor_areia = excluded.cor_areia, cor_linha = excluded.cor_linha;

insert into public.tipos_evento (id, categoria_id, nome, icone, descricao, tema_id, ordem) values
  ('casamento', 'uniao', 'Casamento', '💍', 'Cerimónia civil e/ou religiosa seguida de copo-d''água.', 'marfim', 0),
  ('lobolo', 'uniao', 'Lobolo', '🧣', 'Casamento tradicional do sul de Moçambique: pedido, kuphahla, negociação da carta de lobolo e entrega dos presentes.', 'capulana', 1),
  ('noivado', 'uniao', 'Noivado', '💌', 'Pedido de casamento e jantar com família e amigos.', 'marfim', 2),
  ('bodas', 'uniao', 'Bodas', '🥂', 'Aniversário de casamento: prata, ouro e outras bodas.', 'prata', 3),
  ('batizado', 'familia', 'Batizado', '🕯️', 'Cerimónia religiosa e almoço com padrinhos e família.', 'ternura', 4),
  ('aniversario', 'familia', 'Aniversário', '🎂', 'Festas de aniversário de adultos e crianças.', 'festa', 5),
  ('chabebe', 'familia', 'Chá de bebé', '🍼', 'Encontro antes do nascimento, com jogos e presentes.', 'ternura', 6),
  ('graduacao', 'familia', 'Graduação', '🎓', 'Cerimónia de graduação e celebração com a família.', 'festa', 7),
  ('conferencia', 'corporativo', 'Conferência', '🎤', 'Conferências, seminários e workshops.', 'corporativo', 8),
  ('lancamento', 'corporativo', 'Lançamento', '🚀', 'Lançamentos de produto, marca ou espaço.', 'corporativo', 9),
  ('gala', 'corporativo', 'Gala', '🏆', 'Galas de prémios e jantares de empresa.', 'corporativo', 10),
  ('homenagem', 'homenagem', 'Homenagem', '🕊️', 'Cerimónias de homenagem, memória e acção de graças.', 'memoria', 11)
on conflict (id) do update set categoria_id = excluded.categoria_id, nome = excluded.nome, icone = excluded.icone,
  descricao = excluded.descricao, tema_id = excluded.tema_id, ordem = excluded.ordem;

insert into public.modelos (tipo_id, codigo, nome, ordem) values
  ('casamento', 'classico', 'Clássico — civil, igreja e copo-d''água', 0),
  ('casamento', 'civil', 'Civil e copo-d''água', 1),
  ('casamento', 'praia', 'Casamento na praia (fim de tarde)', 2),
  ('lobolo', 'completo', 'Lobolo tradicional completo', 0),
  ('lobolo', 'pedido', 'Pedido — hikombela-mati', 1),
  ('lobolo', 'simbolico', 'Lobolo simbólico com almoço', 2),
  ('noivado', 'jantar', 'Jantar de noivado', 0),
  ('bodas', 'bodas', 'Bodas de prata ou ouro', 0),
  ('batizado', 'igreja', 'Batizado na igreja com almoço', 0),
  ('aniversario', 'adulto', 'Festa de aniversário', 0),
  ('aniversario', 'infantil', 'Aniversário infantil', 1),
  ('chabebe', 'cha', 'Chá de bebé', 0),
  ('graduacao', 'graduacao', 'Graduação', 0),
  ('conferencia', 'dia', 'Conferência de um dia', 0),
  ('lancamento', 'produto', 'Lançamento de produto', 0),
  ('gala', 'premios', 'Gala de prémios', 0),
  ('homenagem', 'cerimonia', 'Cerimónia de homenagem', 0)
on conflict (tipo_id, codigo) do update set nome = excluded.nome, ordem = excluded.ordem;

-- momentos e missões dos modelos: substitui os existentes
delete from public.modelo_momentos;
delete from public.modelo_missoes;

insert into public.modelo_momentos (modelo_id, ordem, hora, nome, local)
select m.id, v.ordem, v.hora::time, v.nome, v.local from (values
  ('casamento', 'classico', 1, '08:00', 'Preparativos', 'Casa da noiva'),
  ('casamento', 'classico', 2, '10:30', 'Cerimónia Civil', 'Conservatória'),
  ('casamento', 'classico', 3, '12:00', 'Cerimónia Religiosa', 'Igreja'),
  ('casamento', 'classico', 4, '14:30', 'Sessão de Fotos', 'Local da sessão'),
  ('casamento', 'classico', 5, '16:30', 'Copo-d''água', 'Salão de festas'),
  ('casamento', 'classico', 6, '18:30', 'Discursos & Bolo', 'Salão de festas'),
  ('casamento', 'classico', 7, '20:00', 'Primeira Dança', 'Salão de festas'),
  ('casamento', 'classico', 8, '21:30', 'Festa', 'Salão de festas'),
  ('casamento', 'civil', 1, '08:30', 'Preparativos', 'Casa da noiva'),
  ('casamento', 'civil', 2, '10:00', 'Cerimónia Civil', 'Conservatória'),
  ('casamento', 'civil', 3, '11:30', 'Fotos de família', 'Jardim da conservatória'),
  ('casamento', 'civil', 4, '13:00', 'Copo-d''água', 'Salão de festas'),
  ('casamento', 'civil', 5, '16:00', 'Discursos & Bolo', 'Salão de festas'),
  ('casamento', 'civil', 6, '18:00', 'Festa', 'Salão de festas'),
  ('casamento', 'praia', 1, '12:00', 'Preparativos', 'Hotel / casa'),
  ('casamento', 'praia', 2, '15:30', 'Chegada dos convidados', 'Praia'),
  ('casamento', 'praia', 3, '16:00', 'Cerimónia na praia', 'Praia'),
  ('casamento', 'praia', 4, '17:15', 'Pôr-do-sol com os noivos', 'Praia'),
  ('casamento', 'praia', 5, '18:30', 'Jantar', 'Restaurante / lodge'),
  ('casamento', 'praia', 6, '20:00', 'Primeira Dança', 'Restaurante / lodge'),
  ('casamento', 'praia', 7, '21:00', 'Festa', 'Restaurante / lodge'),
  ('lobolo', 'completo', 1, '06:30', 'Kuphahla — evocação dos antepassados', 'Casa da família da noiva'),
  ('lobolo', 'completo', 2, '09:00', 'Chegada da comitiva do noivo', 'Casa da família da noiva'),
  ('lobolo', 'completo', 3, '10:00', 'Apresentação das famílias', 'Casa da família da noiva'),
  ('lobolo', 'completo', 4, '11:00', 'Negociação e carta de lobolo', 'Casa da família da noiva'),
  ('lobolo', 'completo', 5, '13:00', 'Entrega dos presentes e do lobolo', 'Casa da família da noiva'),
  ('lobolo', 'completo', 6, '14:00', 'A noiva avalia os presentes e aceita', 'Casa da família da noiva'),
  ('lobolo', 'completo', 7, '15:00', 'Refeição partilhada', 'Casa da família da noiva'),
  ('lobolo', 'completo', 8, '17:00', 'Festa e dança', 'Casa da família da noiva'),
  ('lobolo', 'pedido', 1, '10:00', 'Chegada da família do noivo', 'Casa da família da noiva'),
  ('lobolo', 'pedido', 2, '10:30', 'Pedido (hikombela-mati)', 'Casa da família da noiva'),
  ('lobolo', 'pedido', 3, '11:30', 'Entrega da carta de lobolo', 'Casa da família da noiva'),
  ('lobolo', 'pedido', 4, '12:30', 'Almoço das famílias', 'Casa da família da noiva'),
  ('lobolo', 'simbolico', 1, '10:00', 'Chegada das famílias', 'Casa da família da noiva'),
  ('lobolo', 'simbolico', 2, '11:00', 'Apresentação e conversa', 'Casa da família da noiva'),
  ('lobolo', 'simbolico', 3, '12:00', 'Entrega simbólica', 'Casa da família da noiva'),
  ('lobolo', 'simbolico', 4, '13:00', 'Almoço', 'Casa da família da noiva'),
  ('lobolo', 'simbolico', 5, '15:00', 'Convívio e dança', 'Casa da família da noiva'),
  ('noivado', 'jantar', 1, '18:30', 'Recepção dos convidados', 'Restaurante'),
  ('noivado', 'jantar', 2, '19:15', 'O pedido e o anel', 'Restaurante'),
  ('noivado', 'jantar', 3, '19:30', 'Brinde', 'Restaurante'),
  ('noivado', 'jantar', 4, '20:00', 'Jantar', 'Restaurante'),
  ('noivado', 'jantar', 5, '21:30', 'Festa', 'Restaurante'),
  ('bodas', 'bodas', 1, '10:00', 'Missa de acção de graças', 'Igreja'),
  ('bodas', 'bodas', 2, '11:30', 'Renovação de votos', 'Igreja'),
  ('bodas', 'bodas', 3, '12:30', 'Fotos de família', 'Jardim'),
  ('bodas', 'bodas', 4, '13:30', 'Almoço', 'Salão'),
  ('bodas', 'bodas', 5, '16:00', 'Homenagem dos filhos e netos', 'Salão'),
  ('bodas', 'bodas', 6, '17:30', 'Festa', 'Salão'),
  ('batizado', 'igreja', 1, '09:00', 'Preparação do bebé', 'Casa da família'),
  ('batizado', 'igreja', 2, '10:00', 'Cerimónia do batismo', 'Igreja'),
  ('batizado', 'igreja', 3, '11:30', 'Fotos com os padrinhos', 'Igreja'),
  ('batizado', 'igreja', 4, '13:00', 'Almoço', 'Casa / salão'),
  ('batizado', 'igreja', 5, '15:00', 'Bolo', 'Casa / salão'),
  ('aniversario', 'adulto', 1, '18:00', 'Chegada', 'Local da festa'),
  ('aniversario', 'adulto', 2, '19:00', 'Jantar', 'Local da festa'),
  ('aniversario', 'adulto', 3, '20:30', 'Parabéns e bolo', 'Local da festa'),
  ('aniversario', 'adulto', 4, '21:00', 'Festa', 'Local da festa'),
  ('aniversario', 'infantil', 1, '14:00', 'Chegada', 'Local da festa'),
  ('aniversario', 'infantil', 2, '14:30', 'Brincadeiras e animação', 'Local da festa'),
  ('aniversario', 'infantil', 3, '16:00', 'Lanche', 'Local da festa'),
  ('aniversario', 'infantil', 4, '16:30', 'Parabéns e bolo', 'Local da festa'),
  ('aniversario', 'infantil', 5, '17:30', 'Lembranças', 'Local da festa'),
  ('chabebe', 'cha', 1, '15:00', 'Recepção', 'Casa'),
  ('chabebe', 'cha', 2, '15:30', 'Jogos', 'Casa'),
  ('chabebe', 'cha', 3, '16:30', 'Revelação', 'Casa'),
  ('chabebe', 'cha', 4, '17:00', 'Lanche', 'Casa'),
  ('chabebe', 'cha', 5, '17:45', 'Presentes', 'Casa'),
  ('graduacao', 'graduacao', 1, '09:00', 'Cerimónia de graduação', 'Universidade'),
  ('graduacao', 'graduacao', 2, '11:30', 'Fotos de beca', 'Campus'),
  ('graduacao', 'graduacao', 3, '13:00', 'Almoço de família', 'Restaurante'),
  ('graduacao', 'graduacao', 4, '19:00', 'Festa', 'Local da festa'),
  ('conferencia', 'dia', 1, '08:00', 'Credenciação', 'Centro de conferências'),
  ('conferencia', 'dia', 2, '09:00', 'Abertura', 'Centro de conferências'),
  ('conferencia', 'dia', 3, '10:00', 'Painéis da manhã', 'Centro de conferências'),
  ('conferencia', 'dia', 4, '12:30', 'Almoço e networking', 'Centro de conferências'),
  ('conferencia', 'dia', 5, '14:00', 'Painéis da tarde', 'Centro de conferências'),
  ('conferencia', 'dia', 6, '17:00', 'Encerramento', 'Centro de conferências'),
  ('conferencia', 'dia', 7, '18:00', 'Cocktail', 'Centro de conferências'),
  ('lancamento', 'produto', 1, '17:30', 'Chegada dos convidados', 'Espaço do evento'),
  ('lancamento', 'produto', 2, '18:00', 'Apresentação', 'Espaço do evento'),
  ('lancamento', 'produto', 3, '18:45', 'Revelação do produto', 'Espaço do evento'),
  ('lancamento', 'produto', 4, '19:15', 'Demonstrações', 'Espaço do evento'),
  ('lancamento', 'produto', 5, '20:00', 'Cocktail', 'Espaço do evento'),
  ('gala', 'premios', 1, '19:00', 'Passadeira', 'Hotel'),
  ('gala', 'premios', 2, '20:00', 'Jantar', 'Hotel'),
  ('gala', 'premios', 3, '21:00', 'Entrega de prémios', 'Hotel'),
  ('gala', 'premios', 4, '22:00', 'Actuação', 'Hotel'),
  ('gala', 'premios', 5, '22:30', 'Festa', 'Hotel'),
  ('homenagem', 'cerimonia', 1, '10:00', 'Recepção', 'Local da cerimónia'),
  ('homenagem', 'cerimonia', 2, '10:30', 'Cerimónia', 'Local da cerimónia'),
  ('homenagem', 'cerimonia', 3, '11:30', 'Testemunhos', 'Local da cerimónia'),
  ('homenagem', 'cerimonia', 4, '12:30', 'Momento de recordação', 'Local da cerimónia'),
  ('homenagem', 'cerimonia', 5, '13:00', 'Convívio', 'Local da cerimónia')
) as v(tipo, codigo, ordem, hora, nome, local)
join public.modelos m on m.tipo_id = v.tipo and m.codigo = v.codigo;

insert into public.modelo_missoes (modelo_id, ordem, icone, titulo, momento_ordem)
select m.id, v.ordem, v.icone, v.titulo, v.momento_ordem from (values
  ('casamento', 'classico', 1, '💃', 'O teu melhor passo de dança', 8),
  ('casamento', 'classico', 2, '🪑', 'A tua mesa completa', 5),
  ('casamento', 'classico', 3, '👟', 'Os sapatos mais bonitos da festa', 5),
  ('casamento', 'classico', 4, '😂', 'Alguém a rir sem saber que é foto', 6),
  ('casamento', 'classico', 5, '🤍', 'Os noivos sem olharem', 3),
  ('casamento', 'civil', 1, '👨‍👩‍👧', 'As duas famílias juntas', 3),
  ('casamento', 'civil', 2, '🥂', 'O brinde da tua mesa', 4),
  ('casamento', 'civil', 3, '🎂', 'O bolo de outro ângulo', 5),
  ('casamento', 'civil', 4, '💃', 'O teu melhor passo de dança', 6),
  ('casamento', 'praia', 1, '🌅', 'O pôr-do-sol atrás dos noivos', 4),
  ('casamento', 'praia', 2, '🐚', 'Pés na areia', 2),
  ('casamento', 'praia', 3, '💃', 'O teu melhor passo de dança', 7),
  ('lobolo', 'completo', 1, '👨‍👩‍👧‍👦', 'As duas famílias na mesma foto', 3),
  ('lobolo', 'completo', 2, '🎁', 'Os presentes antes da entrega', 5),
  ('lobolo', 'completo', 3, '🧣', 'As capulanas mais bonitas', 7),
  ('lobolo', 'completo', 4, '👵', 'Os mais velhos a contar histórias', 7),
  ('lobolo', 'completo', 5, '🥁', 'A dança das famílias', 8),
  ('lobolo', 'pedido', 1, '🤝', 'O primeiro cumprimento entre famílias', 2),
  ('lobolo', 'pedido', 2, '🍲', 'A mesa do almoço', 4),
  ('lobolo', 'simbolico', 1, '🧣', 'As capulanas mais bonitas', 5),
  ('lobolo', 'simbolico', 2, '👨‍👩‍👧‍👦', 'As duas famílias na mesma foto', 2),
  ('noivado', 'jantar', 1, '💍', 'O anel de perto', 2),
  ('noivado', 'jantar', 2, '🥂', 'O teu brinde', 3),
  ('bodas', 'bodas', 1, '📸', 'Três gerações na mesma foto', 3),
  ('bodas', 'bodas', 2, '💌', 'A homenagem dos filhos', 5),
  ('batizado', 'igreja', 1, '👶', 'O bebé com os padrinhos', 3),
  ('batizado', 'igreja', 2, '🕯️', 'A vela do batismo', 2),
  ('aniversario', 'adulto', 1, '🎂', 'O momento de apagar as velas', 3),
  ('aniversario', 'adulto', 2, '🎈', 'A cara mais divertida', 4),
  ('aniversario', 'infantil', 1, '🎈', 'A cara mais divertida', 2),
  ('aniversario', 'infantil', 2, '🎂', 'O momento de apagar as velas', 4),
  ('chabebe', 'cha', 1, '🎁', 'O presente mais bonito', 5),
  ('graduacao', 'graduacao', 1, '🎓', 'O chapéu no ar', 2),
  ('conferencia', 'dia', 1, '🤝', 'Uma nova ligação profissional', 4),
  ('gala', 'premios', 1, '📸', 'A tua mesa na passadeira', 1),
  ('homenagem', 'cerimonia', 1, '🕊️', 'Uma fotografia antiga que guardas', 4)
) as v(tipo, codigo, ordem, icone, titulo, momento_ordem)
join public.modelos m on m.tipo_id = v.tipo and m.codigo = v.codigo;

-- =====================================================================
-- Memória — permissões da API (GRANT)
-- Os projectos novos do Supabase não expõem tabelas automaticamente.
-- Os GRANT dizem QUE tabelas a API pode tocar; as políticas RLS (já criadas)
-- continuam a decidir QUE LINHAS cada pessoa vê ou altera.
-- =====================================================================

grant usage on schema public to anon, authenticated;

-- público (sem login): leitura do catálogo e do conteúdo publicado
grant select on public.categorias, public.temas, public.tipos_evento,
                public.modelos, public.modelo_momentos, public.modelo_missoes,
                public.eventos, public.partes, public.momentos, public.missoes,
                public.votos, public.ficheiros, public.v_eventos
  to anon;
grant insert on public.votos to anon;                 -- mural (fica pendente)

-- utilizadores com login: a RLS só deixa passar quem está em administradores
grant select, insert, update, delete on all tables in schema public to authenticated;

-- funções usadas pelas vistas e pelas páginas de convidado/fotógrafo
grant execute on function public.e_admin()                     to anon, authenticated;
grant execute on function public.estado_evento(uuid)           to anon, authenticated;
grant execute on function public.token_valido(text)            to anon, authenticated;
grant execute on function public.parte_permitida(uuid, uuid)   to anon, authenticated;
grant execute on function public.acesso_info(text)             to anon, authenticated;
grant execute on function public.registar_envio(text, uuid, uuid, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.criar_parte_de_modelo(uuid, uuid, text, date, text) to authenticated;

-- bucket de ficheiros (repetido por segurança; não duplica)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ficheiros', 'ficheiros', false, 104857600, array['image/*','video/*'])
on conflict (id) do nothing;

-- verificação: deve mostrar 4 · 8 · 12 · 17 · 94 · 36 · 1
select (select count(*) from public.categorias)      as categorias,
       (select count(*) from public.temas)           as temas,
       (select count(*) from public.tipos_evento)    as tipos,
       (select count(*) from public.modelos)         as modelos,
       (select count(*) from public.modelo_momentos) as momentos_modelo,
       (select count(*) from public.modelo_missoes)  as missoes_modelo,
       (select count(*) from storage.buckets where id = 'ficheiros') as bucket;

-- =====================================================================
-- Memória — funções do painel (operações com vários passos, atómicas)
-- Todas exigem que quem chama esteja em public.administradores.
-- =====================================================================

-- Cria o evento, as partes (a partir dos modelos) e dois acessos por defeito.
-- p_partes: [{"modelo_id":"…","titulo":"Lobolo","data":"2026-11-08"}, …]
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
  insert into public.eventos (slug, titulo, categoria_id, local)
  values (v_slug, trim(p_titulo), p_categoria, nullif(trim(coalesce(p_local, '')), ''))
  returning id into v_ev;
  for p in select * from jsonb_array_elements(p_partes) loop
    perform public.criar_parte_de_modelo(v_ev, (p->>'modelo_id')::uuid, p->>'titulo', nullif(p->>'data', '')::date);
  end loop;
  insert into public.acessos (evento_id, perfil, nome)
  values (v_ev, 'convidado', 'QR geral dos convidados'), (v_ev, 'fotografo', 'Fotógrafo principal');
  return v_ev;
end $$;

-- Substitui o programa e as missões de uma parte pelos de outro modelo do mesmo tipo.
-- As fotos passam para o momento com a mesma posição (ou o último, se o novo for mais curto).
create or replace function public.aplicar_modelo(p_parte_id uuid, p_modelo_id uuid)
returns void language plpgsql volatile security invoker set search_path = public as $$
declare velhos uuid[]; novos uuid[]; n int;
begin
  if not public.e_admin() then raise exception 'Só a organização pode alterar o programa'; end if;
  if not exists (select 1 from public.modelos m join public.partes p on p.tipo_id = m.tipo_id
                 where m.id = p_modelo_id and p.id = p_parte_id) then
    raise exception 'O modelo não é do mesmo tipo desta parte';
  end if;

  select array_agg(id order by ordem) into velhos from public.momentos where parte_id = p_parte_id;
  update public.momentos set ordem = ordem + 10000 where parte_id = p_parte_id;

  insert into public.momentos (parte_id, ordem, hora, nome, local)
  select p_parte_id, ordem, hora, nome, local from public.modelo_momentos where modelo_id = p_modelo_id;
  select array_agg(id order by ordem) into novos from public.momentos where parte_id = p_parte_id and ordem < 10000;
  n := coalesce(array_length(novos, 1), 0);
  if n = 0 then raise exception 'O modelo não tem momentos'; end if;

  update public.ficheiros f
     set momento_id = novos[least(coalesce(array_position(velhos, f.momento_id), 1), n)], missao_id = null
   where f.parte_id = p_parte_id;

  delete from public.missoes where parte_id = p_parte_id;
  insert into public.missoes (parte_id, momento_id, ordem, icone, titulo)
  select p_parte_id, novos[least(mi.momento_ordem, n)], mi.ordem, mi.icone, mi.titulo
    from public.modelo_missoes mi where mi.modelo_id = p_modelo_id;

  update public.partes set modelo_id = p_modelo_id, momento_actual_id = novos[1] where id = p_parte_id;
  delete from public.momentos where parte_id = p_parte_id and ordem >= 10000;
end $$;

-- Troca um momento com o anterior (p_delta < 0) ou o seguinte (p_delta > 0).
create or replace function public.mover_momento(p_momento_id uuid, p_delta int)
returns void language plpgsql volatile security invoker set search_path = public as $$
declare a public.momentos; b public.momentos;
begin
  if not public.e_admin() then raise exception 'Só a organização pode alterar o programa'; end if;
  select * into a from public.momentos where id = p_momento_id;
  if not found then raise exception 'Momento não encontrado'; end if;
  if p_delta < 0 then
    select * into b from public.momentos where parte_id = a.parte_id and ordem < a.ordem order by ordem desc limit 1;
  else
    select * into b from public.momentos where parte_id = a.parte_id and ordem > a.ordem order by ordem limit 1;
  end if;
  if b.id is null then return; end if;
  update public.momentos set ordem = b.ordem where id = a.id;
  update public.momentos set ordem = a.ordem where id = b.id;
end $$;

-- Remove um momento; fotos, missões e "a acontecer agora" passam para o primeiro momento restante.
create or replace function public.remover_momento(p_momento_id uuid)
returns void language plpgsql volatile security invoker set search_path = public as $$
declare a public.momentos; destino uuid;
begin
  if not public.e_admin() then raise exception 'Só a organização pode alterar o programa'; end if;
  select * into a from public.momentos where id = p_momento_id;
  if not found then raise exception 'Momento não encontrado'; end if;
  select id into destino from public.momentos where parte_id = a.parte_id and id <> a.id order by ordem limit 1;
  if destino is null then raise exception 'Cada parte precisa de pelo menos um momento'; end if;
  update public.ficheiros set momento_id = destino where momento_id = a.id;
  update public.missoes   set momento_id = destino where momento_id = a.id;
  update public.partes    set momento_actual_id = destino where momento_actual_id = a.id;
  delete from public.momentos where id = a.id;
end $$;

revoke execute on function public.criar_evento(text, text, text, text, jsonb) from public, anon;
revoke execute on function public.aplicar_modelo(uuid, uuid)                  from public, anon;
revoke execute on function public.mover_momento(uuid, int)                    from public, anon;
revoke execute on function public.remover_momento(uuid)                       from public, anon;
grant  execute on function public.criar_evento(text, text, text, text, jsonb) to authenticated;
grant  execute on function public.aplicar_modelo(uuid, uuid)                  to authenticated;
grant  execute on function public.mover_momento(uuid, int)                    to authenticated;
grant  execute on function public.remover_momento(uuid)                       to authenticated;

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

-- =====================================================================
-- Memória — uma capa por parte do evento (lobolo, casamento…)
-- A lista de eventos mostra a capa da parte de hoje ou da mais próxima;
-- depois do evento acabar, fica a capa da última parte.
-- Pode ser corrido mais do que uma vez.
-- =====================================================================
alter table public.partes add column if not exists capa_path text;

-- Storage: o público pode ler capas de eventos e de partes de eventos publicados
drop policy if exists "ficheiros: ler publicados" on storage.objects;
create policy "ficheiros: ler publicados" on storage.objects for select to anon, authenticated
  using (bucket_id = 'ficheiros' and (
         public.e_admin()
      or exists (select 1 from public.ficheiros f join public.eventos e on e.id = f.evento_id
                  where f.storage_path = name and f.estado = 'publicada' and e.publico and e.galeria_publica)
      or exists (select 1 from public.videos v join public.eventos e on e.id = v.evento_id
                  where v.storage_path = name and e.publico and e.mostrar_videos)
      or exists (select 1 from public.eventos e where e.capa_path = name and e.publico)
      or exists (select 1 from public.partes p join public.eventos e on e.id = p.evento_id
                  where p.capa_path = name and e.publico)));



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

-- =====================================================================
-- Memória — limitação de pedidos (anti-abuso) e campo-armadilha
--   limites            : contadores por acção + IP (o IP fica só como hash md5) e janela de tempo
--   dentro_do_limite() : conta um pedido e diz se ainda está dentro do limite
--   pedidos            : 5 por hora por IP, 200 por hora no total; campo-armadilha site_web tem de vir vazio
--   ficheiros          : 300 por hora por IP (convidados) / 3000 (fotógrafos)
--   visitas            : acima de 60 por 10 minutos por IP deixam de contar (sem erro)
-- Os administradores não têm limites. Pode ser corrido mais do que uma vez.
-- =====================================================================

create table if not exists public.limites (
  chave   text        not null,
  janela  timestamptz not null,
  n       int         not null default 1,
  primary key (chave, janela)
);
alter table public.limites enable row level security;   -- sem políticas: ninguém lê nem escreve directamente
revoke all on public.limites from anon, authenticated;

-- IP do cliente, tal como o PostgREST o recebe (primeiro valor de X-Forwarded-For)
create or replace function public.ip_cliente()
returns text language sql stable set search_path = public as $$
  select coalesce(nullif(trim(split_part(
           coalesce(nullif(current_setting('request.headers', true), '')::json->>'x-forwarded-for', ''), ',', 1)), ''),
         'sem-ip');
$$;

create or replace function public.dentro_do_limite(p_acao text, p_max int, p_minutos int, p_por_ip boolean default true)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare
  k text := p_acao || case when p_por_ip then ':' || md5(public.ip_cliente()) else '' end;
  j timestamptz := date_bin(make_interval(mins => p_minutos), now(), timestamptz '2000-01-01');
  v int;
begin
  insert into public.limites as l (chave, janela) values (k, j)
  on conflict (chave, janela) do update set n = l.n + 1
  returning n into v;
  if random() < 0.02 then delete from public.limites where janela < now() - interval '1 day'; end if;
  return v <= p_max;
end $$;

revoke execute on function public.dentro_do_limite(text, int, int, boolean) from public, anon, authenticated;
revoke execute on function public.ip_cliente() from public, anon, authenticated;

-- ---------- pedidos da página inicial ----------
alter table public.pedidos add column if not exists site_web text;   -- campo-armadilha (invisível para pessoas)
do $$ begin
  alter table public.pedidos add constraint pedidos_armadilha check (site_web is null or site_web = '');
exception when duplicate_object then null; end $$;

create or replace function public.pedidos_limitar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.e_admin() then return new; end if;
  if not public.dentro_do_limite('pedido', 5, 60) or not public.dentro_do_limite('pedido-todos', 200, 60, false) then
    raise exception 'Demasiados pedidos seguidos. Tente de novo dentro de uma hora.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists pedidos_limitar on public.pedidos;
create trigger pedidos_limitar before insert on public.pedidos
  for each row execute function public.pedidos_limitar();

-- ---------- ficheiros enviados por convidados e fotógrafos ----------
create or replace function public.ficheiros_limitar()
returns trigger language plpgsql security definer set search_path = public as $$
declare perfil_ text;
begin
  if new.acesso_id is null or public.e_admin() then return new; end if;
  select perfil into perfil_ from public.acessos where id = new.acesso_id;
  if not public.dentro_do_limite('envio-' || coalesce(perfil_, 'x'), case when perfil_ = 'fotografo' then 3000 else 300 end, 60) then
    raise exception 'Muitos ficheiros enviados na última hora. Tente de novo mais tarde.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists ficheiros_limitar on public.ficheiros;
create trigger ficheiros_limitar before insert on public.ficheiros
  for each row execute function public.ficheiros_limitar();

-- ---------- visitas (estatística: acima do limite não conta, sem erro) ----------
create or replace function public.registar_visita(p_evento_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.dentro_do_limite('visita', 60, 10) then return; end if;
  insert into public.visitas (evento_id, dia, n)
  select id, current_date, 1 from public.eventos where id = p_evento_id and publico
  on conflict (evento_id, dia) do update set n = public.visitas.n + 1;
end $$;
grant execute on function public.registar_visita(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
