/* Ligação ao Supabase: carrega os dados para EVENTOS/fotos (o mesmo formato do modo
   demonstração) e grava as alterações. Sem config ou com ?demo, fica tudo local. */

const MODO_LOCAL=/[?&]demo\b/.test(location.search);
const NUVEM=(!MODO_LOCAL && typeof SUPABASE!=='undefined' && SUPABASE.url && window.supabase)
  ? window.supabase.createClient(SUPABASE.url, SUPABASE.chave) : null;
let sessao=null, souAdmin=false, MODELOS_ID={};

function chk(r){ if(r.error) throw new Error(r.error.message||String(r.error)); return r.data; }

async function nvSessao(){
  sessao=chk(await NUVEM.auth.getSession()).session; souAdmin=false;
  if(sessao) souAdmin=!!chk(await NUVEM.rpc('e_admin'));
}
async function nvEntrar(email,senha){
  chk(await NUVEM.auth.signInWithPassword({email, password:senha}));
  await nvSessao();
  if(!souAdmin){ await NUVEM.auth.signOut(); sessao=null; throw new Error('Este utilizador não está na lista de administradores.'); }
}
async function nvSair(){ await NUVEM.auth.signOut(); sessao=null; souAdmin=false; }

/* URLs assinados (1 hora) para ver e descarregar ficheiros do bucket privado. */
async function nvAssinar(paths){
  const out={};
  for(let i=0;i<paths.length;i+=100){
    const r=await NUVEM.storage.from('ficheiros').createSignedUrls(paths.slice(i,i+100),3600);
    (r.data||[]).forEach(x=>{ if(x.signedUrl) out[x.path]=x.signedUrl; });
  }
  return out;
}

/* Converte as linhas da base de dados no formato do protótipo. */
let PARTE_POR_UID={};
function montarParte(e,p){
  const s={id:p.slug, uid:p.id, tipo:p.tipo_id, modelo:null, modeloUid:p.modelo_id, titulo:p.titulo, data:p.data||'',
           tema:p.tema_id||(TIPOS[p.tipo_id]||{}).tema, momento:p.momento_actual_id, ordem:p.ordem||0,
           momentos:[], missoes:[], votos:[], votosPend:[], capa:null, capaPath:p.capa_path||null};
  e.subs.push(s); PARTE_POR_UID[p.id]={e,s}; return s;
}
function momentoDe(m){return {id:m.id, h:String(m.hora||'').slice(0,5), n:m.nome, l:m.local||'', ordem:m.ordem}}

async function nvCarregar(){
  const [ev,pa,mo,mi,vo,fi,mods]=(await Promise.all([
    NUVEM.from('eventos').select('*').order('criado_em'),
    NUVEM.from('partes').select('*'),
    NUVEM.from('momentos').select('*').order('ordem'),
    NUVEM.from('missoes').select('*').order('ordem'),
    NUVEM.from('votos').select('*').order('criado_em',{ascending:false}),
    NUVEM.from('ficheiros').select('*').order('criado_em'),
    NUVEM.from('modelos').select('id,tipo_id,codigo')
  ])).map(chk);
  /* tabelas/funções do fluxo v1.0 — se ainda não existirem, o resto continua a funcionar */
  const suave=r=>(r.error||!Array.isArray(r.data))?[]:r.data;
  const [vids,toks,vis,cfg]=await Promise.all([
    NUVEM.from('videos').select('*').order('ordem').then(suave),
    NUVEM.rpc('tokens_publicos').then(suave),
    souAdmin?NUVEM.from('visitas').select('*').then(suave):Promise.resolve([]),
    NUVEM.from('site_config').select('*').then(suave)
  ]);
  /* página inicial: fotos escolhidas (por id de ficheiro ou caminho de upload em admin/site/…) */
  const vitrineCfg=((cfg.find(c=>c.chave==='inicio')||{}).valor||{}).vitrine||[];
  let ac=[], ap=[];
  if(souAdmin){ const r=await NUVEM.from('pedidos').select('*').order('criado_em',{ascending:false}); PEDIDOS=r.error?[]:r.data; }
  if(souAdmin) [ac,ap]=(await Promise.all([
    NUVEM.from('acessos').select('*').order('criado_em'), NUVEM.from('acesso_partes').select('*')])).map(chk);

  MODELOS_ID={}; const codigo={};
  mods.forEach(m=>{ MODELOS_ID[m.tipo_id+':'+m.codigo]=m.id; codigo[m.id]=m.codigo; });
  PARTE_POR_UID={};
  const porUid={};
  const evs=ev.map(e=>porUid[e.id]=Object.assign({id:e.slug, uid:e.id, titulo:e.titulo, cat:e.categoria_id, local:e.local||'',
    estado:e.estado, capa:null, capaPath:e.capa_path||null, publico:e.publico, publicadoEm:e.publicado_em||null,
    subs:[], acessos:[], videos:[], visitasDia:[], linkContribuir:''}, infoEvento(e)));
  pa.forEach(p=>{ const e=porUid[p.evento_id]; if(e) montarParte(e,p).modelo=codigo[p.modelo_id]||null; });
  evs.forEach(e=>e.subs.sort((a,b)=>(a.data||'9999').localeCompare(b.data||'9999')||a.ordem-b.ordem));
  mo.forEach(m=>{ const x=PARTE_POR_UID[m.parte_id]; if(x) x.s.momentos.push(momentoDe(m)); });
  mi.forEach(q=>{ const x=PARTE_POR_UID[q.parte_id]; if(x) x.s.missoes.push({id:q.id, ic:q.icone||'📸', t:q.titulo, f:q.momento_id}); });
  vo.forEach(v=>{ const x=PARTE_POR_UID[v.parte_id]; if(!x) return;
    (v.estado==='publicado'?x.s.votos:x.s.votosPend).push({id:v.id, q:v.mensagem, a:v.autor_nome||'Convidado'}); });
  evs.forEach(e=>e.subs.forEach(s=>{ if(!s.momentos.some(m=>m.id===s.momento)) s.momento=(s.momentos[0]||{}).id; }));
  ac.forEach(a=>{ const e=porUid[a.evento_id]; if(!e) return;
    e.acessos.push({id:a.id, perfil:a.perfil, nome:a.nome, token:a.token, ativo:a.ativo, usos:a.usos, naPagina:!!a.na_pagina,
      partes:ap.filter(x=>x.acesso_id===a.id).map(x=>(PARTE_POR_UID[x.parte_id]||{}).s).filter(Boolean).map(s=>s.id)}); });
  toks.forEach(t=>{ const e=porUid[t.evento_id]; if(e) e.linkContribuir=urlRota('c/'+t.token); });
  evs.forEach(e=>{ if(!e.linkContribuir){ const a=e.acessos.find(x=>x.perfil==='convidado'&&x.ativo&&x.naPagina);
    if(a && e.perm.envios) e.linkContribuir=urlRota('c/'+a.token); } });
  vis.forEach(v=>{ const e=porUid[v.evento_id]; if(e) e.visitasDia.push({dia:v.dia, n:v.n}); });

  const urls=await nvAssinar([...fi.map(f=>f.storage_path), ...vids.map(v=>v.storage_path).filter(Boolean),
                              ...ev.map(e=>e.capa_path).filter(Boolean), ...pa.map(p=>p.capa_path).filter(Boolean),
                              ...vitrineCfg.map(x=>x.path).filter(Boolean),
                              ...ev.flatMap(e=>musicasSlide(e.slideshow).map(m=>m.path)).filter(Boolean)]);
  if(typeof SITE!=='undefined')
    SITE.vitrine=vitrineCfg.map(x=>x.foto?{foto:x.foto}:x.path?{path:x.path, src:urls[x.path]||''}:null).filter(Boolean);
  evs.forEach(e=>musicasSlide(e.slide).forEach(m=>{ if(m.path) m.src=urls[m.path]||''; }));
  evs.forEach(e=>{ if(e.capaPath && urls[e.capaPath]) e.capa=urls[e.capaPath];
    e.subs.forEach(s=>{ if(s.capaPath && urls[s.capaPath]) s.capa=urls[s.capaPath]; }); });
  vids.forEach(v=>{ const e=porUid[v.evento_id]; if(!e) return;
    const p=v.parte_id&&PARTE_POR_UID[v.parte_id];
    e.videos.push({id:v.id, sub:p?p.s.id:null, titulo:v.titulo, tipo:v.tipo, src:v.tipo==='upload'?(urls[v.storage_path]||''):v.url,
      embed:embedVideo(v.url), oficial:v.oficial, duracao:v.duracao||'', path:v.storage_path||null, ordem:v.ordem}); });
  const novasFotos=fi.map(f=>{
    const x=PARTE_POR_UID[f.parte_id]; if(!x) return null;
    const m=x.s.momentos.find(mm=>mm.id===f.momento_id)||x.s.momentos[0]||{};
    return {id:f.id, ev:x.e.id, sub:x.s.id, fase:m.id, hora:m.h||'', vid:f.tipo==='video', src:urls[f.storage_path]||'',
            autor:f.autor_nome||(f.origem==='participante'?'Convidado':'Fotógrafo'),
            origem:f.origem==='participante'?'participante':'fotografo', estado:f.estado,
            missao:f.missao_id, acesso:f.acesso_id, path:f.storage_path,
            etiqueta:f.etiqueta||(f.origem==='participante'?'convidado':'fotografo'), criado:f.criado_em};
  }).filter(Boolean);

  /* acessos vindos de um link (convidado/fotógrafo) já abertos nesta sessão */
  const extra=(typeof EVENTOS!=='undefined'?EVENTOS:[]).flatMap(e=>(e.acessos||[]).filter(a=>a.doLink).map(a=>({uid:e.uid,a})));
  EVENTOS=evs.filter(e=>e.subs.length);
  fotos=novasFotos;
  extra.forEach(({uid,a})=>{ const e=EVENTOS.find(x=>x.uid===uid); if(e && !e.acessos.some(x=>x.id===a.id)) e.acessos.push(a); });
}

/* Abre um link de convidado/fotógrafo: valida o token no servidor. */
async function nvCarregarAcesso(token){
  const info=chk(await NUVEM.rpc('acesso_info',{p_token:token}));
  if(!info) return false;
  let e=EVENTOS.find(x=>x.uid===info.evento.id);
  if(!e){   /* evento não público: monta-o só com o que o link permite */
    e=Object.assign({id:info.evento.slug, uid:info.evento.id, titulo:info.evento.titulo, cat:info.evento.categoria_id,
       local:info.evento.local||'', estado:'auto', capa:null, subs:[], acessos:[], videos:[], visitasDia:[], linkContribuir:''},
       infoEvento(info.evento));
    info.partes.forEach(p=>{
      const s=montarParte(e,{...p, momento_actual_id:p.momento_actual_id});
      s.momentos=p.momentos.map(momentoDe);
      s.missoes=p.missoes.map(q=>({id:q.id, ic:q.icone||'📸', t:q.titulo, f:q.momento_id}));
      if(!s.momento) s.momento=(s.momentos[0]||{}).id;
    });
    EVENTOS.push(e);
  }
  if(info.evento.permitir_envios===false) e.perm.envios=false;
  const partes=info.partes.map(p=>p.slug);
  e.acessos=(e.acessos||[]).filter(a=>a.id!==info.acesso.id);
  e.acessos.push({id:info.acesso.id, perfil:info.acesso.perfil, nome:info.acesso.nome, token,
    ativo:true, usos:0, doLink:true, partes:partes.length===e.subs.length?[]:partes});
  return true;
}

/* ---------- upload robusto para o Storage ----------
   1) fotos grandes são reduzidas no aparelho (máx. 2560 px, JPEG) — envio mais rápido e menos falhas em rede móvel;
   2) erros passageiros do servidor (5xx, ex.: 520, ou resposta HTML em vez de JSON) são tentados de novo até 3 vezes. */
const FOTO_MAX_LADO=2560, FOTO_MAX_BYTES=1.5*1024*1024;
async function nvPrepararFoto(f){
  if(!f.type||!/^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type)) return f;      // vídeos, gif, etc.: tal como estão
  try{
    const bm=await createImageBitmap(f,{imageOrientation:'from-image'});
    const k=Math.min(1,FOTO_MAX_LADO/Math.max(bm.width,bm.height));
    if(k===1 && f.size<=FOTO_MAX_BYTES && /jpeg/i.test(f.type)){ bm.close&&bm.close(); return f; }
    const c=document.createElement('canvas'); c.width=Math.round(bm.width*k); c.height=Math.round(bm.height*k);
    c.getContext('2d').drawImage(bm,0,0,c.width,c.height); bm.close&&bm.close();
    const b=await new Promise(ok=>c.toBlob(ok,'image/jpeg',.86));
    if(!b || b.size>=f.size) return f;
    return new File([b],(f.name||'foto').replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
  }catch(e){ return f; }                                                           // formato que o navegador não lê: envia o original
}
function erroPassageiro(err){
  const m=String((err&&(err.message||err.error))||err||''), st=+(err&&(err.statusCode||err.status))||0;
  return st>=500 || /Unexpected token|<!DOCTYPE|not valid JSON|Failed to fetch|NetworkError|network|timeout|\b5\d\d\b/i.test(m);
}
async function nvSubir(path,f){
  let ultimo;
  for(let t=1;t<=3;t++){
    const r=await NUVEM.storage.from('ficheiros').upload(path,f,{contentType:f.type||undefined, upsert:false}).catch(e=>({error:e}));
    if(!r.error) return path;
    ultimo=r.error;
    if(/already exists|Duplicate/i.test(String(ultimo.message||''))) return path;  // a tentativa anterior chegou ao servidor
    if(!erroPassageiro(ultimo)) break;
    console.warn('Upload falhou (tentativa '+t+'/3):',ultimo);
    await new Promise(ok=>setTimeout(ok,1000*t));
  }
  throw new Error(erroPassageiro(ultimo)
    ? 'O servidor de ficheiros não respondeu (erro temporário). Tente de novo dentro de momentos.'
    : (ultimo.message||String(ultimo)));
}

/* Envio real: ficheiros para o Storage, depois regista na base de dados. */
async function nvEnviar(acesso,s,momentoId,missaoId,autor,itens,etiqueta){
  const meta=[];
  for(let i=0;i<itens.length;i++){
    if(!itens[i].file) continue;
    toast('A enviar '+(i+1)+'/'+itens.length+'…');
    const f=await nvPrepararFoto(itens[i].file);
    const ext=(f.name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)||(f.type.startsWith('video')?'mp4':'jpg');
    const path=acesso.token+'/'+s.uid+'/'+crypto.randomUUID()+'.'+ext;
    await nvSubir(path,f);
    meta.push({path, tipo:f.type.startsWith('video')?'video':'imagem', mime:f.type||null, tamanho:f.size});
  }
  if(!meta.length) throw new Error('Nenhum ficheiro para enviar.');
  const args={p_token:acesso.token, p_parte_id:s.uid, p_momento_id:momentoId||null,
    p_missao_id:missaoId||null, p_autor:autor, p_ficheiros:meta};
  if(etiqueta) args.p_etiqueta=etiqueta;
  return chk(await NUVEM.rpc('registar_envio',args));
}

/* Upload da organização (capas, vídeos) para "admin/<evento>/…" */
async function nvCarregarAdmin(e,pasta,f){
  f=await nvPrepararFoto(f);
  const ext=(f.name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)||'bin';
  const path='admin/'+e.uid+'/'+pasta+'/'+crypto.randomUUID()+'.'+ext;
  await nvSubir(path,f);
  return path;
}

/* Campos de informação e permissões do evento (linha da base de dados → formato do site). */
function infoEvento(r){
  return {descricao:r.descricao||'', localNome:r.local_nome||'', endereco:r.endereco||'', mapa:r.mapa||'',
          telefone:r.telefone||'', email:r.email||'', cor:r.cor||'', fonte:r.fonte||'', slide:r.slideshow||null,
          perm:{envios:r.permitir_envios!==false, videos:r.mostrar_videos!==false, galeria:r.galeria_publica!==false}};
}
/* músicas do slideshow (lista; "musica" é o formato antigo, com uma só) */
function musicasSlide(c){ return !c?[]:Array.isArray(c.musicas)?c.musicas:(c.musica?[c.musica]:[]); }
/* YouTube → URL de iframe; outros links ficam sem embed. */
function embedVideo(u){
  if(!u) return '';
  const m=String(u).match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? 'https://www.youtube.com/embed/'+m[1] : '';
}

/* Operações genéricas */
const nv={
  ins:async(t,linha)=>chk(await NUVEM.from(t).insert(linha)),
  insRet:async(t,linha)=>chk(await NUVEM.from(t).insert(linha).select()),
  upd:async(t,id,campos)=>chk(await NUVEM.from(t).update(campos).eq('id',id)),
  del:async(t,id)=>chk(await NUVEM.from(t).delete().eq('id',id)),
  rpc:async(f,args)=>chk(await NUVEM.rpc(f,args))
};

/* Executa uma alteração, volta a carregar do servidor e redesenha. */
let ocupado=false;
async function naNuvem(op,msg){
  if(ocupado){ toast('Aguarda — a guardar a alteração anterior…'); return; }
  ocupado=true; toast('A guardar…');
  try{ const r=await op(); await nvCarregar(); if(msg) toast(typeof msg==='function'?msg(r):msg); return r===undefined?true:r; }
  catch(e){ console.error(e); toast('Erro: '+e.message); try{ await nvCarregar(); }catch(_){} }
  finally{ ocupado=false; renderTudo(); }
}
