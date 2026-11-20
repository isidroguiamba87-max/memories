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
