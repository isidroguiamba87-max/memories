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

-- verificação: deve mostrar 1
select count(*) as capa_por_parte from information_schema.columns
 where table_schema = 'public' and table_name = 'partes' and column_name = 'capa_path';
