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
