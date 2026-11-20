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
