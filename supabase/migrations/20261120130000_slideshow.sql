-- =====================================================================
-- Memória — slideshow do evento
--   eventos.slideshow : configuração escolhida no painel (JSON), por exemplo
--     { "activo": true, "titulo": "…", "fotos": ["<id de ficheiro>", …],
--       "transicao": "suave|zoom|deslizar|cortina|variadas", "segundos": 5,
--       "ordem": "evento|aleatoria",
--       "musica": { "tipo": "youtube", "url": "https://youtu.be/…" }
--               | { "tipo": "ficheiro", "path": "admin/<evento>/musica/….mp3", "nome": "…" } }
--   bucket ficheiros  : passa a aceitar áudio (música carregada do computador ou do telemóvel)
--   storage           : o público ouve a música do slideshow dos eventos publicados
-- Pode ser corrido mais do que uma vez.
-- =====================================================================

alter table public.eventos add column if not exists slideshow jsonb;

update storage.buckets
   set allowed_mime_types = array['image/*','video/*','audio/*']
 where id = 'ficheiros'
   and not ('audio/*' = any(coalesce(allowed_mime_types, array[]::text[])));

-- Política separada (não substitui "ficheiros: ler publicados").
drop policy if exists "ficheiros: ler musica" on storage.objects;
create policy "ficheiros: ler musica" on storage.objects for select to anon, authenticated
  using (bucket_id = 'ficheiros' and name like 'admin/%/musica/%' and exists (
           select 1 from public.eventos e
            where e.publico and e.slideshow->'musica'->>'path' = name));

notify pgrst, 'reload schema';
