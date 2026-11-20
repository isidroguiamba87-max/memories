/* Estado, navegação, renderização e acções da interface. */

/* ===================== ESTADO ===================== */
const CHAVE='memoria.v2';
let atual={ev:null, sub:null};        // evento e parte seleccionados
let vistaActual='eventos';
let filtro='todas', filtroPessoa=null, filtroCat='todas', filtroOrigem='todas';
let admModo='lista', admAba='dashboard', admEvAba='info', etiquetaEnvio='convidado';
let rascunho=null, novaParte=null, lbFoto=null;
let confirmar=null, confirmTimer;

function guardar(){
  if(NUVEM) return;
  try{ localStorage.setItem(CHAVE, JSON.stringify({EVENTOS, fotos, seq})); }
  catch(e){
    /* Sem espaço: guarda sem as fotografias carregadas do dispositivo. */
    try{
      const leves=fotos.filter(f=>!/^data:(image\/(?!svg)|video)/.test(f.src));
      localStorage.setItem(CHAVE, JSON.stringify({EVENTOS, fotos:leves, seq}));
    }catch(e2){}
  }
}
function carregar(){
  try{
    const d=JSON.parse(localStorage.getItem(CHAVE)||'null');
    if(d && Array.isArray(d.EVENTOS) && d.EVENTOS.length){
      EVENTOS=d.EVENTOS; fotos=d.fotos||[]; seq=d.seq||fotos.length;
      EVENTOS.forEach(e=>{ if(!e.acessos) e.acessos=acessosPadrao(e); completarEvento(e); });
      return;
    }
  }catch(e){}
  semear();
}
function confirmado(chave,msg){
  if(confirmar===chave){ confirmar=null; return true; }
  confirmar=chave; clearTimeout(confirmTimer); confirmTimer=setTimeout(()=>confirmar=null,5000);
  toast(msg+' Carrega outra vez para confirmar.'); return false;
}
function reporDemo(){
  if(!confirmado('repor','Isto apaga os eventos criados e repõe a demonstração.')) return;
  try{ localStorage.removeItem(CHAVE); }catch(e){}
  semear(); atual={ev:null, sub:null}; rascunho=null; admAba='eventos';
  ir('admin'); toast('Demonstração reposta.');
}

/* ===================== UTILITÁRIOS ===================== */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
function slug(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)}
function hash(s){let h=0; for(const c of String(s)) h=(h*31+c.charCodeAt(0))>>>0; return h}
function ev(){return EVENTOS.find(e=>e.id===atual.ev)}
function sub(){const e=ev(); return e && (e.subs.find(s=>s.id===atual.sub)||e.subs[0])}
function fase(id,s){s=s||sub(); return (s&&s.momentos.find(m=>m.id===id))||{n:'—',h:'',l:''}}
function fotosDe(e,s){return fotos.filter(f=>f.ev===e.id&&f.sub===s.id)}
function pubDe(e,s){return fotosDe(e,s).filter(f=>f.estado==='publicada')}
function temaDe(s){return TEMAS[s.tema]||TEMAS[TIPOS[s.tipo].tema]||TEMAS.marfim}
function cor(nome){let s=0;for(const c of nome) s+=c.charCodeAt(0); return CORES[s%CORES.length]}
function ini(nome){return nome.split(' ').map(p=>p[0]).slice(0,2).join('')}
const ESTADOS={preparacao:'em preparação', decorrer:'a decorrer', encerrado:'encerrado'};
function estadoEv(e){
  if(e.estado && e.estado!=='auto') return e.estado;
  const hoje=new Date().toISOString().slice(0,10), ds=e.subs.map(s=>s.data).filter(Boolean).sort();
  if(!ds.length || hoje<ds[0]) return 'preparacao';
  return hoje>ds[ds.length-1] ? 'encerrado' : 'decorrer';
}
function dataCurta(d){return d? new Date(d+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'}) : 'sem data'}
function dataLonga(d){
  if(!d) return 'data por definir';
  const t=new Date(d+'T12:00:00').toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  return t.charAt(0).toUpperCase()+t.slice(1);
}
/* Parte "da vez": a de hoje; senão a próxima; depois do evento acabar, a última. */
function parteDaVez(e){
  const hoje=new Date().toISOString().slice(0,10);
  const ps=e.subs.filter(s=>s.data).slice().sort((a,b)=>a.data.localeCompare(b.data));
  return ps.find(s=>s.data===hoje) || ps.find(s=>s.data>hoje) || ps[ps.length-1] || e.subs[0];
}
/* Capa do evento (lista de eventos, painel…). Com s, a capa dessa parte.
   Ordem: capa da parte da vez → a capa da parte anterior mais recente (a última usada fica)
   → capa geral do evento → capa de qualquer parte → primeira foto publicada → imagem gerada. */
function capaDe(e,s){
  if(s && s.capa) return s.capa;
  const ps=e.subs.filter(x=>x.data).slice().sort((a,b)=>a.data.localeCompare(b.data));
  const vez=parteDaVez(e), i=ps.indexOf(vez);
  if(vez && vez.capa) return vez.capa;
  for(let k=i-1;k>=0;k--) if(ps[k].capa) return ps[k].capa;
  if(e.capa) return e.capa;
  const qualquer=e.subs.find(x=>x.capa); if(qualquer) return qualquer.capa;
  const f=fotos.find(x=>x.ev===e.id&&x.estado==='publicada'&&!x.vid);
  return f ? f.src : arte(hash(e.id), TIPOS[e.subs[0].tipo].n, true);
}
function tituloHtml(t){
  const p=String(t).split(' & ');
  return p.length===2 ? esc(p[0])+'<span class="amp">&amp;</span>'+esc(p[1]) : esc(t);
}
function swatch(t){return `<i class="sw" style="background:linear-gradient(90deg,${t.gold} 50%,${t.terra} 50%)"></i>`}
function aplicarTema(t){
  const r=document.documentElement.style;
  ['gold','terra','ivory','sand','line'].forEach(k=>r.setProperty('--'+k,t[k]));
}

/* ===================== NAVEGAÇÃO ===================== */
/* Três áreas separadas, cada uma com o seu cabeçalho:
   público      #eventos · #evento/<ev>/<parte>
   convidados   #c/<token>/<parte>     (link/QR de convidados, vários por evento)
   fotógrafos   #f/<token>/<parte>     (uma página por fotógrafo, várias por evento)
   organização  #admin · #admin/novo · #admin/<ev>/<parte> */
const VIEWS=['inicio','eventos','evento','convidado','fotografo','aviso','admin'];
let ultimoHash='', acessoAtual=null, rotaAviso='';

function porToken(tok){
  for(const e of EVENTOS){ const a=(e.acessos||[]).find(x=>x.token===tok); if(a) return {e,a}; }
  return null;
}
function partesDoAcesso(e,a){
  const ps=a.partes&&a.partes.length ? e.subs.filter(s=>a.partes.includes(s.id)) : [];
  return ps.length ? ps : e.subs;
}
function renderTopo(v){
  const e=ev(), area=v==='convidado'||v==='fotografo';
  let h=(area?`<button class="topo-voltar" onclick="voltarArea()" aria-label="Voltar à página do evento">${ico('voltar')}</button>`:'')+
    `<div class="brand"${area?'':` data-go="${v==='admin'?'admin':'inicio'}" style="cursor:pointer"`}>${logoSvg()} Memória</div>`;
  if(v==='admin'){
    const lista=admModo!=='evento';
    h+=`<span class="demo-pill">Organização</span><nav class="nav">
      <a class="navlink" href="#eventos" target="_blank" rel="noopener">Site público ↗</a>
      ${NUVEM&&souAdmin?'<button onclick="sair()">Sair</button>':''}</nav>`;
  }else if(area){
    h+=`<span class="demo-pill">${v==='convidado'?'Convidados':'Fotógrafo'}</span><div class="topo-ev">${e?esc(e.titulo):''}</div>`;
  }else if(v!=='aviso'){
    h+=`${NUVEM?'':'<span class="demo-pill">demo</span>'}<nav class="nav"><button data-go="inicio">Início</button><button data-go="eventos" class="${v==='eventos'?'on':''}">Eventos</button>
      ${v==='evento'&&e?`<button class="on" data-go="evento">${esc(e.titulo)}</button>`:''}</nav>`;
  }
  document.getElementById('topo').innerHTML=h;
}

/* botão Voltar das páginas de convidado e fotógrafo: vai para a página do evento */
function voltarArea(){ const e=ev(), s=sub(); ir(e&&s?'evento/'+e.id+'/'+s.id:'eventos'); }

function seleccionar(a,b){
  const e=EVENTOS.find(x=>x.id===a); if(!e) return false;
  const nb=(b&&e.subs.some(s=>s.id===b)) ? b : e.subs[0].id;
  if(atual.ev!==a||atual.sub!==nb){ filtro='todas'; filtroPessoa=null; filtroOrigem='todas'; novaParte=null; limparBuffers(); }
  atual.ev=a; atual.sub=nb; return true;
}
function garantirEvento(){
  if(ev()) return true;
  const e=EVENTOS.find(x=>estadoEv(x)==='decorrer')||EVENTOS[0];
  return e ? seleccionar(e.id) : false;
}
function caminho(v){
  if(v==='eventos'||v==='inicio') return v;
  if(v==='aviso') return rotaAviso;
  if(v==='convidado') return 'c/'+acessoAtual.token+'/'+atual.sub;
  if(v==='fotografo') return 'f/'+acessoAtual.token+'/'+atual.sub;
  if(v==='admin' && admModo!=='evento') return admAba==='dashboard' ? 'admin' : 'admin/'+admAba;
  return v+'/'+atual.ev+'/'+atual.sub+(v==='evento'&&evSeccao!=='sobre'?'/'+evSeccao:'');
}
function ir(h){
  let [v,a,b,c]=String(h||'').replace(/^#/,'').split('/');
  if(v==='evento') evSeccao=SECCOES_EV.includes(c)?c:'sobre';
  if(v==='casamento'){ v='evento'; a=a||'nelia-tomas'; }
  /* rotas antigas #enviar/<ev> e #fotografo/<ev>: usa o primeiro acesso activo */
  if(v==='enviar'||v==='fotografo'){
    const e=EVENTOS.find(x=>x.id===a), per=v==='enviar'?'convidado':'fotografo';
    const ac=e&&(e.acessos||[]).find(x=>x.perfil===per&&x.ativo);
    if(ac){ v=per==='convidado'?'c':'f'; a=ac.token; } else v='eventos';
  }
  if(v==='c'||v==='f'){
    const per=v==='c'?'convidado':'fotografo', r=a&&porToken(a);
    if(r && r.a.perfil===per && r.a.ativo){
      const ps=partesDoAcesso(r.e,r.a);
      if(acessoAtual!==r.a) limparBuffers();
      acessoAtual=r.a; seleccionar(r.e.id, ps.some(s=>s.id===b)?b:ps[0].id); v=per;
    }else{
      acessoAtual=null; rotaAviso=String(h||'').replace(/^#/,''); v='aviso';
      document.getElementById('avisoTxt').textContent = r && !r.a.ativo
        ? 'A organização desactivou este link. Pede um novo QR Code a quem organiza o evento.'
        : 'Não encontrámos este link. Confirma o QR Code com a organização.'+(NUVEM?'':' (Nesta demonstração, os links criados no painel só funcionam no navegador onde foram criados.)');
    }
  }
  if(!VIEWS.includes(v) || ((v==='convidado'||v==='fotografo')&&!acessoAtual)) v='inicio';
  if(v==='admin'){
    if(a && SECCOES_PAINEL.includes(a)){ admModo='lista'; admAba=a; if(a==='novo'&&!rascunho) rascunho=novoRascunho(); }
    else if(a && seleccionar(a,b)) admModo='evento';
    else { admModo='lista'; admAba='dashboard'; }
  } else if(a) seleccionar(a,b);
  if(v==='evento' && !garantirEvento()) v='eventos';
  vistaActual=v;
  VIEWS.forEach(x=>document.getElementById('view-'+x).classList.toggle('on',x===v));
  aplicarTema(['evento','convidado','fotografo'].includes(v) ? temaDe(sub()) : TEMAS.marfim);
  renderTopo(v);
  renderVista(v);
  const alvo=caminho(v);
  if(location.hash.slice(1)!==alvo){ ultimoHash=alvo; location.hash=alvo; }
  window.scrollTo({top:0});
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-go]'); if(b) ir(b.dataset.go);
});
window.addEventListener('hashchange',()=>{
  const h=location.hash.slice(1);
  if(h===ultimoHash){ ultimoHash=''; return; }
  navegar(h);
});

function renderVista(v){
  ({eventos:renderCatalogo, evento:renderEvento, convidado:renderConvidado, fotografo:renderFotografo,
    aviso:()=>{}, admin:renderAdmin, inicio:renderInicio}[v])();
  document.body.dataset.vista=v;
  document.querySelector('.topbar').style.display=['inicio','eventos','evento'].includes(v)?'none':'';
  if(v!=='inicio') lpMenu(false);
}
function renderTudo(){ renderVista(vistaActual); }

/* ===================== CATÁLOGO ===================== */
/* renderCatalogo, setCat e cartaoEvento (lista de eventos) estão em evento.js */
function intervaloDatas(e){
  const ds=e.subs.map(s=>s.data).filter(Boolean).sort();
  if(!ds.length) return 'sem data';
  return ds[0]===ds[ds.length-1] ? dataCurta(ds[0]) : dataCurta(ds[0])+' — '+dataCurta(ds[ds.length-1]);
}

/* ===================== PÁGINA DO EVENTO ===================== */
/* renderEvento (página do evento) está em evento.js */

function renderCountdown(){
  const s=sub(), el=document.getElementById('count'); if(!s) return;
  if(!s.data){ el.innerHTML=''; return; }
  const h=(s.momentos[0]&&s.momentos[0].h)||'10:00';
  const d=new Date(s.data+'T'+h+':00+02:00')-new Date();
  if(d<=0){ el.innerHTML='<div style="min-width:120px"><b>✓</b><span>realizado</span></div>'; return; }
  const dd=Math.floor(d/864e5), hh=Math.floor(d/36e5)%24, mm=Math.floor(d/6e4)%60;
  el.innerHTML=[[dd,'dias'],[hh,'horas'],[mm,'min']].map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join('');
}

function renderPrograma(){
  const e=ev(), s=sub(), pub=pubDe(e,s), aDecorrer=estadoEv(e)==='decorrer';
  const iAct=s.momentos.findIndex(m=>m.id===s.momento), passada=estadoEv(e)==='encerrado'||(s.data&&s.data<new Date().toISOString().slice(0,10));
  document.getElementById('prog').innerHTML=s.momentos.length ? s.momentos.map((m,i)=>{
    const n=pub.filter(x=>x.fase===m.id).length, agora=aDecorrer&&m.id===s.momento, passou=passada||(aDecorrer&&iAct>=0&&i<iAct);
    return `<li class="${agora?'agora':''} ${passou?'passou':''}">
      <button onclick="setFiltro('${m.id}',true)">
        <span class="ve-hora">${agora?'<em>Em curso</em>':''}${esc(m.h)}</span><i class="ve-ponto"></i>
        <span class="ve-mom"><b>${esc(m.n)}</b>${m.l?`<small>${esc(m.l)}</small>`:''}</span>
        <span class="ve-mom-n">${n?n+' '+(n===1?'foto':'fotos'):''}</span>
      </button></li>`}).join('')
    : '<li class="ve-vazio-li">O programa ainda não foi publicado.</li>';
  const m=fase(s.momento);
  document.getElementById('liveNow').textContent=m.n+(m.h?' · '+m.h:'');
  const sel=document.getElementById('liveSel'), podeMudar=!(NUVEM&&!souAdmin);
  sel.innerHTML=s.momentos.map(x=>`<option value="${x.id}">Momento: ${esc(x.n)}</option>`).join('');
  sel.value=s.momento;
  sel.style.display=podeMudar?'':'none';
  document.getElementById('liveBar').style.display=(aDecorrer||podeMudar)&&s.momentos.length?'':'none';
}
document.getElementById('liveSel').addEventListener('change',e=>{
  if(NUVEM) return setMomentoActual(e.target.value);
  const s=sub(); s.momento=e.target.value; filtro=s.momento; guardar();
  renderPrograma(); renderFiltros(); renderGaleria();
  toast('Momento actual: '+fase(s.momento).n);
});

/* galeria: filtro por origem (todas | fotografo | participante), por momento e por pessoa */
const ORIGENS=[['todas','Todos'],['fotografo','Oficiais'],['participante','Convidados']];
function passaOrigem(f){return filtroOrigem==='todas'||f.origem===filtroOrigem}
function renderFiltros(){
  const s=sub(), pub=pubDe(ev(),s), base=pub.filter(passaOrigem);
  if(filtro!=='todas' && !s.momentos.some(m=>m.id===filtro)) filtro='todas';
  const og=document.getElementById('galOrigem');
  if(og) og.innerHTML=ORIGENS.map(([k,l])=>{const n=k==='todas'?pub.length:pub.filter(f=>f.origem===k).length;
    return `<button class="${filtroOrigem===k?'on':''}" onclick="setOrigem('${k}')">${l} <b>${n}</b></button>`}).join('');
  document.getElementById('filters').innerHTML=
    `<button class="chip ${filtro==='todas'?'on':''}" onclick="setFiltro('todas')">Todos os momentos<b>${base.length}</b></button>`+
    s.momentos.map(m=>{const n=base.filter(x=>x.fase===m.id).length;
      return n||filtro===m.id?`<button class="chip ${filtro===m.id?'on':''}" onclick="setFiltro('${m.id}')">${esc(m.n)}<b>${n}</b></button>`:''}).join('');
}
function setOrigem(o){filtroOrigem=o; filtroPessoa=null; renderFiltros(); renderParticipantes(); renderGaleria()}
function listaGaleria(){return pubDe(ev(),sub()).filter(f=>passaOrigem(f)&&(filtro==='todas'||f.fase===filtro)&&(!filtroPessoa||f.autor===filtroPessoa))}
function renderGaleria(){
  const s=sub(), lista=listaGaleria();
  const quem=filtroPessoa?' de '+filtroPessoa:filtroOrigem==='fotografo'?' do álbum oficial':filtroOrigem==='participante'?' enviados por convidados':'';
  document.getElementById('galCount').textContent=
    filtro==='todas' ? lista.length+(lista.length===1?' ficheiro':' ficheiros')+quem+' · '+s.momentos.length+' momentos'
                     : lista.length+(lista.length===1?' ficheiro':' ficheiros')+quem+' em “'+fase(filtro).n+'”';
  document.getElementById('gal').innerHTML = lista.length
    ? lista.map(tile).join('')
    : '<div class="empty" style="grid-column:1/-1">Ainda não há nada publicado aqui.</div>';
}
function tile(f){
  const s=sub();
  return `<figure class="${f.vid?'vid':''}" onclick="abrirLb('${f.id}')">
    ${midia(f, esc(fase(f.fase,s).n))}
    <div class="tag"><span>${esc(fase(f.fase,s).n)}</span><span>${f.origem==='fotografo'?'oficial':esc(f.autor.split(' ')[0])}</span></div>
  </figure>`;
}

/* pessoas que enviaram fotos (só no separador "Convidados") */
function renderParticipantes(){
  const el=document.getElementById('people'); if(!el) return;
  const parts=pubDe(ev(),sub()).filter(f=>f.origem==='participante');
  const porPessoa={};
  parts.forEach(f=>{porPessoa[f.autor]=(porPessoa[f.autor]||0)+1});
  const nomes=Object.keys(porPessoa).sort((a,b)=>porPessoa[b]-porPessoa[a]);
  if(filtroPessoa && !porPessoa[filtroPessoa]) filtroPessoa=null;
  renderParticipantes.nomes=nomes;
  el.style.display=filtroOrigem==='participante'&&nomes.length?'':'none';
  el.innerHTML=`<button class="person ${!filtroPessoa?'on':''}" onclick="setPessoa(-1)">
       <span class="av" style="background:#1B1917">${parts.length}</span><b>Todos</b></button>`+
    nomes.map((n,i)=>`<button class="person ${filtroPessoa===n?'on':''}" onclick="setPessoa(${i})">
       <span class="av" style="background:${cor(n)}">${esc(ini(n))}</span><b>${esc(n)}</b> <span>${porPessoa[n]}</span></button>`).join('');
}
function setPessoa(i){filtroPessoa=i<0?null:renderParticipantes.nomes[i]; renderParticipantes(); renderGaleria()}

function renderMissoes(){
  const e=ev(), s=sub(), lista=fotosDe(e,s);
  document.getElementById('missions').innerHTML = s.missoes.length ? s.missoes.map(m=>{
    const n=lista.filter(f=>f.missao===m.id).length;
    return `<div class="mission"><div class="ic">${esc(m.ic)}</div>
      <div><div style="font-weight:500">${esc(m.t)}</div><div class="tiny muted">entra em “${esc(fase(m.f,s).n)}”</div></div>
      <div class="c">${n} ${n===1?'envio':'envios'}</div></div>`}).join('')
    : '<div class="empty small">Sem missões nesta parte do evento.</div>';
}
function renderVotos(){
  const s=sub();
  document.getElementById('vows').innerHTML = s.votos.length ? s.votos.map(v=>
    `<div class="vow"><q>“${esc(v.q)}”</q><div class="tiny muted">${esc(v.a)}</div></div>`).join('')
    : '<div class="tiny muted">Ainda ninguém escreveu. Sê o primeiro.</div>';
}
function addVow(){if(NUVEM) return emNuvem.addVow(...arguments);
  const q=document.getElementById('vowTxt').value.trim(), a=document.getElementById('vowName').value.trim();
  if(!q){toast('Escreve a tua mensagem primeiro.');return}
  sub().votos.unshift({q, a:a||'Convidado'}); guardar();
  document.getElementById('vowTxt').value=''; document.getElementById('vowName').value='';
  renderVotos(); toast('Mensagem publicada no mural.');
}

/* ===================== ENVIO (CONVIDADO / FOTÓGRAFO) ===================== */
function cabecalhoParte(id){
  const e=ev(), s=sub();
  document.getElementById(id).innerHTML=`${TIPOS[s.tipo].ic} <b>${esc(e.titulo)}</b> · ${esc(s.titulo)} · ${dataCurta(s.data)}`;
}
/* Só mostra as partes a que este link dá acesso. */
function partesSelect(sel,wrap,prefixo){
  const e=ev(), ps=partesDoAcesso(e,acessoAtual), el=document.getElementById(sel);
  document.getElementById(wrap).style.display=ps.length>1?'':'none';
  el.innerHTML=ps.map(x=>`<option value="${x.id}">${TIPOS[x.tipo].ic} ${esc(x.titulo)} · ${dataCurta(x.data)}</option>`).join('');
  el.value=atual.sub;
  el.onchange=()=>ir(prefixo+'/'+acessoAtual.token+'/'+el.value);
}
function optsMomentos(s){return s.momentos.map(m=>`<option value="${m.id}">${esc(m.h)} — ${esc(m.n)}</option>`).join('')}
function renderConvidado(){
  const e=ev(), s=sub();
  cabecalhoParte('upEv'); partesSelect('upSub','upSubW','c');
  const f=document.getElementById('upFase'); f.innerHTML=optsMomentos(s); f.value=s.momento;
  document.getElementById('upMissao').innerHTML='<option value="">— nenhuma —</option>'+
    s.missoes.map(m=>`<option value="${m.id}">${esc(m.ic)} ${esc(m.t)}</option>`).join('');
  document.getElementById('sugFase').textContent=fase(s.momento).n;
  document.getElementById('upBtn').textContent='Enviar para: '+s.titulo;
  document.getElementById('upVer').dataset.go='evento/'+e.id+'/'+s.id;
  document.querySelectorAll('#upOrigem button').forEach(b=>b.classList.toggle('on',b.dataset.et===etiquetaEnvio));
  const fechado=e.perm&&e.perm.envios===false;
  document.getElementById('upFechado').hidden=!fechado;
  document.getElementById('upForm').hidden=fechado;
}
function escolherOrigem(et){ etiquetaEnvio=et; document.querySelectorAll('#upOrigem button').forEach(b=>b.classList.toggle('on',b.dataset.et===et)); }
function renderFotografo(){
  const s=sub(), a=acessoAtual, nome=document.getElementById('fName');
  cabecalhoParte('fEv'); partesSelect('fSub','fSubW','f');
  if(nome.dataset.acesso!==a.id){ nome.value=a.nome; nome.dataset.acesso=a.id; }
  const f=document.getElementById('fFase'); f.innerHTML=optsMomentos(s); f.value=s.momento;
  const n=fotos.filter(x=>x.acesso===a.id&&x.sub===s.id).length;
  document.getElementById('fMeus').textContent=n?'Já publicaste '+n+' ficheiro(s) nesta parte.':'';
}

let buffer={conv:[], foto:[]};
function limparBuffers(){
  buffer={conv:[], foto:[]};
  ['upPrev','fPrev'].forEach(id=>{const el=document.getElementById(id); if(el) el.innerHTML=''});
}
function lerFicheiros(input, destino, prevEl){
  const fs=[...input.files].slice(0,20); if(!fs.length)return;
  buffer[destino]=[];
  let feitos=0;
  const done=()=>{ if(++feitos===fs.length) pintarPrev(destino,prevEl); };
  fs.forEach((file,i)=>{
    if(file.type.startsWith('video')){
      buffer[destino].push({src:arte(140+i,'vídeo',false), vid:true, file});
      done();
    }else{
      const r=new FileReader();
      r.onload=()=>{ buffer[destino].push({src:r.result, vid:false, file}); done(); };
      r.onerror=done;
      r.readAsDataURL(file);
    }
  });
}
function pintarPrev(destino,prevEl){
  document.getElementById(prevEl).innerHTML=buffer[destino].map(f=>`<img src="${f.src}" alt="">`).join('');
}
document.getElementById('upFile').addEventListener('change',e=>lerFicheiros(e.target,'conv','upPrev'));
document.getElementById('fFile').addEventListener('change',e=>lerFicheiros(e.target,'foto','fPrev'));

function registar(itens,dados){
  const e=ev(), s=sub();
  itens.forEach(it=>{ seq++; fotos.push(Object.assign({id:'f'+seq, ev:e.id, sub:s.id, vid:it.vid, src:it.src, hora:fase(dados.fase).h, missao:null, acesso:acessoAtual?acessoAtual.id:null}, dados)); });
  if(acessoAtual) acessoAtual.usos=(acessoAtual.usos||0)+1;
  guardar();
}
function enviarConvidado(){if(!aceitouTermos()) return; if(NUVEM) return emNuvem.enviarConvidado(...arguments);
  if(!buffer.conv.length){toast('Escolhe primeiro as fotos ou vídeos.');return}
  const nome=document.getElementById('upName').value.trim()||'Convidado';
  const f=document.getElementById('upFase').value, m=document.getElementById('upMissao').value;
  const n=buffer.conv.length;
  registar(buffer.conv,{fase:f, autor:nome, origem:'participante', estado:'pendente', missao:m||null, etiqueta:etiquetaEnvio, criado:new Date().toISOString()});
  buffer.conv=[]; document.getElementById('upPrev').innerHTML=''; document.getElementById('upFile').value='';
  toast(n+(n===1?' ficheiro enviado':' ficheiros enviados')+' — aguardam aprovação.');
}
function enviarFotografo(){if(NUVEM) return emNuvem.enviarFotografo(...arguments);
  if(!buffer.foto.length){toast('Escolhe primeiro as fotos da sessão.');return}
  const nome=document.getElementById('fName').value.trim()||'Fotógrafo';
  const f=document.getElementById('fFase').value, n=buffer.foto.length;
  registar(buffer.foto,{fase:f, autor:nome, origem:'fotografo', estado:'publicada'});
  buffer.foto=[]; document.getElementById('fPrev').innerHTML=''; document.getElementById('fFile').value='';
  filtro=f; renderFotografo();
  toast(n+(n===1?' ficheiro publicado':' ficheiros publicados')+' em “'+fase(f).n+'”.');
}

/* ===================== ADMIN ===================== */
function renderAdmin(){
  if(NUVEM && !souAdmin){ document.getElementById('admRoot').innerHTML=htmlLogin(); return; }
  const emEvento=admModo==='evento' && ev();
  renderPainel(emEvento);
  if(emEvento) desenharQRs();
}
function setAdmAba(k){
  admAba=k;
  if(k==='novo' && !rascunho) rascunho=novoRascunho();
  ir(k==='dashboard'?'admin':'admin/'+k);
}
function setEvAba(k){admEvAba=k; renderAdmin()}
function stats(lista){
  return `<div class="stats">${lista.map(([v,l])=>`<div class="card stat"><b>${v}</b><span class="eyebrow">${l}</span></div>`).join('')}</div>`;
}
function tabs(itens,actual,fn){
  return `<div class="tabs">${itens.map(([k,l])=>`<button class="${actual===k?'on':''}" onclick="${fn}('${k}')">${l}</button>`).join('')}</div>`;
}

/* ----- lista de eventos ----- */
function htmlListaEventos(){
  return CATEGORIAS.map(c=>{
    const evs=EVENTOS.filter(e=>e.cat===c.id);
    return `<div class="cat-sec">
      <div class="cat-head"><span class="cat-ic">${c.ic}</span>
        <div><h3>${c.n}</h3><div class="tiny muted">${evs.length} ${evs.length===1?'evento':'eventos'} · ${c.d}</div></div>
        <button class="btn ghost sm" style="margin-left:auto" onclick="abrirNovo(null,null,'${c.id}')">+ Criar</button></div>
      ${evs.length ? evs.map(linhaEvento).join('') : '<div class="empty small">Ainda sem eventos nesta categoria.</div>'}
    </div>`}).join('');
}
function linhaEvento(e){
  const est=estadoEv(e), pend=fotos.filter(f=>f.ev===e.id&&f.estado==='pendente').length;
  return `<div class="card adm-ev">
    <div class="adm-ev-img">${imgTag(capaDe(e),'')}</div>
    <div class="adm-ev-body">
      <div class="adm-ev-tit"><b class="serif">${esc(e.titulo)}</b><span class="estado ${est}">${ESTADOS[est]}</span>${pend?`<span class="pend">${pend} por aprovar</span>`:''}</div>
      <div class="tiny muted">${esc(e.local||'sem local')} · ${intervaloDatas(e)} · ${(e.acessos||[]).filter(a=>a.perfil==='convidado').length} QR de convidados · ${(e.acessos||[]).filter(a=>a.perfil==='fotografo').length} fotógrafos</div>
      <div class="mini-chips">${e.subs.map(s=>`<button class="mini" data-go="admin/${e.id}/${s.id}">${TIPOS[s.tipo].ic} ${esc(s.titulo)} · ${dataCurta(s.data)}</button>`).join('')}</div>
    </div>
    <div class="adm-ev-acts">
      <button class="btn sm" data-go="admin/${e.id}">Gerir</button>
      <button class="btn ghost sm" data-go="evento/${e.id}">Ver página</button>
    </div>
  </div>`;
}

/* ----- novo evento ----- */
function parteNova(tipo,modelo){const t=TIPOS[tipo]; return {tipo, modelo:modelo||t.modelos[0].id, titulo:t.n, data:''}}
function novoRascunho(tipo,modelo,cat){
  tipo=tipo || (cat && Object.keys(TIPOS).find(k=>TIPOS[k].cat===cat)) || 'casamento';
  return {titulo:'', cat:cat||TIPOS[tipo].cat, local:'', cor:'', fonte:'', partes:[parteNova(tipo,modelo)]};
}
function abrirNovo(tipo,modelo,cat){ rascunho=novoRascunho(tipo,modelo,cat); setAdmAba('novo'); }
function optsTipos(sel){
  return CATEGORIAS.map(c=>`<optgroup label="${c.n}">${Object.keys(TIPOS).filter(k=>TIPOS[k].cat===c.id)
    .map(k=>`<option value="${k}" ${k===sel?'selected':''}>${TIPOS[k].ic} ${TIPOS[k].n}</option>`).join('')}</optgroup>`).join('');
}
function previewProg(m){return `<div class="preview-prog">${m.map(x=>`<span><b>${x.h||x[0]}</b> ${esc(x.n||x[1])}</span>`).join('')}</div>`}
function htmlParteCampos(p,ref){
  const t=TIPOS[p.tipo], mod=t.modelos.find(m=>m.id===p.modelo)||t.modelos[0];
  return `<div class="grid-f">
      <label class="field"><span>Tipo</span><select onchange="mudarTipo(${ref},this.value)">${optsTipos(p.tipo)}</select></label>
      <label class="field"><span>Modelo de programa</span><select onchange="${ref}.modelo=this.value;renderAdmin()">
        ${t.modelos.map(m=>`<option value="${m.id}" ${m.id===mod.id?'selected':''}>${esc(m.n)}</option>`).join('')}</select></label>
      <label class="field"><span>Nome desta parte</span><input value="${esc(p.titulo)}" oninput="${ref}.titulo=this.value"></label>
      <label class="field"><span>Data</span><input type="date" value="${esc(p.data)}" onchange="${ref}.data=this.value"></label>
    </div>
    ${previewProg(mod.m)}
    <div class="tiny muted">Tema visual: ${swatch(TEMAS[t.tema])} ${TEMAS[t.tema].n} · ${mod.m.length} momentos · ${(mod.mis||[]).length} missões de foto</div>`;
}
function mudarTipo(p,v){
  const auto=!p.titulo || p.titulo===TIPOS[p.tipo].n;
  p.tipo=v; p.modelo=TIPOS[v].modelos[0].id; if(auto) p.titulo=TIPOS[v].n;
  renderAdmin();
}
function htmlNovo(){
  if(!rascunho) rascunho=novoRascunho();
  const r=rascunho;
  return `<div class="card" style="padding:20px">
      <h3>1 · O evento</h3>
      <p class="muted small">O evento agrupa todas as suas partes — por exemplo, o lobolo e o casamento do mesmo casal ficam dentro do mesmo evento.</p>
      <div class="grid-f">
        <label class="field"><span>Nome do evento</span><input value="${esc(r.titulo)}" placeholder="Ex.: André & Lúcia" oninput="rascunho.titulo=this.value"></label>
        <label class="field"><span>Categoria</span><select onchange="rascunho.cat=this.value">
          ${CATEGORIAS.map(c=>`<option value="${c.id}" ${c.id===r.cat?'selected':''}>${c.ic} ${c.n}</option>`).join('')}</select></label>
        <label class="field"><span>Local / cidade</span><input value="${esc(r.local)}" placeholder="Ex.: Maputo" oninput="rascunho.local=this.value"></label>
      </div>
      <h3 style="margin-top:10px">Aparência da página</h3>
      <p class="muted small">Cor de destaque e estilo de letra dos títulos na página pública do evento. Pode mudar depois em Informações.</p>
      ${htmlEstiloCampos(r.cor,r.fonte,'rascunho')}
    </div>
    <div class="card" style="padding:20px;margin-top:16px">
      <h3>2 · As partes do evento</h3>
      <p class="muted small">Cada parte tem o seu programa, galeria, QR Codes e tema. Escolhe o tipo e o modelo — depois podes editar cada momento.</p>
      ${r.partes.map((p,i)=>`<div class="parte-ed">
        <div class="parte-head"><span class="cat-ic sm">${TIPOS[p.tipo].ic}</span><b>Parte ${i+1}</b>
          ${r.partes.length>1?`<button class="x-sm" title="Remover parte" onclick="rascunho.partes.splice(${i},1);renderAdmin()">✕</button>`:''}</div>
        ${htmlParteCampos(p,'rascunho.partes['+i+']')}
      </div>`).join('')}
      <button class="btn ghost sm" onclick="addParteRascunho()">+ Adicionar outra parte (ex.: lobolo, copo-d'água…)</button>
    </div>
    <div style="margin-top:18px;display:flex;gap:9px;flex-wrap:wrap">
      <button class="btn" onclick="criarEvento()">Criar evento</button>
      <button class="btn ghost" onclick="rascunho=null;setAdmAba('eventos')">Cancelar</button>
    </div>`;
}
function sugestaoTipo(usados,cat){
  const daCat=Object.keys(TIPOS).filter(k=>TIPOS[k].cat===cat);
  return daCat.find(k=>!usados.includes(k)) || daCat[0] || 'casamento';
}
function addParteRascunho(){
  rascunho.partes.push(parteNova(sugestaoTipo(rascunho.partes.map(p=>p.tipo),rascunho.cat)));
  renderAdmin();
}
function idParte(subs,tipo){let id=tipo, j=2; while(subs.some(s=>s.id===id)) id=tipo+'-'+j++; return id}
function ordenarPartes(e){e.subs.sort((a,b)=>(a.data||'9999').localeCompare(b.data||'9999'))}
function criarEvento(){if(NUVEM) return emNuvem.criarEvento(...arguments);
  const r=rascunho, titulo=r.titulo.trim();
  if(!titulo){toast('Dá um nome ao evento.');return}
  if(r.partes.some(p=>!p.data)){toast('Escolhe a data de cada parte do evento.');return}
  let id=slug(titulo)||'evento', base=id, k=2;
  while(EVENTOS.some(e=>e.id===id)) id=base+'-'+k++;
  const subs=[];
  r.partes.forEach(p=>subs.push(instanciar(p.tipo,p.modelo,{id:idParte(subs,p.tipo), titulo:p.titulo.trim()||TIPOS[p.tipo].n, data:p.data})));
  const e={id, titulo, cat:r.cat, local:r.local.trim(), estado:'auto', capa:null, subs, publico:false, cor:r.cor||'', fonte:r.fonte||''};
  e.acessos=[novoAcesso('convidado','QR geral dos convidados',[]), novoAcesso('fotografo','Fotógrafo principal',[])];
  ordenarPartes(e); EVENTOS.push(e); guardar();
  completarEvento(e); rascunho=null; admAba='eventos'; admEvAba='info';
  ir('admin/'+id+'/'+e.subs[0].id);
  toast('Evento criado. Ajusta o programa de cada parte.');
}

/* ----- tipos e modelos ----- */
function htmlModelos(){
  return `<p class="muted small">Os tipos de evento que a plataforma cobre, por categoria. Cada tipo traz um ou mais modelos de programa
    e um tema visual. Tudo pode ser editado depois de criar o evento.</p>`+
  CATEGORIAS.map(c=>`<div class="cat-sec">
    <div class="cat-head"><span class="cat-ic">${c.ic}</span><div><h3>${c.n}</h3><div class="tiny muted">${c.d}</div></div></div>
    <div class="tipo-grid">${Object.keys(TIPOS).filter(k=>TIPOS[k].cat===c.id).map(k=>{const t=TIPOS[k]; return `<div class="card tipo">
      <div class="tipo-head"><span class="cat-ic sm">${t.ic}</span><b>${t.n}</b><span class="tiny muted" style="margin-left:auto">${swatch(TEMAS[t.tema])} ${TEMAS[t.tema].n}</span></div>
      <p class="tiny muted">${esc(t.d||'')}</p>
      ${t.modelos.map(m=>`<div class="modelo">
        <div class="small" style="font-weight:500">${esc(m.n)}</div>
        ${previewProg(m.m)}
        <button class="btn ghost sm" onclick="abrirNovo('${k}','${m.id}')">Usar este modelo</button>
      </div>`).join('')}
    </div>`}).join('')}</div>
  </div>`).join('');
}

/* ----- gestão de um evento ----- */
function toggleNovaParte(){
  const e=ev();
  novaParte = novaParte ? null : parteNova(sugestaoTipo(e.subs.map(s=>s.tipo),e.cat));
  renderAdmin();
}
function confirmarNovaParte(){if(NUVEM) return emNuvem.confirmarNovaParte(...arguments);
  const e=ev(), p=novaParte;
  if(!p.data){toast('Escolhe a data desta parte.');return}
  const s=instanciar(p.tipo,p.modelo,{id:idParte(e.subs,p.tipo), titulo:p.titulo.trim()||TIPOS[p.tipo].n, data:p.data});
  e.subs.push(s); ordenarPartes(e); novaParte=null; guardar();
  admEvAba='programa'; ir('admin/'+e.id+'/'+s.id);
  toast('Parte “'+s.titulo+'” adicionada.');
}

/* programa */
function htmlProgramaEd(e,s){
  const t=TIPOS[s.tipo], mod=t.modelos.find(m=>m.id===s.modelo);
  const cont=id=>fotos.filter(f=>f.ev===e.id&&f.sub===s.id&&f.fase===id).length;
  return `<div class="ed-top">
      <div class="small">${t.ic} ${t.n} · modelo de origem: <b>${esc(mod?mod.n:'personalizado')}</b></div>
      <label class="small">A acontecer agora: <select class="sel-sm" onchange="setMomentoActual(this.value)">
        ${s.momentos.map(m=>`<option value="${m.id}" ${m.id===s.momento?'selected':''}>${esc(m.n)}</option>`).join('')}</select></label>
      ${t.modelos.length>1?`<div class="ed-apply"><select id="novoModelo">${t.modelos.map(m=>`<option value="${m.id}" ${m.id===s.modelo?'selected':''}>${esc(m.n)}</option>`).join('')}</select>
        <button class="btn ghost sm" onclick="aplicarModelo()">Aplicar modelo</button></div>`:''}
    </div>
    <div class="prog-ed">
      <div class="pe-row pe-h tiny muted"><span>Hora</span><span>Momento</span><span>Local</span><span>Ficheiros</span><span></span></div>
      ${s.momentos.map((m,i)=>`<div class="pe-row">
        <input type="time" value="${esc(m.h)}" onchange="editMomento('${m.id}','h',this.value)">
        <input value="${esc(m.n)}" onchange="editMomento('${m.id}','n',this.value)" aria-label="Nome do momento">
        <input value="${esc(m.l)}" onchange="editMomento('${m.id}','l',this.value)" aria-label="Local">
        <span class="small muted">${cont(m.id)}</span>
        <span class="pe-acts">
          <button title="Subir" onclick="moverMomento(${i},-1)">↑</button>
          <button title="Descer" onclick="moverMomento(${i},1)">↓</button>
          <button title="Remover" onclick="remMomento('${m.id}')">✕</button></span>
      </div>`).join('')}
    </div>
    <button class="btn ghost sm" style="margin-top:12px" onclick="addMomento()">+ Adicionar momento</button>

    <h3 style="margin-top:32px">Missões de foto</h3>
    <p class="muted small">Desafios que aparecem aos convidados e dirigem os envios para os momentos que costumam ficar vazios.</p>
    ${s.missoes.length?s.missoes.map(q=>`<div class="mission"><div class="ic">${esc(q.ic)}</div>
      <div><div style="font-weight:500">${esc(q.t)}</div><div class="tiny muted">entra em “${esc(fase(q.f,s).n)}”</div></div>
      <button class="x-sm" style="margin-left:auto" title="Remover missão" onclick="remMissao('${q.id}')">✕</button></div>`).join('')
      :'<div class="empty small">Sem missões.</div>'}
    <div class="mis-add">
      <input id="misIc" value="📸" maxlength="4" aria-label="Ícone">
      <input id="misT" placeholder="Nova missão, ex.: A mesa dos padrinhos">
      <select id="misF">${s.momentos.map(m=>`<option value="${m.id}">${esc(m.n)}</option>`).join('')}</select>
      <button class="btn sm" onclick="addMissao()">Adicionar</button>
    </div>`;
}
function editMomento(id,k,v){if(NUVEM) return emNuvem.editMomento(...arguments);
  const m=sub().momentos.find(x=>x.id===id); if(!m) return;
  v=v.trim(); if(!v && k!=='l') {renderAdmin(); return}
  m[k]=v;
  if(k==='h') fotos.forEach(f=>{if(f.ev===atual.ev&&f.sub===atual.sub&&f.fase===id) f.hora=v});
  guardar();
}
function moverMomento(i,d){if(NUVEM) return emNuvem.moverMomento(...arguments);
  const a=sub().momentos, j=i+d; if(j<0||j>=a.length) return;
  [a[i],a[j]]=[a[j],a[i]]; guardar(); renderAdmin();
}
function novoIdMomento(s){let n=s.momentos.length+1; while(s.momentos.some(m=>m.id==='m'+n)) n++; return 'm'+n}
function addMomento(){if(NUVEM) return emNuvem.addMomento(...arguments);
  const s=sub(), ult=s.momentos[s.momentos.length-1]||{h:'12:00',l:''};
  s.momentos.push({id:novoIdMomento(s), h:ult.h, n:'Novo momento', l:ult.l, p:null});
  guardar(); renderAdmin();
}
function remMomento(id){if(NUVEM) return emNuvem.remMomento(...arguments);
  const s=sub();
  if(s.momentos.length===1){toast('Cada parte precisa de pelo menos um momento.');return}
  s.momentos=s.momentos.filter(m=>m.id!==id);
  const destino=s.momentos[0];
  let movidas=0;
  fotos.forEach(f=>{if(f.ev===atual.ev&&f.sub===s.id&&f.fase===id){f.fase=destino.id; f.hora=destino.h; movidas++}});
  s.missoes.forEach(q=>{if(q.f===id) q.f=destino.id});
  if(s.momento===id) s.momento=destino.id;
  guardar(); renderAdmin();
  toast('Momento removido.'+(movidas?' '+movidas+' ficheiro(s) passaram para “'+destino.n+'”.':''));
}
function aplicarModelo(){if(NUVEM) return emNuvem.aplicarModelo(...arguments);
  const s=sub(), mid=document.getElementById('novoModelo').value;
  if(!confirmado('modelo:'+mid,'Isto substitui o programa e as missões desta parte.')) return;
  const nova=instanciar(s.tipo,mid), velhos=s.momentos;
  fotos.forEach(f=>{
    if(f.ev!==atual.ev||f.sub!==s.id) return;
    const i=Math.max(0,velhos.findIndex(m=>m.id===f.fase)), m=nova.momentos[Math.min(i,nova.momentos.length-1)];
    f.fase=m.id; f.hora=m.h; f.missao=null;
  });
  Object.assign(s,{momentos:nova.momentos, missoes:nova.missoes, modelo:mid, momento:nova.momentos[0].id});
  guardar(); renderAdmin(); toast('Modelo aplicado.');
}
function addMissao(){if(NUVEM) return emNuvem.addMissao(...arguments);
  const s=sub(), t=document.getElementById('misT').value.trim();
  if(!t){toast('Escreve o texto da missão.');return}
  let n=s.missoes.length+1; while(s.missoes.some(q=>q.id==='q'+n)) n++;
  s.missoes.push({id:'q'+n, ic:document.getElementById('misIc').value.trim()||'📸', t, f:document.getElementById('misF').value});
  guardar(); renderAdmin();
}
function remMissao(id){if(NUVEM) return emNuvem.remMissao(...arguments);
  const s=sub(); s.missoes=s.missoes.filter(q=>q.id!==id);
  fotos.forEach(f=>{if(f.ev===atual.ev&&f.sub===s.id&&f.missao===id) f.missao=null});
  guardar(); renderAdmin();
}

/* acessos (links + QR de convidados e páginas de fotógrafos) */
function servidorRede(){return /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)}
function rotaAcesso(a){return (a.perfil==='convidado'?'c/':'f/')+a.token}
function urlRota(r){return servidorRede() ? location.origin+location.pathname+'#'+r : 'https://galeria.mediacraft.co.mz/'+r}
function urlPagina(e,s){return urlRota(servidorRede()?'evento/'+e.id+'/'+s.id:e.id+'/'+s.id)}
function htmlAcessos(e,s,perfil){
  const conv=perfil==='convidado', lista=(e.acessos||[]).filter(a=>a.perfil===perfil);
  return `<div class="qr-nota small">${servidorRede()
      ? 'Estes links abrem esta demonstração neste servidor — experimenta com o celular ligado à mesma rede.'
      : 'Endereços de produção ilustrativos. Para QR que funcionem no celular, abre o painel pelo endereço de rede do computador (ex.: http://10.x.x.x:8000/#admin).'}</div>
    <h3>${conv?'Links e QR Codes para convidados':'Páginas dos fotógrafos'}</h3>
    <p class="muted small">${conv
      ? 'Cria quantos QR precisares: um único para todos (convite, mesas) ou um por grupo (família da noiva, padrinhos…). O mesmo QR serve para quantas pessoas quiseres. Tudo o que chega por aqui fica pendente de moderação.'
      : 'Cada fotógrafo ou estúdio tem a sua própria página, com link e QR próprios, separada do painel. Publica directamente na galeria e pode descarregar o álbum das partes a que tem acesso.'}</p>
    <div class="card acesso-novo">
      <label class="field"><span>${conv?'Nome deste QR (só a organização vê)':'Nome do fotógrafo / estúdio'}</span>
        <input id="acNome" placeholder="${conv?'Ex.: Mesas da recepção':'Ex.: Studio Lume'}"></label>
      ${e.subs.length>1?`<div class="field"><span>Partes do evento a que dá acesso</span><div class="checks">
        ${e.subs.map(x=>`<label><input type="checkbox" class="acParte" value="${x.id}" checked> ${TIPOS[x.tipo].ic} ${esc(x.titulo)}</label>`).join('')}</div></div>`:''}
      <button class="btn sm" onclick="criarAcesso('${perfil}')">+ ${conv?'Criar QR de convidados':'Criar página de fotógrafo'}</button>
    </div>
    <div class="qr-grid" style="margin-top:18px">${lista.length?lista.map(a=>cartaoAcesso(e,a)).join('')
      :'<div class="empty">Ainda não há nenhum. Cria o primeiro acima.</div>'}</div>
    ${conv?`<h3 style="margin-top:32px">Página pública · ${esc(s.titulo)}</h3>
      <p class="muted small">Só para ver o programa e a galeria — não permite enviar fotos.</p>
      <div class="qr-grid"><div class="card qr-card">
        <div class="eyebrow">Visitantes</div>
        <div class="qr-box" id="qr-pagina"></div>
        <div class="linkbox"><span id="lk-pagina">${esc(urlPagina(e,s))}</span></div>
        <div class="ac-acts"><button class="btn sm" onclick="copiar('lk-pagina')">Copiar link</button>
          <button class="btn ghost sm" onclick="baixarQRUrl(urlPagina(ev(),sub()),'pagina-'+sub().id)">⇩ PNG</button></div>
      </div></div>`:''}`;
}
function cartaoAcesso(e,a){
  const n=fotos.filter(f=>f.acesso===a.id).length, url=urlRota(rotaAcesso(a));
  return `<div class="card qr-card ${a.ativo?'':'off'}">
    <div class="eyebrow">${a.perfil==='convidado'?'Convidados':'Fotógrafo'}${a.ativo?'':' · desactivado'}</div>
    <input class="ac-nome" value="${esc(a.nome)}" onchange="editAcesso('${a.id}','nome',this.value)" aria-label="Nome">
    ${e.subs.length>1?`<div class="checks small">${e.subs.map(x=>`<label><input type="checkbox" ${(!a.partes.length||a.partes.includes(x.id))?'checked':''}
      onchange="toggleParteAcesso('${a.id}','${x.id}',this.checked)"> ${TIPOS[x.tipo].ic} ${esc(x.titulo)}</label>`).join('')}</div>`:''}
    <div class="qr-box" id="qr-${a.id}"></div>
    <div class="linkbox"><span id="lk-${a.id}">${esc(url)}</span></div>
    <div class="tiny muted" style="margin-top:8px">${a.usos||0} ${a.usos===1?'envio':'envios'} · ${n} ${n===1?'ficheiro':'ficheiros'}</div>
    <div class="ac-acts">
      <button class="btn sm" onclick="copiar('lk-${a.id}')">Copiar link</button>
      <button class="btn ghost sm" onclick="baixarQRAcesso('${a.id}')">⇩ PNG</button>
      <a class="btn ghost sm" href="#${rotaAcesso(a)}" target="_blank" rel="noopener">Abrir ↗</a>
      <button class="btn ghost sm" onclick="editAcesso('${a.id}','ativo',${!a.ativo})">${a.ativo?'Desactivar':'Activar'}</button>
      <button class="btn ghost sm danger" onclick="remAcesso('${a.id}')">Remover</button>
    </div>
  </div>`;
}
function acesso(id){return (ev().acessos||[]).find(a=>a.id===id)}
function criarAcesso(perfil){if(NUVEM) return emNuvem.criarAcesso(...arguments);
  const e=ev(), nome=document.getElementById('acNome').value.trim();
  if(!nome){toast(perfil==='convidado'?'Dá um nome a este QR (ex.: Mesas da recepção).':'Escreve o nome do fotógrafo.');return}
  const marc=[...document.querySelectorAll('.acParte:checked')].map(x=>x.value);
  if(e.subs.length>1 && !marc.length){toast('Escolhe pelo menos uma parte do evento.');return}
  let a; do{ a=novoAcesso(perfil,nome,marc.length===e.subs.length?[]:marc); }while(porToken(a.token));
  e.acessos=e.acessos||[]; e.acessos.push(a); guardar(); renderAdmin();
  toast(perfil==='convidado'?'QR de convidados criado.':'Página do fotógrafo criada.');
}
function editAcesso(id,k,v){if(NUVEM) return emNuvem.editAcesso(...arguments);
  const a=acesso(id); if(!a) return;
  if(k==='nome'){ v=String(v).trim(); if(!v){renderAdmin();return} }
  a[k]=v; guardar(); renderAdmin();
  if(k==='ativo') toast(v?'Link activado.':'Link desactivado — deixa de funcionar para quem o tiver.');
}
function toggleParteAcesso(id,sid,on){if(NUVEM) return emNuvem.toggleParteAcesso(...arguments);
  const e=ev(), a=acesso(id); if(!a) return;
  let ps=a.partes.length?a.partes.slice():e.subs.map(s=>s.id);
  ps=on?[...new Set([...ps,sid])]:ps.filter(x=>x!==sid);
  if(!ps.length){toast('Um link precisa de dar acesso a pelo menos uma parte.'); renderAdmin(); return}
  a.partes=ps.length===e.subs.length?[]:ps; guardar(); renderAdmin();
}
function remAcesso(id){if(NUVEM) return emNuvem.remAcesso(...arguments);
  const e=ev(), a=acesso(id); if(!a) return;
  if(!confirmado('acesso:'+id,'Remover “'+a.nome+'”? O link e o QR deixam de funcionar (as fotos ficam).')) return;
  e.acessos=e.acessos.filter(x=>x.id!==id); guardar(); renderAdmin(); toast('Removido.');
}
function desenharQR(el,url,tam){
  if(typeof QRCode==='undefined'){ el.innerHTML='<div class="tiny muted" style="padding:10px">Biblioteca de QR indisponível (sem internet?)</div>'; return; }
  el.innerHTML='';
  new QRCode(el,{text:url,width:tam||150,height:tam||150,colorDark:'#1B1917',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
}
function desenharQRs(){
  const e=ev(), s=sub();
  (e.acessos||[]).forEach(a=>{const el=document.getElementById('qr-'+a.id); if(el) desenharQR(el,urlRota(rotaAcesso(a)))});
  const p=document.getElementById('qr-pagina'); if(p) desenharQR(p,urlPagina(e,s));
}
function baixarQRUrl(url,nome){
  if(typeof QRCode==='undefined'){toast('Biblioteca de QR indisponível.');return}
  const tmp=document.createElement('div'); desenharQR(tmp,url,800);
  const cv=tmp.querySelector('canvas');
  if(cv && cv.toBlob) cv.toBlob(b=>{salvarBlob(b,slug(ev().titulo+'-qr-'+nome)+'.png'); toast('QR descarregado.')});
  else toast('Não foi possível gerar o PNG neste navegador.');
}
function baixarQRAcesso(id){const a=acesso(id); if(a) baixarQRUrl(urlRota(rotaAcesso(a)), a.nome)}

/* moderação */
function htmlModeracao(e,s){
  const pends=fotosDe(e,s).filter(f=>f.estado==='pendente');
  return `<h3>Por aprovar</h3>
    <p class="muted small">Confirma o momento de cada ficheiro antes de publicar — é isto que mantém a galeria arrumada.</p>
    ${pends.length ? pends.map(f=>{const q=f.missao&&s.missoes.find(x=>x.id===f.missao), ac=f.acesso&&(e.acessos||[]).find(x=>x.id===f.acesso); return `
    <div class="mod">
      ${midia(f,'')}
      <div>
        <div style="font-weight:500">${esc(f.autor)}</div>
        <div class="tiny muted">enviado via ${ac?'“'+esc(ac.nome)+'”':'QR de convidados'}${q?' · missão: '+esc(q.ic)+' '+esc(q.t):''}</div>
        <div class="acts">
          <select onchange="mudarFase('${f.id}',this.value)">
            ${s.momentos.map(x=>`<option value="${x.id}" ${x.id===f.fase?'selected':''}>${esc(x.n)}</option>`).join('')}
          </select>
          <button class="btn sm" onclick="aprovar('${f.id}')">Publicar</button>
          <button class="btn ghost sm" onclick="rejeitar('${f.id}')">Rejeitar</button>
        </div>
      </div>
    </div>`}).join('') : '<div class="empty">Nada por aprovar. Galeria em dia.</div>'}
    ${(s.votosPend||[]).length?`<h3 style="margin-top:28px">Mensagens do mural por aprovar</h3>${s.votosPend.map(v=>`<div class="vow">
      <q>“${esc(v.q)}”</q><div class="tiny muted">${esc(v.a)}</div>
      <div style="display:flex;gap:7px;margin-top:8px"><button class="btn sm" onclick="moderarVoto('${v.id}','publicado')">Publicar</button>
      <button class="btn ghost sm" onclick="moderarVoto('${v.id}','rejeitado')">Rejeitar</button></div></div>`).join('')}`:''}`;
}
function mudarFase(id,v){if(NUVEM) return emNuvem.mudarFase(...arguments);const f=fotos.find(x=>x.id===id); if(!f)return; f.fase=v; f.hora=fase(v).h; guardar()}
function aprovar(id){if(NUVEM) return emNuvem.aprovar(...arguments);const f=fotos.find(x=>x.id===id); f.estado='publicada'; guardar(); renderAdmin(); toast('Publicado em “'+fase(f.fase).n+'”.')}
function rejeitar(id){if(NUVEM) return emNuvem.rejeitar(...arguments);const f=fotos.find(x=>x.id===id); if(f) f.estado='rejeitada'; guardar(); renderAdmin(); toast('Ficheiro rejeitado.')}

/* álbum */
function htmlAlbum(e,s){
  const pub=pubDe(e,s);
  const max=Math.max(1,...s.momentos.map(m=>pub.filter(x=>x.fase===m.id).length));
  return `<h3>Distribuição por momento</h3>
    <p class="muted small">Quantos ficheiros publicados em cada ponto do programa. Os downloads geram ZIP a sério, organizados por momento.</p>
    <div style="margin-top:14px">${s.momentos.map(m=>{const n=pub.filter(x=>x.fase===m.id).length; return `<div class="fase-row">
      <div style="width:150px" class="small">${esc(m.n)}</div>
      <div class="bar"><i style="width:${n/max*100}%"></i></div>
      <div class="small muted" style="width:40px;text-align:right">${n}</div>
      <button class="btn ghost sm" title="Descarregar este momento" onclick="baixarMomento('${m.id}')">⇩</button>
    </div>`}).join('')}</div>
    <div style="margin-top:20px; display:flex; gap:9px; flex-wrap:wrap">
      <button class="btn sm" onclick="baixarAlbum()">⇩ Álbum completo (ZIP)</button>
      <button class="btn ghost sm" onclick="baixarAlbum(true)">⇩ Só participantes (ZIP)</button>
    </div>`;
}

/* definições */
function htmlDefinicoes(e,s){
  return `<div class="two">
    <div class="card" style="padding:20px">
      <h3>Evento</h3>
      <label class="field"><span>Nome</span><input value="${esc(e.titulo)}" onchange="editEv('titulo',this.value)"></label>
      <label class="field"><span>Local / cidade</span><input value="${esc(e.local)}" onchange="editEv('local',this.value)"></label>
      <label class="field"><span>Categoria</span><select onchange="editEv('cat',this.value)">
        ${CATEGORIAS.map(c=>`<option value="${c.id}" ${c.id===e.cat?'selected':''}>${c.ic} ${c.n}</option>`).join('')}</select></label>
      <label class="field"><span>Estado</span><select onchange="editEv('estado',this.value)">
        ${[['auto','Automático (pelas datas)'],['preparacao','Em preparação'],['decorrer','A decorrer'],['encerrado','Encerrado']]
          .map(([k,l])=>`<option value="${k}" ${k===(e.estado||'auto')?'selected':''}>${l}</option>`).join('')}</select></label>
      <button class="btn ghost sm danger" onclick="apagarEvento()">Apagar evento</button>
    </div>
    <div class="card" style="padding:20px">
      <h3>Esta parte · ${esc(s.titulo)}</h3>
      <label class="field"><span>Nome da parte</span><input value="${esc(s.titulo)}" onchange="editSub('titulo',this.value)"></label>
      <label class="field"><span>Data</span><input type="date" value="${esc(s.data)}" onchange="editSub('data',this.value)"></label>
      <label class="field"><span>Tema visual da página</span><select onchange="editSub('tema',this.value)">
        ${Object.keys(TEMAS).map(k=>`<option value="${k}" ${k===s.tema?'selected':''}>${TEMAS[k].n}</option>`).join('')}</select></label>
      <div class="tema-prev">${['gold','terra','sand','ivory'].map(k=>`<i style="background:${temaDe(s)[k]}"></i>`).join('')}</div>
      ${e.subs.length>1?'<button class="btn ghost sm danger" onclick="apagarParte()">Remover esta parte</button>':''}
    </div>
  </div>`;
}
function editEv(k,v){if(NUVEM) return emNuvem.editEv(...arguments);
  const e=ev(); v=v.trim(); if(k==='titulo'&&!v){renderAdmin();return}
  e[k]=v; guardar(); renderAdmin();
}
function editSub(k,v){if(NUVEM) return emNuvem.editSub(...arguments);
  const e=ev(), s=sub(); v=v.trim(); if(k==='titulo'&&!v){renderAdmin();return}
  s[k]=v; if(k==='data') ordenarPartes(e); guardar(); renderAdmin();
}
function apagarEvento(){if(NUVEM) return emNuvem.apagarEvento(...arguments);
  const e=ev();
  if(!confirmado('apagar:'+e.id,'Isto apaga “'+e.titulo+'” e todas as suas fotografias.')) return;
  EVENTOS=EVENTOS.filter(x=>x.id!==e.id); fotos=fotos.filter(f=>f.ev!==e.id);
  atual={ev:null, sub:null}; guardar(); ir('admin'); toast('Evento apagado.');
}
function apagarParte(){if(NUVEM) return emNuvem.apagarParte(...arguments);
  const e=ev(), s=sub();
  if(!confirmado('parte:'+s.id,'Isto remove “'+s.titulo+'” e as suas fotografias.')) return;
  e.subs=e.subs.filter(x=>x.id!==s.id); fotos=fotos.filter(f=>!(f.ev===e.id&&f.sub===s.id));
  (e.acessos||[]).forEach(a=>{ a.partes=a.partes.filter(x=>x!==s.id); });
  guardar(); ir('admin/'+e.id); toast('Parte removida.');
}

/* ===================== DOWNLOADS ===================== */
function salvarBlob(blob,nome){
  const u=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=u; a.download=nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),5000);
}
async function obter(src){
  for(const u of [...new Set([hi(src),src])]){
    try{ const r=await fetch(u); if(r.ok) return await r.blob(); }catch(e){}
  }
  throw new Error('falhou');
}
function extensao(b){const t=(b.type||'').split('/')[1]||'jpg'; return t==='jpeg'?'jpg':t==='svg+xml'?'svg':t}
async function baixarFoto(id){
  const f=fotos.find(x=>x.id===id); if(!f) return;
  const e=EVENTOS.find(x=>x.id===f.ev), s=e&&e.subs.find(x=>x.id===f.sub);
  toast('A preparar o download…');
  try{
    const b=await obter(f.src);
    salvarBlob(b, slug([e?e.titulo:'', s?s.titulo:'', fase(f.fase,s).n, f.id].join('-'))+'.'+extensao(b));
    toast('Download iniciado.');
  }catch(err){ toast('Não foi possível descarregar esta imagem.'); }
}
async function baixarZip(lista,nome,s){
  if(typeof JSZip==='undefined'){toast('O gerador de ZIP não carregou (sem internet?).');return}
  if(!lista.length){toast('Não há ficheiros publicados para descarregar.');return}
  const zip=new JSZip(), cont={}; let falhas=0;
  for(let i=0;i<lista.length;i++){
    toast('A preparar ZIP… '+(i+1)+'/'+lista.length);
    const f=lista[i], idx=s.momentos.findIndex(m=>m.id===f.fase), pasta=pad(idx+1)+'-'+slug(fase(f.fase,s).n);
    try{
      const b=await obter(f.src); cont[pasta]=(cont[pasta]||0)+1;
      zip.folder(pasta).file(pasta+'-'+pad(cont[pasta])+'-'+slug(f.autor)+'.'+extensao(b), b);
    }catch(err){ falhas++; }
  }
  toast('A comprimir…');
  const blob=await zip.generateAsync({type:'blob'});
  salvarBlob(blob, nome+'.zip');
  toast('ZIP pronto: '+(lista.length-falhas)+' ficheiros'+(falhas?' ('+falhas+' falharam)':'')+'.');
}
function nomeZip(x){return slug(ev().titulo+'-'+sub().titulo+'-'+x)}
function baixarSeleccao(){baixarZip(listaGaleria(), nomeZip(filtro==='todas'?'album':fase(filtro).n), sub())}
function baixarAlbum(soPart){
  let l=pubDe(ev(),sub()); if(soPart) l=l.filter(f=>f.origem==='participante');
  baixarZip(l, nomeZip(soPart?'participantes':'album'), sub());
}
function baixarMomento(id){baixarZip(pubDe(ev(),sub()).filter(f=>f.fase===id), nomeZip(fase(id).n), sub())}

/* ===================== LIGHTBOX, TOAST, UTILS ===================== */
/* abrirLb, lbIr e fecharLb (visualizador) estão em evento.js */
document.addEventListener('keydown',e=>{if(e.key==='Escape')fecharLb()});
let tt;
function toast(m){const t=document.getElementById('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove('on'),2800)}
function copiar(id){
  const txt=document.getElementById(id).textContent;
  try{navigator.clipboard.writeText(txt).then(()=>toast('Link copiado.'),()=>toast(txt))}catch(e){toast(txt)}
}
function setFiltro(f,irGaleria){filtro=f; if(irGaleria){filtroOrigem='todas'; filtroPessoa=null; renderParticipantes();} renderFiltros(); renderGaleria(); if(irGaleria) scrollToId('galeria')}
function scrollToId(id){if(vistaActual==='evento'&&SECCOES_EV.includes(id)) return irSeccao(id); document.getElementById(id).scrollIntoView({behavior:'smooth',block:'start'})}

/* ===================== ARRANQUE ===================== */
/* ===================== COMUM AOS DOIS MODOS ===================== */
function val(id){const el=document.getElementById(id); return el?el.value.trim():''}
function midia(f,alt){
  return f.vid && f.path
    ? `<video src="${esc(f.src)}#t=0.1" muted playsinline preload="metadata"></video>`
    : imgTag(f.src,alt);
}
function setMomentoActual(id){
  const s=sub(); if(!s) return;
  if(NUVEM) return naNuvem(()=>nv.upd('partes',s.uid,{momento_actual_id:id}),'Momento actual: '+fase(id).n);
  s.momento=id; filtro=id; guardar(); renderTudo(); toast('Momento actual: '+fase(id).n);
}
function moderarVoto(id,estado){
  if(NUVEM) return naNuvem(()=>nv.upd('votos',id,{estado}), estado==='publicado'?'Mensagem publicada no mural.':'Mensagem rejeitada.');
}

/* ===================== LOGIN DA ORGANIZAÇÃO (servidor) ===================== */
function htmlLogin(){
  return `<div class="card login">
    <div class="eyebrow">Área da organização</div>
    <h2 style="margin-top:8px">Entrar</h2>
    <p class="muted small">Usa o email e a palavra-passe do utilizador de organização criado no Supabase.</p>
    <label class="field"><span>Email</span><input id="lgEmail" type="email" autocomplete="username"></label>
    <label class="field"><span>Palavra-passe</span><input id="lgSenha" type="password" autocomplete="current-password"
      onkeydown="if(event.key==='Enter')entrar()"></label>
    <button class="btn" style="width:100%" onclick="entrar()">Entrar</button>
  </div>`;
}
async function entrar(){
  const email=val('lgEmail'), senha=document.getElementById('lgSenha').value;
  if(!email||!senha){toast('Preenche o email e a palavra-passe.');return}
  toast('A entrar…');
  try{ await nvEntrar(email,senha); await nvCarregar(); toast('Sessão iniciada.'); ir(location.hash.slice(1)||'admin'); }
  catch(e){ toast('Não foi possível entrar: '+e.message); }
}
async function sair(){ await nvSair(); await nvCarregar(); ir('eventos'); toast('Sessão terminada.'); }

/* ===================== ACÇÕES NO SERVIDOR ===================== */
const COL_EV={titulo:'titulo', local:'local', cat:'categoria_id', estado:'estado'};
const COL_SUB={titulo:'titulo', data:'data', tema:'tema_id'};
const COL_MOM={h:'hora', n:'nome', l:'local'};
function idModelo(tipo,codigo){
  const id=MODELOS_ID[tipo+':'+codigo];
  if(!id) throw new Error('O modelo "'+codigo+'" não existe no servidor. Corre o catálogo (supabase/) outra vez.');
  return id;
}
function apagarFicheirosStorage(lista){
  const paths=lista.map(f=>f.path).filter(Boolean);
  if(paths.length) NUVEM.storage.from('ficheiros').remove(paths).catch(()=>{});
}
function limparEnvio(conv){
  buffer[conv?'conv':'foto']=[];
  document.getElementById(conv?'upPrev':'fPrev').innerHTML='';
  document.getElementById(conv?'upFile':'fFile').value='';
}

const emNuvem={
  addVow(){
    const s=sub(), q=val('vowTxt'), a=val('vowName');
    if(!q){toast('Escreve a tua mensagem primeiro.');return}
    return naNuvem(()=>nv.ins('votos',{parte_id:s.uid, autor_nome:a||null, mensagem:q}),
      'Mensagem enviada — aparece no mural depois de aprovada.')
      .then(ok=>{ if(ok){ document.getElementById('vowTxt').value=''; document.getElementById('vowName').value=''; } });
  },
  enviarConvidado(){ return emNuvem.enviar(true); },
  enviarFotografo(){ return emNuvem.enviar(false); },
  async enviar(conv){
    const itens=conv?buffer.conv:buffer.foto;
    if(!itens.length){toast(conv?'Escolhe primeiro as fotos ou vídeos.':'Escolhe primeiro as fotos da sessão.');return}
    const nome=val(conv?'upName':'fName')||(conv?'Convidado':acessoAtual.nome);
    const momento=document.getElementById(conv?'upFase':'fFase').value;
    const missao=conv?document.getElementById('upMissao').value:null;
    const n=await naNuvem(()=>nvEnviar(acessoAtual,sub(),momento,missao,nome,itens,conv?etiquetaEnvio:'fotografo'),
      n=>conv ? n+(n===1?' ficheiro enviado':' ficheiros enviados')+' — aguardam aprovação da organização.'
              : n+(n===1?' ficheiro publicado':' ficheiros publicados')+' em “'+fase(momento).n+'”.');
    if(n) limparEnvio(conv);
  },

  async criarEvento(){
    const r=rascunho, titulo=r.titulo.trim();
    if(!titulo){toast('Dá um nome ao evento.');return}
    if(r.partes.some(p=>!p.data)){toast('Escolhe a data de cada parte do evento.');return}
    const uid=await naNuvem(async()=>{
      const id=await nv.rpc('criar_evento',{p_slug:slug(titulo)||'evento', p_titulo:titulo, p_categoria:r.cat,
        p_local:r.local, p_partes:r.partes.map(p=>({modelo_id:idModelo(p.tipo,p.modelo), titulo:p.titulo.trim(), data:p.data}))});
      if(r.cor||r.fonte) await nv.upd('eventos',id,{cor:r.cor||null, fonte:r.fonte||null});
      return id;
    }, 'Evento criado. Ajusta o programa de cada parte.');
    const e=uid && EVENTOS.find(x=>x.uid===uid);
    if(e){ rascunho=null; admAba='eventos'; admEvAba='info'; ir('admin/'+e.id+'/'+e.subs[0].id); }
  },
  async confirmarNovaParte(){
    const e=ev(), p=novaParte;
    if(!p.data){toast('Escolhe a data desta parte.');return}
    const uid=await naNuvem(()=>nv.rpc('criar_parte_de_modelo',{p_evento_id:e.uid, p_modelo_id:idModelo(p.tipo,p.modelo),
      p_titulo:p.titulo.trim(), p_data:p.data, p_slug:null}),'Parte “'+(p.titulo||TIPOS[p.tipo].n)+'” adicionada.');
    const x=uid && PARTE_POR_UID[uid];
    if(x){ novaParte=null; admEvAba='programa'; ir('admin/'+x.e.id+'/'+x.s.id); }
  },

  editMomento(id,k,v){
    v=String(v).trim(); if(!v && k!=='l'){renderAdmin();return}
    return naNuvem(()=>nv.upd('momentos',id,{[COL_MOM[k]]:v||null}),'Guardado.');
  },
  moverMomento(i,d){
    const m=sub().momentos[i]; if(!m) return;
    return naNuvem(()=>nv.rpc('mover_momento',{p_momento_id:m.id, p_delta:d}));
  },
  addMomento(){
    const s=sub(), ult=s.momentos[s.momentos.length-1]||{};
    const ordem=Math.max(0,...s.momentos.map(m=>m.ordem||0))+1;
    return naNuvem(()=>nv.ins('momentos',{parte_id:s.uid, ordem, hora:ult.h||null, nome:'Novo momento', local:ult.l||null}),'Momento adicionado.');
  },
  remMomento(id){
    if(sub().momentos.length===1){toast('Cada parte precisa de pelo menos um momento.');return}
    return naNuvem(()=>nv.rpc('remover_momento',{p_momento_id:id}),'Momento removido. As fotos passaram para o primeiro momento.');
  },
  aplicarModelo(){
    const s=sub(), cod=document.getElementById('novoModelo').value;
    if(!confirmado('modelo:'+cod,'Isto substitui o programa e as missões desta parte.')) return;
    return naNuvem(()=>nv.rpc('aplicar_modelo',{p_parte_id:s.uid, p_modelo_id:idModelo(s.tipo,cod)}),'Modelo aplicado.');
  },
  addMissao(){
    const s=sub(), t=val('misT');
    if(!t){toast('Escreve o texto da missão.');return}
    return naNuvem(()=>nv.ins('missoes',{parte_id:s.uid, momento_id:val('misF')||null, ordem:s.missoes.length+1,
      icone:val('misIc')||'📸', titulo:t}),'Missão adicionada.');
  },
  remMissao(id){ return naNuvem(()=>nv.del('missoes',id),'Missão removida.'); },

  criarAcesso(perfil){
    const e=ev(), nome=val('acNome');
    if(!nome){toast(perfil==='convidado'?'Dá um nome a este QR (ex.: Mesas da recepção).':'Escreve o nome do fotógrafo.');return}
    const marc=[...document.querySelectorAll('.acParte:checked')].map(x=>x.value);
    if(e.subs.length>1 && !marc.length){toast('Escolhe pelo menos uma parte do evento.');return}
    return naNuvem(async()=>{
      const [a]=await nv.insRet('acessos',{evento_id:e.uid, perfil, nome});
      if(marc.length && marc.length<e.subs.length)
        await nv.ins('acesso_partes',marc.map(sid=>({acesso_id:a.id, parte_id:e.subs.find(s=>s.id===sid).uid})));
    }, perfil==='convidado'?'QR de convidados criado.':'Página do fotógrafo criada.');
  },
  editAcesso(id,k,v){
    if(k==='nome'){ v=String(v).trim(); if(!v){renderAdmin();return} }
    return naNuvem(()=>nv.upd('acessos',id,{[k]:v}),
      k==='ativo'?(v?'Link activado.':'Link desactivado — deixa de funcionar para quem o tiver.'):'Guardado.');
  },
  toggleParteAcesso(id,sid,on){
    const e=ev(), a=acesso(id); if(!a) return;
    let ps=a.partes.length?a.partes.slice():e.subs.map(s=>s.id);
    ps=on?[...new Set([...ps,sid])]:ps.filter(x=>x!==sid);
    if(!ps.length){toast('Um link precisa de dar acesso a pelo menos uma parte.'); renderAdmin(); return}
    return naNuvem(async()=>{
      chk(await NUVEM.from('acesso_partes').delete().eq('acesso_id',id));
      if(ps.length<e.subs.length)
        await nv.ins('acesso_partes',ps.map(x=>({acesso_id:id, parte_id:e.subs.find(s=>s.id===x).uid})));
    },'Guardado.');
  },
  remAcesso(id){
    const a=acesso(id); if(!a) return;
    if(!confirmado('acesso:'+id,'Remover “'+a.nome+'”? O link e o QR deixam de funcionar (as fotos ficam).')) return;
    return naNuvem(()=>nv.del('acessos',id),'Removido.');
  },

  mudarFase(id,v){ return naNuvem(()=>nv.upd('ficheiros',id,{momento_id:v}),'Momento alterado.'); },
  aprovar(id){ return naNuvem(()=>nv.upd('ficheiros',id,{estado:'publicada'}),'Publicado na galeria.'); },
  rejeitar(id){
    const f=fotos.find(x=>x.id===id);
    return naNuvem(()=>nv.upd('ficheiros',id,{estado:'rejeitada'}),'Ficheiro rejeitado.');
  },

  editEv(k,v){
    v=String(v).trim(); if(k==='titulo'&&!v){renderAdmin();return}
    return naNuvem(()=>nv.upd('eventos',ev().uid,{[COL_EV[k]]:v||null}),'Guardado.');
  },
  editSub(k,v){
    v=String(v).trim(); if(k==='titulo'&&!v){renderAdmin();return}
    return naNuvem(()=>nv.upd('partes',sub().uid,{[COL_SUB[k]]:v||null}),'Guardado.');
  },
  async apagarEvento(){
    const e=ev();
    if(!confirmado('apagar:'+e.id,'Isto apaga “'+e.titulo+'” e todas as suas fotografias.')) return;
    const lista=fotos.filter(f=>f.ev===e.id);
    const ok=await naNuvem(()=>nv.del('eventos',e.uid),'Evento apagado.');
    if(ok){ apagarFicheirosStorage(lista); atual={ev:null, sub:null}; ir('admin'); }
  },
  async apagarParte(){
    const e=ev(), s=sub();
    if(!confirmado('parte:'+s.id,'Isto remove “'+s.titulo+'” e as suas fotografias.')) return;
    const lista=fotos.filter(f=>f.ev===e.id&&f.sub===s.id);
    const ok=await naNuvem(()=>nv.del('partes',s.uid),'Parte removida.');
    if(ok){ apagarFicheirosStorage(lista); ir('admin/'+e.id); }
  }
};

/* ===================== ARRANQUE ===================== */
async function navegar(h){
  const [v,a]=String(h||'').replace(/^#/,'').split('/');
  if(NUVEM && (v==='c'||v==='f') && a && !porToken(a)){
    try{ await nvCarregarAcesso(a); }catch(e){ console.error(e); }
  }
  ir(h);
}
async function arrancar(){
  if(NUVEM){
    toast('A ligar ao servidor…');
    try{ await nvSessao(); await nvCarregar(); }
    catch(e){
      console.error(e); EVENTOS=[]; fotos=[];
      document.body.insertAdjacentHTML('afterbegin',
        /permission denied|PGRST/.test(e.message)
          ? `<div class="erro-nuvem"><b>A base de dados ainda não está pronta.</b> Falta correr <code>supabase/CORRER_AGORA.sql</code> no SQL Editor do Supabase. Entretanto: <a href="?demo#inicio">ver a demonstração</a></div>`
          : `<div class="erro-nuvem">Sem ligação à base de dados (${esc(e.message)}). <a href="?demo#inicio">Ver a demonstração</a></div>`);
    }
  } else { carregar(); carregarPedidosLocais(); }
  setInterval(()=>{ if(vistaActual==='evento') renderCountdown(); },30000);
  await navegar(location.hash.slice(1)||'inicio');
}
arrancar();

