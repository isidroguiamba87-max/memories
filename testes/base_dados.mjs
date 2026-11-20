// Testes da base de dados (PGlite): aplica as migrações e verifica permissões, RLS e funções.
// Uso: node testes/base_dados.mjs supabase/migrations
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const dir = process.argv[2];
const db = new PGlite();
const ok = (m) => console.log('✓', m);

// Stubs mínimos do Supabase
await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth; create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('teste.uid', true),'')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to anon, authenticated;
`);
const esquema = fs.readFileSync(dir + '/20261119120000_esquema_inicial.sql', 'utf8');
const catalogo = fs.readFileSync(dir + '/20261119120100_catalogo.sql', 'utf8');
await db.exec(esquema); ok('esquema aplicado');
await db.exec(catalogo); await db.exec(catalogo); ok('catálogo aplicado (2x, idempotente)');
await db.exec(`grant select, insert on storage.objects to anon, authenticated;`);
const perm = fs.readFileSync(dir + '/20261119120200_permissoes.sql', 'utf8');
const [corpo, verif] = perm.split('-- verificação');
await db.exec(corpo); ok('permissões aplicadas (sem grants manuais)');
console.log('  verificação:', (await db.query(verif.slice(verif.indexOf('\n') + 1))).rows[0]);

const q = async (sql, p) => (await db.query(sql, p)).rows;
console.log('  catálogo:', (await q(`select (select count(*) from categorias) c, (select count(*) from tipos_evento) t,
  (select count(*) from modelos) m, (select count(*) from modelo_momentos) mm, (select count(*) from modelo_missoes) mi`))[0]);

// Admin
const admin = '11111111-1111-1111-1111-111111111111';
await db.exec(`insert into auth.users values ('${admin}','admin@exemplo.test'); insert into administradores (user_id,nome) values ('${admin}','Organização');`);
const comoAdmin = async (fn) => { await db.exec(`set role authenticated; set teste.uid = '${admin}';`); try { return await fn(); } finally { await db.exec(`reset role; set teste.uid = '';`); } };
const comoAnon = async (fn) => { await db.exec(`set role anon; set teste.uid = '';`); try { return await fn(); } finally { await db.exec(`reset role;`); } };

const { ev, lob, cas } = await comoAdmin(async () => {
  const ev = (await q(`insert into eventos (slug,titulo,categoria_id,local) values ('andre-lucia','André & Lúcia','uniao','Maputo') returning id`))[0].id;
  const mLob = (await q(`select id from modelos where tipo_id='lobolo' and codigo='completo'`))[0].id;
  const mCas = (await q(`select id from modelos where tipo_id='casamento' and codigo='classico'`))[0].id;
  const lob = (await q(`select criar_parte_de_modelo($1,$2,'Lobolo','2026-11-08') id`, [ev, mLob]))[0].id;
  const cas = (await q(`select criar_parte_de_modelo($1,$2,null,'2026-12-19') id`, [ev, mCas]))[0].id;
  return { ev, lob, cas };
});
console.log('  partes:', await q(`select slug, titulo, (select count(*) from momentos m where m.parte_id=p.id) momentos,
  (select count(*) from missoes q where q.parte_id=p.id and q.momento_id is not null) missoes from partes p order by data`));
ok('criar_parte_de_modelo');

// Acessos: um geral (todas as partes), um fotógrafo só do lobolo
await comoAdmin(async () => {
  await q(`insert into acessos (evento_id,perfil,nome,token) values ($1,'convidado','QR geral','al-geral'), ($1,'fotografo','Foto Xirico','al-xirico')`, [ev]);
  await q(`insert into acesso_partes select id, $1 from acessos where token='al-xirico'`, [lob]);
});

// Anónimo com token
const info = await comoAnon(() => q(`select acesso_info('al-xirico') i`));
console.log('  acesso_info fotógrafo → partes:', info[0].i.partes.map(p => p.slug), '| perfil:', info[0].i.acesso.perfil);
const momLob = info[0].i.partes[0].momentos[4].id;
const nF = await comoAnon(() => q(`select registar_envio('al-xirico',$1,$2,null,'Foto Xirico',$3::jsonb) n`,
  [lob, momLob, JSON.stringify([{ path: `al-xirico/${lob}/a.jpg`, tipo: 'imagem', mime: 'image/jpeg' }, { path: `al-xirico/${lob}/b.jpg` }])]));
ok('fotógrafo registou ' + nF[0].n + ' ficheiros');
const infoG = await comoAnon(() => q(`select acesso_info('al-geral') i`));
const momCas = infoG[0].i.partes[1].momentos[0].id;
await comoAnon(() => q(`select registar_envio('al-geral',$1,$2,null,'Zica',$3::jsonb)`, [cas, momCas, JSON.stringify([{ path: `al-geral/${cas}/c.jpg` }])]));
ok('convidado registou 1 ficheiro');

const falha = async (nome, fn) => { try { await fn(); { console.log('✗ DEVIA FALHAR:', nome); process.exitCode = 1; } } catch (e) { ok('bloqueado: ' + nome + ' → ' + e.message.split('\n')[0]); } };
await falha('fotógrafo do lobolo a enviar para o casamento', () => comoAnon(() => q(`select registar_envio('al-xirico',$1,null,null,'x',$2::jsonb)`, [cas, JSON.stringify([{ path: `al-xirico/${cas}/z.jpg` }])])));
await falha('caminho de outro token', () => comoAnon(() => q(`select registar_envio('al-geral',$1,null,null,'x',$2::jsonb)`, [cas, JSON.stringify([{ path: `al-xirico/${cas}/z.jpg` }])])));
await falha('token inexistente', () => comoAnon(() => q(`select registar_envio('nada',$1,null,null,'x','[{"path":"nada/x"}]'::jsonb)`, [cas])));
await falha('momento de outra parte', () => comoAnon(() => q(`select registar_envio('al-geral',$1,$2,null,'x',$3::jsonb)`, [cas, momLob, JSON.stringify([{ path: `al-geral/${cas}/m.jpg` }])])));
await falha('anónimo a ler acessos', async () => { const r = await comoAnon(() => q(`select * from acessos`)); if (r.length === 0) throw new Error('0 linhas visíveis'); });
await falha('anónimo a criar evento', () => comoAnon(() => q(`insert into eventos (slug,titulo,categoria_id) values ('x','x','uniao')`)));
await falha('anónimo a usar criar_parte_de_modelo', () => comoAnon(() => q(`select criar_parte_de_modelo($1,(select id from modelos limit 1),'x',null)`, [ev])));

console.log('  estados:', await q(`select origem, estado, count(*)::int n from ficheiros group by 1,2 order by 1`));
const pubAnon = await comoAnon(() => q(`select count(*)::int n from ficheiros`));
ok('anónimo vê ' + pubAnon[0].n + ' ficheiros (só os publicados)');
console.log('  usos:', await q(`select token, usos from acessos order by token`));

// Storage: upload com token válido / inválido
await comoAnon(() => q(`insert into storage.objects (bucket_id,name) values ('ficheiros','al-geral/${cas}/novo.jpg')`)); ok('storage: upload com token válido');
await falha('storage: upload com token inválido', () => comoAnon(() => q(`insert into storage.objects (bucket_id,name) values ('ficheiros','falso/${cas}/x.jpg')`)));
await comoAdmin(() => q(`update acessos set ativo=false where token='al-geral'`));
await falha('storage: upload com token desactivado', () => comoAnon(() => q(`insert into storage.objects (bucket_id,name) values ('ficheiros','al-geral/${cas}/y.jpg')`)));

// Moderação + mural + estado
await comoAdmin(() => q(`update ficheiros set estado='publicada' where estado='pendente'`));
console.log('  moderado_por preenchido:', (await q(`select count(*)::int n from ficheiros where moderado_por is not null`))[0].n);
await comoAnon(() => q(`insert into votos (parte_id, autor_nome, mensagem) values ($1,'Avó','Parabéns!')`, [lob])); ok('mural: anónimo escreve (pendente)');
console.log('  mural visível ao público:', (await comoAnon(() => q(`select count(*)::int n from votos`)))[0].n);
console.log('  v_eventos:', await q(`select slug, estado_calculado, publicados, data_inicio, data_fim from v_eventos`));
// Funções do painel
await db.exec(fs.readFileSync(dir + '/20261119120300_funcoes_painel.sql', 'utf8')); ok('funções do painel aplicadas');
const mods = await q(`select id, tipo_id, codigo from modelos`);
const mid = (t, c) => mods.find(m => m.tipo_id === t && m.codigo === c).id;
const ev2 = await comoAdmin(() => q(`select criar_evento('teste-par','Teste & Par','uniao','Maputo',$1::jsonb) id`,
  [JSON.stringify([{ modelo_id: mid('lobolo', 'pedido'), titulo: 'Pedido', data: '2027-01-01' }, { modelo_id: mid('casamento', 'civil'), titulo: '', data: '2027-02-01' }])]));
console.log('  criar_evento →', await q(`select p.slug, p.titulo, (select count(*)::int from momentos m where m.parte_id=p.id) n from partes p where evento_id=$1 order by data`, [ev2[0].id]),
  '| acessos:', (await q(`select count(*)::int n from acessos where evento_id=$1`, [ev2[0].id]))[0].n);
await falha('anónimo a criar evento por função', () => comoAnon(() => q(`select criar_evento('x','x','uniao','',$1::jsonb)`, [JSON.stringify([{ modelo_id: mid('lobolo', 'pedido') }])])));
// aplicar modelo ao lobolo (que tem 2 fotos no momento 5)
await comoAdmin(() => q(`select aplicar_modelo($1,$2)`, [lob, mid('lobolo', 'pedido')]));
console.log('  aplicar_modelo → momentos:', (await q(`select string_agg(nome, ' | ' order by ordem) s from momentos where parte_id=$1`, [lob]))[0].s,
  '| fotos no último:', (await q(`select count(*)::int n from ficheiros f join momentos m on m.id=f.momento_id where f.parte_id=$1 and m.ordem=4`, [lob]))[0].n);
await falha('aplicar modelo de outro tipo', () => comoAdmin(() => q(`select aplicar_modelo($1,$2)`, [lob, mid('casamento', 'civil')])));
const ms = await q(`select id, nome from momentos where parte_id=$1 order by ordem`, [lob]);
await comoAdmin(() => q(`select mover_momento($1, 1)`, [ms[0].id]));
console.log('  mover_momento → ', (await q(`select string_agg(nome, ' | ' order by ordem) s from momentos where parte_id=$1`, [lob]))[0].s);
await comoAdmin(() => q(`select remover_momento($1)`, [ms[3].id]));
console.log('  remover_momento → momentos:', (await q(`select count(*)::int n from momentos where parte_id=$1`, [lob]))[0].n,
  '| fotos sem momento:', (await q(`select count(*)::int n from ficheiros where parte_id=$1 and momento_id is null`, [lob]))[0].n);
await db.exec(fs.readFileSync(dir + '/20261119120400_pedidos.sql', 'utf8'));
await db.exec(fs.readFileSync(dir + '/20261119120400_pedidos.sql', 'utf8')); ok('pedidos aplicado (2x)');
await comoAnon(() => q(`insert into pedidos (tipo,nome,contacto,mensagem) values ('galeria','Ana','+258 84 000 0000','Casamento em Março')`)); ok('anónimo envia pedido');
await falha('anónimo a ler pedidos', async () => { const r = await comoAnon(() => q(`select * from pedidos`)); if (r.length === 0) throw new Error('0 linhas'); });
console.log('  admin vê pedidos:', (await comoAdmin(() => q(`select count(*)::int n from pedidos`)))[0].n);
// ---------- fluxo v1.0 ----------
await db.exec(fs.readFileSync(dir + '/20261119120500_fluxo.sql', 'utf8'));
await db.exec(fs.readFileSync(dir + '/20261119120500_fluxo.sql', 'utf8')); ok('fluxo aplicado (2x)');
const ev3 = (await comoAdmin(() => q(`select criar_evento('ana-pedro','Ana & Pedro','uniao','Maputo',$1::jsonb) id`,
  [JSON.stringify([{ modelo_id: mid('casamento', 'classico'), titulo: 'Casamento', data: '2027-06-14' }])])))[0].id;
console.log('  novo evento é rascunho:', (await q(`select publico from eventos where id=$1`, [ev3]))[0].publico === false);
const tokGeral = (await q(`select token from acessos where evento_id=$1 and na_pagina`, [ev3]))[0].token;
const parte3 = (await q(`select id from partes where evento_id=$1`, [ev3]))[0].id;
console.log('  anónimo não vê rascunho:', (await comoAnon(() => q(`select count(*)::int n from eventos where id=$1`, [ev3])))[0].n === 0);
console.log('  tokens_publicos (rascunho):', (await comoAnon(() => q(`select * from tokens_publicos() where evento_id=$1`, [ev3]))).length);
// convidado envia mesmo em rascunho, com etiqueta MC
await comoAnon(() => q(`select registar_envio($1,$2,null,null,'DJ Zé',$3::jsonb,'mc')`, [tokGeral, parte3, JSON.stringify([{ path: `${tokGeral}/${parte3}/mc.jpg` }])]));
console.log('  etiqueta guardada:', (await q(`select etiqueta, estado from ficheiros where storage_path like $1`, [tokGeral + '/%']))[0]);
// publicar + vídeo + visitas
await comoAdmin(() => q(`update eventos set publico=true, publicado_em=now(), descricao='Um dia inesquecível', local_nome='Centro de Eventos', mapa='Centro de Eventos, Maputo' where id=$1`, [ev3]));
await comoAdmin(() => q(`insert into videos (evento_id,titulo,tipo,url,oficial) values ($1,'Directo','live','https://youtube.com/live/x',true)`, [ev3]));
console.log('  tokens_publicos (publicado):', (await comoAnon(() => q(`select token from tokens_publicos() where evento_id=$1`, [ev3])))[0]?.token === tokGeral);
await comoAnon(() => q(`select registar_visita($1)`, [ev3])); await comoAnon(() => q(`select registar_visita($1)`, [ev3]));
console.log('  visitas hoje:', (await comoAdmin(() => q(`select n from visitas where evento_id=$1`, [ev3])))[0].n);
await falha('anónimo a ler visitas', async () => { const r = await comoAnon(() => q(`select * from visitas`)); if (!r.length) throw new Error('0 linhas'); });
console.log('  anónimo vê vídeo:', (await comoAnon(() => q(`select count(*)::int n from videos where evento_id=$1`, [ev3])))[0].n);
await comoAdmin(() => q(`update eventos set mostrar_videos=false where id=$1`, [ev3]));
console.log('  vídeo escondido com mostrar_videos=false:', (await comoAnon(() => q(`select count(*)::int n from videos where evento_id=$1`, [ev3])))[0].n === 0);
// fechar envios
await comoAdmin(() => q(`update eventos set permitir_envios=false where id=$1`, [ev3]));
await falha('convidado com envios fechados', () => comoAnon(() => q(`select registar_envio($1,$2,null,null,'x',$3::jsonb)`, [tokGeral, parte3, JSON.stringify([{ path: `${tokGeral}/${parte3}/z.jpg` }])])));
await falha('storage com envios fechados', () => comoAnon(() => q(`insert into storage.objects (bucket_id,name) values ('ficheiros',$1)`, [`${tokGeral}/${parte3}/z.jpg`])));
const infoF = (await comoAnon(() => q(`select acesso_info($1) i`, [tokGeral])))[0].i;
console.log('  acesso_info traz descrição/permissões:', infoF.evento.descricao, '| envios', infoF.evento.permitir_envios);
// galeria privada
await comoAdmin(() => q(`update ficheiros set estado='publicada' where storage_path like $1`, [tokGeral + '/%']));
await comoAdmin(() => q(`update eventos set galeria_publica=false where id=$1`, [ev3]));
console.log('  fotos escondidas com galeria privada:', (await comoAnon(() => q(`select count(*)::int n from ficheiros where evento_id=$1`, [ev3])))[0].n === 0);
await comoAdmin(() => q(`insert into storage.objects (bucket_id,name) values ('ficheiros','admin/${ev3}/capa.jpg')`)); ok('admin carrega capa em admin/');
await falha('anónimo a carregar em admin/', () => comoAnon(() => q(`insert into storage.objects (bucket_id,name) values ('ficheiros','admin/${ev3}/x.jpg')`)));
// ---------- capas por parte ----------
const capaSql = fs.readFileSync(dir + '/20261119120600_capas_partes.sql', 'utf8');
await db.exec(capaSql.split('-- verificação')[0]); await db.exec(capaSql.split('-- verificação')[0]); ok('capas por parte aplicado (2x)');
await comoAdmin(() => q(`update partes set capa_path=$1 where id=$2`, [`admin/${ev3}/capa/parte.jpg`, parte3]));
await comoAdmin(() => q(`update eventos set galeria_publica=true where id=$1`, [ev3]));
await comoAdmin(() => q(`insert into storage.objects (bucket_id,name) values ('ficheiros','admin/${ev3}/capa/parte.jpg')`));
console.log('  anónimo lê capa da parte:', (await comoAnon(() => q(`select count(*)::int n from storage.objects where name=$1`, [`admin/${ev3}/capa/parte.jpg`])))[0].n === 1);
await comoAdmin(() => q(`update eventos set publico=false where id=$1`, [ev3]));
console.log('  capa escondida em rascunho:', (await comoAnon(() => q(`select count(*)::int n from storage.objects where name=$1`, [`admin/${ev3}/capa/parte.jpg`])))[0].n === 0);
// ---------- personalização (outra sessão) ----------
const pers = fs.readFileSync(dir + '/20261119120700_personalizar.sql', 'utf8');
await db.exec(pers); await db.exec(pers); ok('personalizar aplicado (2x)');
await comoAdmin(() => q(`update eventos set cor='#B5541C', fonte='playfair' where id=$1`, [ev3]));
await falha('cor inválida', () => comoAdmin(() => q(`update eventos set cor='vermelho' where id=$1`, [ev3])));
await falha('fonte fora da lista', () => comoAdmin(() => q(`update eventos set fonte='comic' where id=$1`, [ev3])));
await comoAdmin(() => q(`insert into site_config (chave,valor) values ('inicio','{"vitrine":[]}') on conflict (chave) do update set valor=excluded.valor`));
console.log('  público lê site_config:', (await comoAnon(() => q(`select count(*)::int n from site_config`)))[0].n === 1);
await falha('anónimo a escrever site_config', () => comoAnon(() => q(`insert into site_config (chave,valor) values ('x','{}')`)));
await comoAdmin(() => q(`insert into storage.objects (bucket_id,name) values ('ficheiros','admin/site/vitrine1.jpg')`));
console.log('  público lê admin/site/*:', (await comoAnon(() => q(`select count(*)::int n from storage.objects where name='admin/site/vitrine1.jpg'`)))[0].n === 1);
await comoAdmin(() => q(`update eventos set publico=true where id=$1`, [ev3]));
console.log('  capa de parte continua legível:', (await comoAnon(() => q(`select count(*)::int n from storage.objects where name=$1`, [`admin/${ev3}/capa/parte.jpg`])))[0].n === 1);
console.log('\nTUDO OK');
