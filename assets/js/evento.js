/* Vistas públicas dentro dos eventos (versão mobile):
   lista de eventos com pesquisa e filtro por categoria, página do evento,
   visualizador de fotografias, ecrã de partilha e "Mais eventos".
   Carregar depois de inicio.js (usa ico/IC, abrirPedido) e antes de app.js, que arranca a app no fim. */

/* ---------- ícones extra ---------- */
Object.assign(IC,{
  voltar:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  marcador:'<path d="M6.5 4h11v16l-5.5-4-5.5 4z"/>',
  filtros:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  link:'<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  copiar:'<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  casa:'<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
  descarregar:'<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  certo:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  esq:'<path d="M15 5l-7 7 7 7"/>',
  dir:'<path d="M9 5l7 7-7 7"/>',
  play:'<path d="M8 5.5v13l10.5-6.5z"/>',
  telefone:'<path d="M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.1 6.1l1.4-2.3L20 15.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  email:'<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  ao_vivo:'<circle cx="12" cy="12" r="2.2"/><path d="M8 8a5.6 5.6 0 0 0 0 8M16 8a5.6 5.6 0 0 1 0 8M5.2 5.2a9.6 9.6 0 0 0 0 13.6M18.8 5.2a9.6 9.6 0 0 1 0 13.6"/>'
});
document.querySelectorAll('[data-ico]').forEach(el=>el.insertAdjacentHTML('afterbegin',ico(el.dataset.ico)));

/* ---------- utilitários ---------- */
const MESES=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
function dataCaps(d){ if(!d) return 'DATA POR DEFINIR'; const [a,m,dia]=d.split('-'); return dia+' '+MESES[+m-1]+' '+a; }
function primeiraData(e){ return e.subs.map(s=>s.data).filter(Boolean).sort()[0]||''; }
function plural(n){ return /[aeiouáéíóú]$/i.test(n)?n+'s':n.replace(/ão$/,'ões'); }
/* "Nélia & Tomás" + casamento → "Casamento de Nélia & Tomás" */
function tituloLongo(e,s){
  const t=TIPOS[(s||e.subs[0]).tipo];
  return / & /.test(e.titulo) && !e.titulo.toLowerCase().includes(t.n.toLowerCase()) ? t.n+' de '+e.titulo : e.titulo;
}
function descEvento(e,s){ return e.desc||e.descricao||TIPOS[s.tipo].d||''; }
function nPub(e){ return fotos.filter(f=>f.ev===e.id&&f.estado==='publicada').length; }
function metaIcones(d,local){
  return `<span>${ico('cal')}${dataCaps(d)}</span>${local?`<span>${ico('pin')}${esc(local)}</span>`:''}`;
}

/* folhas decorativas (as da maquete) */
const FOLHA=`<svg viewBox="0 0 80 160" aria-hidden="true"><path d="M70 6C30 26 14 70 22 118" fill="none" stroke="currentColor" stroke-width="1.6"/>
<path d="M58 22c-14-2-26 6-30 18 14 2 26-6 30-18z"/><path d="M46 52c-15 0-25 10-26 23 15 0 25-10 26-23z"/>
<path d="M40 50c12-6 26-2 32 9-12 6-26 2-32-9z"/><path d="M30 86c-13 3-21 14-19 27 13-3 21-14 19-27z"/><path d="M28 84c13-3 25 4 28 16-13 3-25-4-28-16z"/></svg>`;
document.querySelectorAll('.ve-fl').forEach(el=>el.innerHTML=FOLHA);

/* ---------- guardados (só neste navegador) ---------- */
const CHAVE_GUARD='memoria.guardados';
function guardados(){ try{ return JSON.parse(localStorage.getItem(CHAVE_GUARD)||'[]'); }catch(e){ return []; } }
function eGuardado(id){ return guardados().includes(id); }
function alternarGuardado(){
  const e=ev(); if(!e) return;
  let g=guardados(); const on=!g.includes(e.id);
  g=on?[...g,e.id]:g.filter(x=>x!==e.id);
  try{ localStorage.setItem(CHAVE_GUARD,JSON.stringify(g)); }catch(err){}
  pintarGuardado(); toast(on?'Evento guardado neste navegador.':'Removido dos guardados.');
}
function pintarGuardado(){
  const b=document.getElementById('veGuardar'), on=ev()&&eGuardado(ev().id);
  if(b){ b.classList.toggle('on',!!on); b.setAttribute('aria-pressed',on?'true':'false'); }
}

/* ===================== LISTA DE EVENTOS ===================== */
/* filtroCat: 'todas' | id de categoria (vindo da página inicial) | 't:<tipo>' | 'guardados' */
let catModo='eventos', vlBusca='', vlEscolha=null;

function tiposComEventos(){
  const cont={};
  eventosPublicos().forEach(e=>new Set(e.subs.map(s=>s.tipo)).forEach(t=>cont[t]=(cont[t]||0)+1));
  return Object.keys(TIPOS).filter(k=>cont[k]).sort((a,b)=>cont[b]-cont[a]);
}
function passaFiltro(e,f){
  if(f==='todas') return true;
  if(f==='guardados') return eGuardado(e.id);
  if(f.startsWith('t:')) return e.subs.some(s=>s.tipo===f.slice(2));
  return e.cat===f;
}
function nomeFiltro(f){
  if(f==='todas') return 'Todos';
  if(f==='guardados') return 'Guardados';
  if(f.startsWith('t:')) return plural(TIPOS[f.slice(2)].n);
  const c=CATEGORIAS.find(x=>x.id===f); return c?((typeof CAT_CURTA!=='undefined'&&CAT_CURTA[f])||c.n):'Todos';
}
function eventosFiltrados(){
  const b=vlBusca.trim().toLowerCase();
  return eventosPublicos().filter(e=>passaFiltro(e,filtroCat) &&
    (catModo!=='galerias'||nPub(e)>0) &&
    (!b||[e.titulo,e.local,tituloLongo(e),...e.subs.map(s=>s.titulo)].join(' ').toLowerCase().includes(b)))
    .sort((a,b)=>(primeiraData(a)||'9').localeCompare(primeiraData(b)||'9'));
}

function renderCatalogo(){
  const v=document.getElementById('view-eventos');
  if(!v.querySelector('.vl')){
    v.innerHTML=`<div class="vl">
      <header class="vl-topo">
        <button class="vl-icbtn" onclick="ir('inicio')" aria-label="Voltar ao início">${ico('voltar')}</button>
        <h1 id="vlTitulo">Eventos</h1><span></span>
      </header>
      <label class="vl-busca">${ico('busca')}<input id="vlBusca" type="search" placeholder="Pesquisar eventos..." autocomplete="off"
        oninput="vlBusca=this.value;renderGrelha()"></label>
      <div class="vl-chips"><div class="vl-chips-rol" id="vlChips"></div>
        <button class="vl-icbtn" onclick="abrirCategorias()" aria-label="Filtrar por categoria">${ico('filtros')}</button></div>
      <div id="vlGrelha"></div>
      <p class="vl-rodape">${NUVEM?'':'Demonstração — eventos e nomes fictícios. '}<a href="#admin">Área da organização</a></p>
    </div>
    <nav class="vl-nav" id="vlNav"></nav>`;
  }
  document.getElementById('vlBusca').value=vlBusca;
  if(filtroCat!=='todas' && !eventosPublicos().some(e=>passaFiltro(e,filtroCat))) filtroCat='todas';
  document.getElementById('vlTitulo').textContent=catModo==='galerias'?'Galerias':'Eventos';
  const fs=['todas',...(guardados().some(id=>eventosPublicos().some(e=>e.id===id))?['guardados']:[]),...tiposComEventos().map(t=>'t:'+t)];
  if(!fs.includes(filtroCat)) fs.splice(1,0,filtroCat);
  document.getElementById('vlChips').innerHTML=fs.map(f=>
    `<button class="vl-chip ${filtroCat===f?'on':''}" onclick="setCat('${f}')">${esc(nomeFiltro(f))}</button>`).join('');
  document.getElementById('vlNav').innerHTML=[['casa','Início',"ir('inicio')",false],['cal','Eventos',"setModo('eventos')",catModo==='eventos'],
    ['imagem','Galerias',"setModo('galerias')",catModo==='galerias'],['info','Sobre','irSobre()',false]]
    .map(([i,n,fn,on])=>`<button class="${on?'on':''}" onclick="${fn}">${ico(i)}<span>${n}</span></button>`).join('');
  renderGrelha();
}
function renderGrelha(){
  const lista=eventosFiltrados(), g=catModo==='galerias';
  document.getElementById('vlGrelha').innerHTML = lista.length
    ? `<div class="vl-grid">${lista.map(g?cartaoGaleria:cartaoEvento).join('')}</div>`
    : `<div class="vl-vazio">${vlBusca?'Nenhum evento corresponde à pesquisa.':g?'Ainda não há galerias com fotografias publicadas.':'Ainda não há eventos nesta categoria.'}</div>`;
}
function cartaoEvento(e){
  const s=e.subs[0], live=estadoEv(e)==='decorrer';
  return `<button class="vl-card" data-go="evento/${e.id}">
    <div class="vl-img">${imgTag(capaDe(e),esc(e.titulo))}
      <span class="vl-badge">${esc(TIPOS[s.tipo].n)}${e.subs.length>1?' +'+(e.subs.length-1):''}</span>
      ${live?'<span class="vl-live"><i></i>a decorrer</span>':''}</div>
    <div class="vl-corpo"><div><b>${esc(tituloLongo(e,s))}</b><div class="vl-meta">${metaIcones(primeiraData(e),e.local)}</div></div>
      <span class="vl-seta">${ico('seta')}</span></div>
  </button>`;
}
function cartaoGaleria(e){
  const pub=fotos.filter(f=>f.ev===e.id&&f.estado==='publicada'), m=pub.filter(f=>!f.vid).slice(0,3);
  return `<button class="vl-card" data-go="evento/${e.id}/${pub[0].sub}">
    <div class="vl-mosaico">${m.map(f=>imgTag(f.src,'')).join('')}</div>
    <div class="vl-corpo"><div><b>${esc(tituloLongo(e))}</b><div class="vl-meta"><span>${ico('imagem')}${pub.length} ${pub.length===1?'ficheiro':'ficheiros'}</span>${e.local?`<span>${ico('pin')}${esc(e.local)}</span>`:''}</div></div>
      <span class="vl-seta">${ico('seta')}</span></div>
  </button>`;
}
function setCat(c){ filtroCat=c; renderCatalogo(); }
function setModo(m){ catModo=m; renderCatalogo(); window.scrollTo({top:0}); }
function irSobre(){ ir('inicio'); setTimeout(()=>{ if(typeof lpIr==='function') lpIr('lp-como'); },60); }

/* folha de categorias */
function abrirCategorias(){
  vlEscolha=filtroCat;
  const capa=f=>{ const e=eventosPublicos().find(x=>passaFiltro(x,f)); return e?imgTag(capaDe(e),''):''; };
  const fs=['todas',...tiposComEventos().map(t=>'t:'+t)];
  if(guardados().length) fs.splice(1,0,'guardados');
  if(!fs.includes(filtroCat)) fs.splice(1,0,filtroCat);
  abrirCamada('vlFolha',`<div class="vf-fundo" onclick="fecharCamada('vlFolha')"></div>
    <div class="vf-caixa" role="dialog" aria-modal="true" aria-labelledby="vfTit">
      <div class="vf-cab"><h2 id="vfTit">Categorias</h2><button class="vl-icbtn" onclick="fecharCamada('vlFolha')" aria-label="Fechar">${ico('fechar')}</button></div>
      <div class="vf-lista">${fs.map(f=>`<button class="vf-linha" data-f="${f}" onclick="escolherCat('${f}')">
        <span class="vf-thumb">${capa(f)}</span><span>${esc(nomeFiltro(f))}</span><i class="vf-radio ${f===vlEscolha?'on':''}"></i></button>`).join('')}</div>
      <button class="vf-aplicar" onclick="setCat(vlEscolha);fecharCamada('vlFolha')">Aplicar Filtros</button>
    </div>`);
}
function escolherCat(f){
  vlEscolha=f;
  document.querySelectorAll('#vlFolha .vf-linha').forEach(b=>b.querySelector('.vf-radio').classList.toggle('on',b.dataset.f===f));
}
function abrirCamada(id,html){
  let m=document.getElementById(id); if(!m){ m=document.createElement('div'); m.id=id; document.body.appendChild(m); }
  m.className='camada on'; m.innerHTML=html; document.body.classList.add('sem-scroll');
}
function fecharCamada(id){ const m=document.getElementById(id); if(m){ m.className='camada'; m.innerHTML=''; } document.body.classList.remove('sem-scroll'); }

/* ===================== PÁGINA DO EVENTO ===================== */
/* Página do evento por separadores, cada um uma página à parte:
   Sobre (capa + mais eventos) · Programa · Galeria · Vídeos · Partilhar · Mural · Localização.
   Programa/galeria/missões/mural são desenhados no app.js; vídeos, partilhar e localização no convidado.js. */
function renderEvento(){
  const e=ev(), s=sub(); if(!e) return;
  const t=TIPOS[s.tipo], tema=temaDe(s), semGal=!!(e.perm&&e.perm.galeria===false), pub=semGal?[]:pubDe(e,s);
  document.getElementById('galeria').style.display=semGal?'none':'';
  document.getElementById('view-evento').style.setProperty('--ve-acc', s.tema==='marfim'||!TEMAS[s.tema] ? '' : tema.gold);
  if(typeof aplicarEstiloEvento==='function') aplicarEstiloEvento(e);   /* cor e tipo de letra do evento (estilo.js) */
  document.getElementById('heroPh').innerHTML=imgTag(capaDe(e,s),esc(e.titulo));
  document.getElementById('evEyebrow').textContent=t.n;
  document.getElementById('evTitulo').textContent=tituloLongo(e,s).replace(/ & /g,' & ');
  document.getElementById('evMeta').innerHTML=metaIcones(s.data,e.local);
  document.getElementById('evPartesBar').style.display=e.subs.length>1?'':'none';
  document.getElementById('evPartes').innerHTML=e.subs.map(x=>
    `<button class="parte ${x.id===s.id?'on':''}" data-go="evento/${e.id}/${x.id}${evSeccao==='sobre'?'':'/'+evSeccao}">${esc(x.titulo)}<small>${dataCaps(x.data)}</small></button>`).join('');
  renderDescricao(descEvento(e,s));
  document.getElementById('evVerGal').style.display=pub.length?'':'none';
  document.getElementById('progTitulo').textContent=e.subs.length>1?'Programa — '+s.titulo:'Programa do evento';
  document.getElementById('progFoto').innerHTML=fotoPrograma(e,s,pub);
  document.getElementById('vowNota').textContent=NUVEM?'As mensagens aparecem depois de aprovadas pela organização.':'';
  pintarGuardado();
  document.getElementById('evFooter').innerHTML=
    `${esc(tituloLongo(e,s))} · ${dataCaps(s.data)}${e.local?' · '+esc(e.local):''}${NUVEM?'':' — página de demonstração'}
     ${NUVEM?'':'<br><span class="tiny">Fotografias: Adobe Stock (rendições do nível gratuito) e imagens geradas, usadas apenas para demonstração.</span>'}`;
  renderCountdown(); renderPrograma(); renderParticipantes(); renderFiltros(); renderGaleria();
  renderMissoes(); renderVotos(); renderMaisEventos();
  if(typeof renderSeccoesEvento==='function') renderSeccoesEvento(e,s);
  renderNavEvento();
  if(typeof registarVisita==='function') registarVisita(e);
}
/* Descrição: na capa só um resumo curto (até ~3 linhas) e "Ler mais";
   o texto completo vai para o bloco "Sobre o evento", por baixo da capa, formatado. */
const DESC_CURTA=200;
function resumoDesc(t){
  const ate=t.split(/\s*•\s*|\n/)[0].trim();
  const base=ate.length<=DESC_CURTA ? ate : t;
  if(base.length<=DESC_CURTA) return base;
  const corte=base.slice(0,DESC_CURTA), frase=corte.match(/^.*[.!?](?=\s)/);
  return frase && frase[0].length>80 ? frase[0] : corte.replace(/\s+\S*$/,'')+'…';
}
/* parágrafos (linhas) + lista a partir dos "•"; a 1.ª frase curta de cada ponto fica a negrito */
function htmlDescricao(t){
  const [intro,...pontos]=t.split(/\s*•\s*/);
  const par=intro.split(/\n+/).map(p=>p.trim()).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('');
  const lista=pontos.map(p=>p.trim()).filter(Boolean).map(p=>{
    const m=p.match(/^([^.:!?]{3,70}[.:])\s+([\s\S]+)$/);
    return `<li>${m?`<b>${esc(m[1])}</b> ${esc(m[2])}`:esc(p)}</li>`;
  }).join('');
  return par+(lista?`<ul class="ve-lista">${lista}</ul>`:'');
}
function renderDescricao(desc){
  desc=String(desc||'').trim();
  const d=document.getElementById('evDesc'), curta=resumoDesc(desc), longa=curta!==desc;
  d.textContent=curta;
  let mais=document.getElementById('evLerMais');
  if(!mais){
    mais=document.createElement('button'); mais.id='evLerMais'; mais.className='ve-ler-mais';
    mais.onclick=()=>document.getElementById('evSobreTxt').scrollIntoView({behavior:'smooth',block:'start'});
    mais.innerHTML='Ler mais '+ico('baixo'); d.after(mais);
  }
  mais.style.display=longa?'':'none';
  let bloco=document.getElementById('evSobreTxt');
  if(!bloco){
    bloco=document.createElement('section'); bloco.id='evSobreTxt'; bloco.className='ve-sec ve-sobre-txt';
    document.getElementById('evMais').before(bloco);
  }
  bloco.style.display=longa?'':'none';
  bloco.innerHTML=longa?`<span class="ve-eti">Sobre</span><h2 class="ve-h2">Sobre o evento</h2><div class="ve-texto">${htmlDescricao(desc)}</div>`:'';
}

/* foto ao lado do programa: a do momento actual, senão a primeira publicada, senão a capa */
function fotoPrograma(e,s,pub){
  const fs=pub.filter(f=>!f.vid), f=fs.find(x=>x.fase===s.momento)||fs[0];
  return f ? `<button onclick="abrirLb('${f.id}',true)" aria-label="Abrir fotografia">${imgTag(f.src,'')}</button>` : imgTag(capaDe(e),'');
}

/* Cada separador é uma página à parte: #evento/<ev>/<parte>/<secção> (sem secção = Sobre).
   Só se mostra a secção activa; os separadores sem conteúdo não aparecem. */
const SECCOES_EV=['sobre','programa','galeria','videos','partilhar','mural','localizacao'];
let evSeccao='sobre';
function seccoesDisponiveis(){
  return [['sobre','info','Sobre'],['programa','cal','Programa'],['galeria','imagem','Galeria'],['videos','play','Vídeos'],
    ['partilhar','partilha','Partilhar'],['mural','conversa','Mural'],['localizacao','pin','Localização']]
    .filter(([id])=>{const x=document.getElementById(id); return x && x.style.display!=='none' && x.innerHTML.trim();});
}
function renderNavEvento(){
  const itens=seccoesDisponiveis();
  if(!itens.some(x=>x[0]===evSeccao)) evSeccao='sobre';
  document.getElementById('evNav').innerHTML='<div class="ve-secnav-in">'+itens.map(([id,ic,n])=>
    `<button data-sec="${id}" class="${id===evSeccao?'on':''}" ${id===evSeccao?'aria-current="page"':''} onclick="irSeccao('${id}')">${ico(ic)}<span>${n}</span></button>`).join('')+'</div>';
  SECCOES_EV.forEach(id=>{const x=document.getElementById(id); if(x) x.classList.toggle('ve-oculta',id!==evSeccao);});
  ['evSobreTxt','evMais','evFooter'].forEach(id=>{const x=document.getElementById(id); if(x) x.classList.toggle('ve-oculta',evSeccao!=='sobre');});
  document.getElementById('view-evento').dataset.seccao=evSeccao;
  const b=document.querySelector('#evNav button.on'); if(b) b.scrollIntoView({block:'nearest',inline:'center'});
}
function irSeccao(id){
  if(!SECCOES_EV.includes(id)||!ev()) return;
  ir('evento/'+atual.ev+'/'+atual.sub+(id==='sobre'?'':'/'+id));
}
function solicitarContacto(){ if(typeof abrirPedido==='function') abrirPedido('informacao'); else ir('inicio'); }
function voltarEventos(){ ir('eventos'); }
function abrirGaleriaCompleta(){ const e=ev(); if(e.perm&&e.perm.galeria===false) return; const p=pubDe(e,sub()); if(p.length) abrirLb(p[0].id,true); }
/* rascunhos (e.publico===false) não aparecem nas listas públicas */
function eventosPublicos(){ return EVENTOS.filter(e=>e.publico!==false); }

/* partilha */
function linkEvento(){ return urlPagina(ev(),sub()); }
function textoPartilha(){ return tituloLongo(ev(),sub())+' — reviva os momentos: '+linkEvento(); }
function htmlRedes(){
  const u=encodeURIComponent(linkEvento()), txt=encodeURIComponent(textoPartilha());
  return `<button onclick="copiarTexto(linkEvento())" aria-label="Copiar link">${ico('link')}</button>
    <a href="https://wa.me/?text=${txt}" target="_blank" rel="noopener" aria-label="Partilhar no WhatsApp">${ico('whatsapp')}</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener" aria-label="Partilhar no Facebook">${ico('facebook')}</a>
    <button onclick="abrirPartilha()" aria-label="Mais opções de partilha">${ico('partilha')}</button>`;
}
function copiarTexto(t){
  try{ navigator.clipboard.writeText(t).then(()=>toast('Link copiado.'),()=>toast(t)); }catch(e){ toast(t); }
}
async function partilharNativo(){
  const dados={title:tituloLongo(ev(),sub()), text:'Reviva os momentos deste evento.', url:linkEvento()};
  if(navigator.share){ try{ await navigator.share(dados); }catch(e){} return; }
  window.open('https://wa.me/?text='+encodeURIComponent(textoPartilha()),'_blank','noopener');
}
const POR_DO_SOL=`<svg class="vp-sol" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
<defs><linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF2E8" stop-opacity="0"/><stop offset=".45" stop-color="#F6C9A0"/><stop offset="1" stop-color="#E58A4E"/></linearGradient></defs>
<rect width="400" height="200" fill="url(#ceu)"/><circle cx="210" cy="150" r="34" fill="#FBE3C4" opacity=".85"/>
<path d="M0 170 Q 80 150 160 165 T 320 160 T 400 158 V200 H0z" fill="#8C4A26" opacity=".55"/>
<path d="M0 184 Q 120 168 220 182 T 400 176 V200 H0z" fill="#3A1F12"/>
<g fill="#2A160C"><path d="M92 182V140h4v42z"/><path d="M50 140c14-10 32-14 46-12 16-2 34 2 48 12-18 2-30-2-48-1-16-1-30 4-46 1z"/><path d="M64 132c10-8 22-10 32-9 12-1 24 2 34 9-14 1-22-1-34-1-10 0-20 2-32 1z"/>
<path d="M300 178V150h3v28z"/><path d="M276 150c9-6 18-8 26-7 9-1 18 1 26 7-10 1-17-1-26-1-8 0-16 2-26 1z"/></g>
<g fill="#4B2A14" opacity=".9"><path d="M372 200c-6-40 0-80 20-112-4 40-8 76-14 112z"/><path d="M380 120c-16-8-30-4-38 6 14 6 28 3 38-6z"/><path d="M384 100c4-16 14-24 26-24-2 14-12 22-26 24z"/><path d="M376 150c-14-10-28-8-36 0 12 8 26 7 36 0z"/></g></svg>`;
function abrirPartilha(){
  const url=linkEvento();
  const confete=[[-58,-30,20],[-44,-62,-30],[50,-58,35],[64,-20,-15],[-66,18,40],[60,26,-40],[-8,-74,10]]
    .map(([x,y,r])=>`<i style="transform:translate(${x}px,${y}px) rotate(${r}deg)"></i>`).join('');
  abrirCamada('vpPartilha',`<div class="vp" role="dialog" aria-modal="true" aria-labelledby="vpTit">
    <button class="vl-icbtn vp-x" onclick="fecharCamada('vpPartilha')" aria-label="Fechar">${ico('fechar')}</button>
    <div class="vp-in">
      <div class="vp-check">${confete}<span>${ico('certo')}</span></div>
      <h2 id="vpTit">Galeria pronta!</h2>
      <p>Partilhe o link com quem quiser<br>e reviva estes momentos.</p>
      <div class="vp-url"><span>${esc(url)}</span><button onclick="copiarTexto(linkEvento())" aria-label="Copiar link">${ico('copiar')}</button></div>
      ${servidorRede()?'':'<p class="vp-nota">Endereço ilustrativo nesta demonstração.</p>'}
      <button class="ve-btn" onclick="copiarTexto(linkEvento())">Copiar link</button>
      <button class="vp-partilhar" onclick="partilharNativo()">${ico('partilha')} Partilhar</button>
    </div>
    ${POR_DO_SOL}
  </div>`);
}

/* mais eventos + pedido de galeria */
function renderMaisEventos(){
  const e=ev(), outros=eventosPublicos().filter(x=>x.id!==e.id)
    .sort((a,b)=>(nPub(b)>0)-(nPub(a)>0) || (primeiraData(a)||'9').localeCompare(primeiraData(b)||'9')).slice(0,4);
  document.getElementById('evMais').innerHTML=`
    ${outros.length?`<div class="ve-mais">
      <div class="ve-eb">Mais eventos</div>
      <h2>Descubra outras galerias disponíveis.</h2>
      <div class="ve-mais-grid">${outros.map(x=>`<button class="ve-mini" data-go="evento/${x.id}">
        <span class="ve-mini-img">${imgTag(capaDe(x),esc(x.titulo))}</span>
        <span class="ve-mini-corpo"><b>${esc(tituloLongo(x))}</b><small>${dataCaps(primeiraData(x))}</small><span class="vl-seta">${ico('seta')}</span></span>
      </button>`).join('')}</div>
      <button class="ve-todos" data-go="eventos">Ver todos os eventos ${ico('seta')}</button>
    </div>`:''}
    <div class="ve-cta">
      <svg class="ve-cta-onda" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0H400V12C300 44 120 -6 0 30z"/></svg>
      <span class="ve-cta-folha">${FOLHA}</span>
      <h3>Precisa de uma galeria<br>para o seu evento?</h3>
      <p>Estamos prontos para ajudar.</p>
      <button class="ve-cta-btn" onclick="solicitarGaleria()">Solicitar uma galeria ${ico('seta')}</button>
    </div>`;
}
function solicitarGaleria(){ if(typeof abrirPedido==='function') abrirPedido('galeria'); else ir('inicio'); }

/* ===================== VISUALIZADOR ===================== */
let lbLista=[], lbIdx=0;
/* todas=true: percorre a galeria inteira da parte; senão, a selecção actual (filtro de momento). */
function abrirLb(id,todas){
  const e=ev(), s=sub(), f=fotos.find(x=>x.id===id); if(!f) return;
  const pub=(e&&s&&f.ev===e.id&&f.sub===s.id)?pubDe(e,s):[f];
  const sel=pub.filter(x=>filtro==='todas'||x.fase===filtro);
  lbLista=(!todas&&sel.some(x=>x.id===id))?sel:pub;
  lbIdx=Math.max(0,lbLista.findIndex(x=>x.id===id));
  document.getElementById('lbTiras').innerHTML=lbLista.length>1?lbLista.map((x,i)=>
    `<button class="${x.vid?'vid':''}" onclick="lbIr(${i})" aria-label="Fotografia ${i+1}">${midia(x,'')}</button>`).join(''):'';
  document.getElementById('lb').classList.add('on');
  document.body.classList.add('sem-scroll');
  lbIr(lbIdx);
}
function lbIr(i){
  if(!lbLista.length) return;
  lbIdx=(i+lbLista.length)%lbLista.length;
  const f=lbLista[lbIdx], e=EVENTOS.find(x=>x.id===f.ev), s=e&&e.subs.find(x=>x.id===f.sub);
  lbFoto=f.id;
  const im=document.getElementById('lbI'), vd=document.getElementById('lbV'), video=!!(f.vid&&f.path);
  im.onerror=()=>{if(!im.dataset.fb){im.dataset.fb=1; im.src=f.src}};
  im.dataset.fb='';
  im.style.display=video?'none':''; vd.style.display=video?'':'none';
  if(video){ vd.src=f.src; im.removeAttribute('src'); } else { vd.pause(); vd.removeAttribute('src'); im.src=hi(f.src); }
  const m=fase(f.fase,s);
  document.getElementById('lbT').textContent=e?tituloLongo(e,s):'';
  document.getElementById('lbS').textContent=[s&&dataCaps(s.data), e&&e.local, m.n,
    f.origem==='fotografo'?'Álbum oficial · '+f.autor:'Enviado por '+f.autor].filter(Boolean).join(' • ');
  document.getElementById('lbCont').textContent=(lbIdx+1)+' / '+lbLista.length;
  document.getElementById('lb').classList.toggle('uma',lbLista.length<2);
  const tiras=document.querySelectorAll('#lbTiras button');
  tiras.forEach((b,k)=>b.classList.toggle('on',k===lbIdx));
  if(tiras[lbIdx]) tiras[lbIdx].scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
}
function lbPasso(d){ lbIr(lbIdx+d); }
function fecharLb(){
  const lb=document.getElementById('lb'); lb.classList.remove('on','uma');
  const v=document.getElementById('lbV'); if(v) v.pause();
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  lbLista=[]; document.getElementById('lbTiras').innerHTML=''; document.getElementById('lbCont').textContent='';
  document.body.classList.remove('sem-scroll');
}
function lbEcraInteiro(){
  const lb=document.getElementById('lb');
  if(document.fullscreenElement) return document.exitFullscreen().catch(()=>{});
  if(lb.requestFullscreen) lb.requestFullscreen().catch(()=>toast('Ecrã inteiro indisponível neste navegador.'));
  else toast('Ecrã inteiro indisponível neste navegador.');
}
document.addEventListener('keydown',e=>{
  if(!document.getElementById('lb').classList.contains('on')) return;
  if(e.key==='ArrowRight') lbPasso(1); else if(e.key==='ArrowLeft') lbPasso(-1);
});
(function(){
  const st=document.getElementById('lbStage'); let x0=null;
  st.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
  st.addEventListener('touchend',e=>{
    if(x0===null) return; const dx=e.changedTouches[0].clientX-x0; x0=null;
    if(Math.abs(dx)>45) lbPasso(dx<0?1:-1);
  });
})();
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ fecharCamada('vlFolha'); fecharCamada('vpPartilha'); } });
