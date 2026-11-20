-- =====================================================================
-- Memória — slideshow com várias músicas
--   eventos.slideshow.musicas : lista de faixas tocadas pela ordem definida no painel
--     [ { "tipo": "youtube", "url": "https://youtu.be/…" },
--       { "tipo": "ficheiro", "path": "admin/<evento>/musica/….mp3", "nome": "…" }, … ]
--   storage : o público ouve as músicas carregadas para a pasta de música de um evento publicado
--             (admin/<id do evento>/musica/…). Substitui a política de uma só música.
-- Pode ser corrido mais do que uma vez.
-- =====================================================================

drop policy if exists "ficheiros: ler musica" on storage.objects;
create policy "ficheiros: ler musica" on storage.objects for select to anon, authenticated
  using (bucket_id = 'ficheiros' and name like 'admin/%/musica/%' and exists (
           select 1 from public.eventos e
            where e.publico and name like 'admin/' || e.id::text || '/musica/%'));

notify pgrst, 'reload schema';
