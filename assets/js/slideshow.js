/* Slideshow do evento.
   No painel (separador "Slideshow"), a organização escolhe fotografias de todo o evento, a transição,
   o tempo por foto e a música de fundo: um link do YouTube (só se ouve o som, o vídeo não aparece)
   ou um ficheiro de áudio do computador/telemóvel. Na página pública aparece a secção "Slideshow".
   Configuração em e.slide = {activo, titulo, fotos:[ids], transicao, segundos, ordem, musicas:[faixas]}. */

const SS_TRANS=[['suave','Desvanecer','A foto seguinte aparece por cima, devagar.'],
  ['zoom','Zoom lento','Cada foto aproxima-se lentamente enquanto está no ecrã.'],
  ['deslizar','Deslizar','A foto seguinte entra pelo lado.'],
  ['cortina','Cortina','A foto seguinte abre-se da esquerda para a direita.'],
  ['variadas','Variadas','Alterna entre as quatro transições.']];
const SS_CICLO=['suave','zoom','deslizar','cortina'];
const SS_SEG=[3,4,5,6,8,10];

Object.assign(IC,{
  slides:'<rect x="6.5" y="6.5" width="14" height="11" rx="1.8"/><path d="M3.5 15V5.8c0-1 .8-1.8 1.8-1.8h11.2"/><path d="M12 9.6v4.8l3.8-2.4z"/>',
  pausa:'<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  som:'<path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mudo:'<path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  ecra:'<path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"/>',
  fechar:'<path d="M6 6l12 12M18 6L6 18"/>',
  musica:'<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>'
});

/* ---------- dados ---------- */
function ssYoutubeId(u){
  const m=String(u||'').match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m?m[1]:'';
}
/* fotografias publicadas de todo o evento, pela ordem do evento (parte a parte, pela ordem de chegada) */
function ssFotosEvento(e){
  const ix=new Map(fotos.map((f,i)=>[f.id,i])), si=id=>e.subs.findIndex(s=>s.id===id);
  return fotos.filter(f=>f.ev===e.id&&f.estado==='publicada'&&!f.vid&&f.src)
    .sort((a,b)=>si(a.sub)-si(b.sub)||ix.get(a.id)-ix.get(b.id));
}
function ssSlides(e,cfg){
  cfg=cfg||e.slide; if(!cfg) return [];
  const ids=new Set(cfg.fotos||[]); return ssFotosEvento(e).filter(f=>ids.has(f.id));
}
function ssVisivel(e){
  const c=e&&e.slide;
  return !!(c && c.activo!==false && !(e.perm&&e.perm.galeria===false) && ssSlides(e).length);
}
function ssSrc(u){ return /^assets\/img\/[\w-]+\.jpg$/.test(u||'') ? u.slice(0,-4)+'.webp' : hi(u); }
function ssDuracao(n,seg){ const s=n*seg; return s<60?s+' s':Math.round(s/60)+' min'; }
function ssTituloPadrao(e){ return 'Os melhores momentos'; }

/* ---------- secção na página do evento ---------- */
function renderSlideshowSec(e){
  const el=document.getElementById('slideshow'); if(!el) return;
  if(!ssVisivel(e)){ el.innerHTML=''; el.style.display='none'; return; }
  el.style.display='';
  const c=e.slide, lista=ssSlides(e), m=ssFaixas(c).length;
  const capa=lista.filter((_,i)=>i%Math.max(1,Math.floor(lista.length/3))===0).slice(0,3);
  el.innerHTML=`<span class="ve-eti">Slideshow</span>
    <h2 class="ve-h2">${esc(c.titulo||ssTituloPadrao(e))}</h2>
    <p class="ve-sub">${lista.length} fotografia${lista.length===1?'':'s'} de todo o evento${m?', com música de fundo':''}. Ponha o som e aproveite.</p>
    <button class="ss-capa" onclick="abrirSlideshow()" aria-label="Ver o slideshow">
      <span class="ss-capa-fotos n${capa.length}">${capa.map(f=>imgTag(f.src,'')).join('')}</span>
      <span class="ss-capa-play">${ico('play')}</span>
      <span class="ss-capa-txt"><b>Ver slideshow</b>
        <small>${lista.length} fotos · cerca de ${ssDuracao(lista.length,c.segundos||5)}${m?' · '+ico('musica')+' com música':''}</small></span>
    </button>`;
}

/* ---------- leitor (ecrã inteiro) ---------- */
let SS=null;
function abrirSlideshow(cfg,eArg){
  const e=eArg||ev(); cfg=cfg||e.slide; if(!e||!cfg) return;
  let lista=ssSlides(e,cfg);
  if(!lista.length){ toast('Escolha pelo menos uma fotografia.'); return; }
  if(cfg.ordem==='aleatoria') lista=lista.map(f=>[Math.random(),f]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  fecharSlideshow();
  const reduz=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const d=document.createElement('div'); d.className='ss'; d.id='ss';
  d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-label','Slideshow');
  d.innerHTML=`<div class="ss-palco" id="ssPalco"></div>
    <div class="ss-topo"><div><b>${esc(cfg.titulo||ssTituloPadrao(e))}</b><small>${esc(tituloLongo(e,e.subs[0]))}</small></div>
      <button class="ss-bt" onclick="fecharSlideshow()" aria-label="Fechar o slideshow">${ico('fechar')}</button></div>
    <div class="ss-baixo">
      <div class="ss-barra"><i id="ssProg"></i></div>
      <div class="ss-ctrl">
        <button class="ss-bt" onclick="ssPasso(-1)" aria-label="Fotografia anterior">${ico('esq')}</button>
        <button class="ss-bt grande" id="ssPlay" onclick="ssAlternar()" aria-label="Pausa">${ico('pausa')}</button>
        <button class="ss-bt" onclick="ssPasso(1)" aria-label="Fotografia seguinte">${ico('dir')}</button>
        <span class="ss-conta" id="ssConta"></span>
        ${ssFaixas(cfg).length?`<button class="ss-bt" id="ssSom" onclick="ssSom()" aria-label="Tirar o som">${ico('som')}</button>`:''}
        ${document.fullscreenEnabled?`<button class="ss-bt" onclick="ssEcra()" aria-label="Ecrã inteiro">${ico('ecra')}</button>`:''}
      </div>
    </div>
    <div class="ss-musica" id="ssMusica" aria-hidden="true"></div>`;
  document.body.appendChild(d); document.body.classList.add('ss-aberto');
  SS={e, cfg, lista, i:-1, seg:Math.max(2,+cfg.segundos||5), a_tocar:true, mudo:false, reduz, cam:null, tm:null, gen:0,
      inicio:0, resta:0, yt:null, ytOk:false, ytOla:null, au:null, oculto:null, faixas:[], fx:-1};
  d.addEventListener('mousemove',ssMostrarCtrl); d.addEventListener('keydown',ssMostrarCtrl);
  /* tocar na foto: primeiro mostra os controlos; com os controlos à vista, pausa/continua */
  d.querySelector('#ssPalco').addEventListener('click',()=>{ if(d.classList.contains('ver')) ssAlternar(); else ssMostrarCtrl(); });
  document.addEventListener('keydown',ssTecla);
  window.addEventListener('message',ssMensagemYT);
  ssMusicaIniciar();
  ssIr(0,1); ssMostrarCtrl();
  setTimeout(()=>{ const b=d.querySelector('#ssPlay'); if(b) b.focus({preventScroll:true}); },50);
}
function fecharSlideshow(){
  const d=document.getElementById('ss'); if(!d) return;
  if(SS){ clearTimeout(SS.tm); clearTimeout(SS.oculto); clearInterval(SS.ytOla); if(SS.au){ SS.au.onerror=null; SS.au.pause(); SS.au.removeAttribute('src'); } SS.gen++; }
  window.removeEventListener('message',ssMensagemYT);
  document.removeEventListener('keydown',ssTecla);
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  d.remove(); document.body.classList.remove('ss-aberto'); SS=null;
}
function ssTecla(k){
  if(!SS) return;
  if(k.key==='Escape'){ if(!document.fullscreenElement) fecharSlideshow(); }
  else if(k.key==='ArrowRight') ssPasso(1);
  else if(k.key==='ArrowLeft') ssPasso(-1);
  else if(k.key===' '&&!(k.target&&k.target.closest&&k.target.closest('button'))){ k.preventDefault(); ssAlternar(); }
}
function ssMostrarCtrl(){
  const d=document.getElementById('ss'); if(!d||!SS) return;
  d.classList.add('ver'); clearTimeout(SS.oculto);
  SS.oculto=setTimeout(()=>{ if(SS&&SS.a_tocar) d.classList.remove('ver'); },2800);
}
function ssCarregar(src){
  return new Promise(ok=>{ const im=new Image(); const fim=()=>ok(im); im.onload=fim; im.onerror=fim; setTimeout(fim,7000); im.src=src; });
}
function ssTransicao(i){
  if(SS.reduz) return 'suave';
  const t=SS.cfg.transicao||'suave';
  return t==='variadas'?SS_CICLO[i%SS_CICLO.length]:t;
}
async function ssIr(i,dir){
  if(!SS) return;
  const n=SS.lista.length; i=(i+n)%n;
  const gen=++SS.gen; clearTimeout(SS.tm); SS.alvo=i;
  const src=ssSrc(SS.lista[i].src);
  await ssCarregar(src);
  if(!SS||gen!==SS.gen) return;
  const palco=document.getElementById('ssPalco'), t=ssTransicao(i);
  const cam=document.createElement('div');
  cam.className='ss-cam t-'+t+(dir<0?' volta':'')+(t==='zoom'?' kb'+(i%2):'');
  cam.style.setProperty('--ss-seg',(SS.seg+1.6)+'s');
  cam.innerHTML='<img class="ss-fundo" alt=""><img class="ss-foto" alt="">';
  cam.querySelector('.ss-fundo').src=src; const foto=cam.querySelector('.ss-foto'); foto.src=src;
  foto.alt='Fotografia '+(i+1)+' de '+n;
  palco.querySelectorAll('.ss-cam.sai').forEach(x=>x.remove());
  const velha=SS.cam; if(velha){ velha.className=velha.className.replace(/(^|\s)t-[a-z]+/,'$1t-'+t); velha.classList.toggle('volta',dir<0); velha.classList.add('sai'); setTimeout(()=>velha.remove(),1500); }
  palco.appendChild(cam); SS.cam=cam; SS.i=i;
  if(!SS.a_tocar) cam.classList.add('parado');
  document.getElementById('ssConta').textContent=(i+1)+' / '+n;
  SS.resta=SS.seg*1000; ssBarra(SS.resta);
  if(SS.a_tocar) ssAgendar(SS.seg*1000);
  ssCarregar(ssSrc(SS.lista[(i+1)%n].src));        // prepara a seguinte
}
function ssAgendar(ms){ clearTimeout(SS.tm); SS.inicio=Date.now(); SS.resta=ms; SS.tm=setTimeout(()=>ssIr(SS.alvo+1,1),ms); }
function ssBarra(ms){
  const b=document.getElementById('ssProg'); if(!b) return;
  b.style.animation='none'; void b.offsetWidth;
  b.style.animation=`ssProg ${ms}ms linear forwards`; b.style.animationPlayState=SS.a_tocar?'running':'paused';
}
function ssPasso(d){ if(SS){ ssIr((SS.alvo!=null?SS.alvo:SS.i)+d,d); ssMostrarCtrl(); } }
function ssAlternar(){
  if(!SS) return;
  SS.a_tocar=!SS.a_tocar;
  const b=document.getElementById('ssPlay'), prog=document.getElementById('ssProg');
  b.innerHTML=ico(SS.a_tocar?'pausa':'play'); b.setAttribute('aria-label',SS.a_tocar?'Pausa':'Continuar');
  if(prog) prog.style.animationPlayState=SS.a_tocar?'running':'paused';
  if(SS.cam) SS.cam.classList.toggle('parado',!SS.a_tocar);
  if(SS.a_tocar){ ssAgendar(Math.max(300,SS.resta)); ssMusicaCmd('play'); }
  else { clearTimeout(SS.tm); SS.resta-=Date.now()-SS.inicio; ssMusicaCmd('pause'); }
  ssMostrarCtrl();
}
function ssEcra(){
  const d=document.getElementById('ss'); if(!d) return;
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); else d.requestFullscreen().catch(()=>{});
}

/* ---------- música: lista de faixas tocadas pela ordem definida ----------
   Cada faixa é um link do YouTube (só o som, num leitor escondido) ou um ficheiro de áudio.
   Quando uma faixa acaba, toca a seguinte; depois da última, recomeça na primeira. */
function ssFaixas(cfg){
  if(!cfg) return [];
  const l=Array.isArray(cfg.musicas)?cfg.musicas:(cfg.musica?[cfg.musica]:[]);   // "musica" = formato antigo (uma só)
  return l.filter(f=>f&&(f.tipo==='youtube'?ssYoutubeId(f.url):(f.src||f.path)));
}
function ssMusicaIniciar(){
  SS.faixas=ssFaixas(SS.cfg); SS.fx=-1; SS.erros=0;
  if(SS.faixas.length) ssTocarFaixa(0);
}
function ssTocarFaixa(i){
  if(!SS||!SS.faixas.length) return;
  const n=SS.faixas.length; i=(i+n)%n; SS.fx=i; SS.fimEm=0;
  const f=SS.faixas[i], so1=n===1;
  if(f.tipo==='youtube'){
    if(SS.au) SS.au.pause();
    const id=ssYoutubeId(f.url);
    if(SS.yt&&SS.ytOk){ ssYT('loadVideoById',[id]); if(SS.mudo) ssYT('mute'); }
    else ssCriarYT(id,so1);
  } else {
    if(SS.yt) ssYT('pauseVideo');
    if(!SS.au){ SS.au=new Audio(); SS.au.preload='auto'; }
    const a=SS.au; a.loop=so1; a.muted=SS.mudo; a.src=f.src||'';
    a.onended=()=>{ if(SS&&SS.au===a) ssTocarFaixa(SS.fx+1); };
    a.onerror=()=>{ if(SS&&SS.au===a&&a.src) ssFaixaFalhou(); };
    if(SS.a_tocar) a.play().catch(err=>{ if(err&&err.name==='NotAllowedError') toast('Toque em ▶ para ouvir a música.'); });
  }
}
function ssFaixaFalhou(){
  if(!SS) return;
  SS.erros++;
  if(SS.faixas.length>1 && SS.erros<SS.faixas.length) ssTocarFaixa(SS.fx+1);
  else toast('Não foi possível tocar a música deste slideshow.');
}
/* leitor do YouTube escondido; ouve os eventos do leitor para saber quando a faixa acaba */
function ssCriarYT(id,so1){
  const box=document.getElementById('ssMusica'); if(!box) return;
  box.innerHTML='';
  const fr=document.createElement('iframe');
  fr.title='Música do slideshow'; fr.tabIndex=-1; fr.allow='autoplay; encrypted-media';
  fr.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1'+(so1?'&loop=1&playlist='+id:'')+
    '&controls=0&disablekb=1&playsinline=1&rel=0&enablejsapi=1&origin='+encodeURIComponent(location.origin);
  SS.yt=fr; SS.ytOk=false;
  fr.addEventListener('load',()=>{
    let n=0; clearInterval(SS.ytOla);
    SS.ytOla=setInterval(()=>{ if(!SS||SS.yt!==fr||SS.ytOk||++n>40){ clearInterval(SS&&SS.ytOla); return; }
      fr.contentWindow&&fr.contentWindow.postMessage(JSON.stringify({event:'listening',id:'ss',channel:'widget'}),'*'); },250);
  });
  box.appendChild(fr);
}
function ssMensagemYT(m){
  if(!SS||!SS.yt||m.source!==SS.yt.contentWindow) return;
  let d; try{ d=typeof m.data==='string'?JSON.parse(m.data):m.data; }catch(_){ return; }
  if(!d||!d.event) return;
  if(!SS.ytOk){
    SS.ytOk=true; clearInterval(SS.ytOla);
    ['onStateChange','onError'].forEach(ev=>ssYT('addEventListener',[ev]));
    if(SS.mudo) ssYT('mute');
    if(!SS.a_tocar) ssYT('pauseVideo');
  }
  const f=SS.faixas[SS.fx]; if(!f||f.tipo!=='youtube') return;
  const estado=d.event==='onStateChange'?d.info:(d.event==='infoDelivery'&&d.info?d.info.playerState:undefined);
  if(estado===1) SS.erros=0;
  if(estado===0 && SS.faixas.length>1 && Date.now()-(SS.fimEm||0)>1500){ SS.fimEm=Date.now(); ssTocarFaixa(SS.fx+1); }
  if(d.event==='onError') ssFaixaFalhou();
}
function ssYT(func,args){
  if(SS&&SS.yt&&SS.yt.contentWindow)
    SS.yt.contentWindow.postMessage(JSON.stringify({event:'command',func,args:args||[],id:'ss',channel:'widget'}),'*');
}
function ssMusicaCmd(c){
  if(!SS) return;
  const f=SS.faixas&&SS.faixas[SS.fx]; if(!f) return;
  if(f.tipo==='youtube') ssYT(c==='play'?'playVideo':'pauseVideo');
  else if(SS.au){ if(c==='play') SS.au.play().catch(()=>{}); else SS.au.pause(); }
}
function ssSom(){
  if(!SS) return;
  SS.mudo=!SS.mudo;
  if(SS.au) SS.au.muted=SS.mudo;
  if(SS.yt) ssYT(SS.mudo?'mute':'unMute');
  const b=document.getElementById('ssSom');
  if(b){ b.innerHTML=ico(SS.mudo?'mudo':'som'); b.setAttribute('aria-label',SS.mudo?'Ligar o som':'Tirar o som'); }
}

/* =====================================================================
   PAINEL — separador "Slideshow"
   ===================================================================== */
let ssRasc=null;
function ssRascunho(e){
  if(!ssRasc||ssRasc.ev!==e.id){
    const c=e.slide||{};
    ssRasc={ev:e.id, activo:c.activo!==false, titulo:c.titulo||'', fotos:(c.fotos||[]).slice(),
      transicao:c.transicao||'suave', segundos:c.segundos||5, ordem:c.ordem||'evento',
      faixas:ssFaixas(c).map(f=>({...f})), ytUrl:''};
  }
  return ssRasc;
}
/* guarda no rascunho o que está escrito nos campos (antes de redesenhar) */
function ssEdLer(){
  const r=ssRasc; if(!r) return r;
  const g=id=>document.getElementById(id);
  if(g('ssTitulo')) r.titulo=g('ssTitulo').value.trim();
  if(g('ssSeg')) r.segundos=+g('ssSeg').value||5;
  if(g('ssOrdem')) r.ordem=g('ssOrdem').value;
  if(g('ssYt')) r.ytUrl=g('ssYt').value.trim();
  return r;
}
function ssEdRedesenhar(){ ssEdLer(); renderAdmin(); }
function ssNomeFaixa(f){
  if(f.tipo==='youtube'){ const id=ssYoutubeId(f.url); return 'youtu.be/'+id; }
  return f.nome||'Música carregada';
}

function pnSlideshow(){
  const e=ev(), r=ssRascunho(e), todas=ssFotosEvento(e), sel=new Set(r.fotos);
  const escolhidas=todas.filter(f=>sel.has(f.id)).length;
  const porParte=e.subs.map(s=>[s,todas.filter(f=>f.sub===s.id)]).filter(([,l])=>l.length);
  const nf=r.faixas.length;
  return `<div class="ss-ed">
    ${e.perm&&e.perm.galeria===false?'<div class="qr-nota small">A galeria está fechada ao público (Permissões → Galeria pública), por isso o slideshow não aparece na página do evento.</div>':''}
    <div class="card pn-bloco">
      <div class="pn-bloco-cab"><b>1 · Fotografias</b><span class="pn-pill ${escolhidas?'ok':'rascunho'}" id="ssEdConta">${escolhidas} de ${todas.length} escolhidas</span></div>
      ${todas.length?`<p class="tiny muted">Toque nas fotografias para as escolher, de qualquer parte do evento. A ordem em que as escolhe não importa:
          o slideshow segue a ordem do evento (ou aleatória, se preferir).</p>
        <div class="pn-acts" style="margin:10px 0 4px"><button class="btn ghost sm" onclick="ssEdTodas(true)">Escolher todas</button>
          <button class="btn ghost sm" onclick="ssEdTodas(false)">Limpar escolha</button></div>
        ${porParte.map(([s,l])=>`<div class="ss-ed-parte"><h4>${TIPOS[s.tipo].ic} ${esc(s.titulo)} <small>${l.length} foto${l.length===1?'':'s'}</small>
            <button class="ss-ed-mini" onclick="ssEdParte('${s.id}')">Escolher todas desta parte</button></h4>
          <div class="ss-ed-grelha">${l.map(f=>`<button class="ss-ed-foto ${sel.has(f.id)?'on':''}" data-id="${esc(f.id)}" aria-pressed="${sel.has(f.id)}" onclick="ssEdFoto(this)">
            ${imgTag(f.src,'')}<span class="ss-ed-check">${ico('certo')}</span></button>`).join('')}</div></div>`).join('')}`
        :'<div class="empty">Ainda não há fotografias publicadas neste evento. Aprove contribuições ou carregue fotos oficiais primeiro.</div>'}
    </div>

    <div class="card pn-bloco"><b>2 · Transição e tempo</b>
      <div class="ss-ed-trans">${SS_TRANS.map(([k,l,d])=>`<button class="${r.transicao===k?'on':''}" onclick="ssEdTrans('${k}')" aria-pressed="${r.transicao===k}">
        <span class="ss-demo d-${k}" aria-hidden="true"><i></i><i></i></span><b>${l}</b><small>${d}</small></button>`).join('')}</div>
      <div class="grid-f">
        <label class="field"><span>Tempo de cada foto</span><select id="ssSeg">${SS_SEG.map(n=>`<option value="${n}" ${+r.segundos===n?'selected':''}>${n} segundos</option>`).join('')}</select></label>
        <label class="field"><span>Ordem</span><select id="ssOrdem">
          <option value="evento" ${r.ordem!=='aleatoria'?'selected':''}>Pela ordem do evento</option>
          <option value="aleatoria" ${r.ordem==='aleatoria'?'selected':''}>Aleatória (muda cada vez)</option></select></label>
        <label class="field"><span>Título (opcional)</span><input id="ssTitulo" maxlength="80" value="${esc(r.titulo)}" placeholder="${esc(ssTituloPadrao(e))}"></label>
      </div>
    </div>

    <div class="card pn-bloco"><div class="pn-bloco-cab"><b>3 · Música de fundo</b>
        <span class="pn-pill ${nf?'ok':'rascunho'}">${nf?nf+' música'+(nf===1?'':'s'):'Sem música'}</span></div>
      <p class="tiny muted">As músicas tocam pela ordem desta lista: quando uma acaba, começa a seguinte; depois da última, volta à primeira.
        Use as setas para mudar a ordem.</p>
      ${nf?`<ol class="ss-faixas">${r.faixas.map((f,i)=>`<li>
          <span class="ss-faixa-n">${i+1}</span>
          <span class="ss-faixa-ic ${f.tipo}">${ico(f.tipo==='youtube'?'play':'musica')}</span>
          <span class="ss-faixa-t"><b>${esc(ssNomeFaixa(f))}</b><small>${f.tipo==='youtube'?'YouTube · só o som':'Ficheiro de áudio'+(f.file?' · é carregado ao guardar':'')}</small></span>
          <span class="ss-faixa-acts">
            <button onclick="ssEdMover(${i},-1)" ${i?'':'disabled'} aria-label="Subir">${ico('esq')}</button>
            <button onclick="ssEdMover(${i},1)" ${i<nf-1?'':'disabled'} aria-label="Descer">${ico('dir')}</button>
            <button class="tirar" onclick="ssEdTirar(${i})" aria-label="Tirar da lista">${ico('fechar')}</button>
          </span></li>`).join('')}</ol>`
        :'<p class="muted small" style="margin:8px 0 12px">Ainda sem música: o slideshow passa sem som.</p>'}
      <div class="ss-add">
        <label class="field"><span>Link de uma música no YouTube</span>
          <input id="ssYt" type="url" value="${esc(r.ytUrl)}" placeholder="https://www.youtube.com/watch?v=…" onkeydown="if(event.key==='Enter'){event.preventDefault();ssEdAddYT()}"></label>
        <button class="btn sm" onclick="ssEdAddYT()">+ Adicionar link</button>
        <label class="btn ghost sm">+ Ficheiro do computador ou telemóvel<input type="file" accept="audio/*" multiple hidden onchange="ssEdFicheiros(this)"></label>
      </div>
      <p class="tiny muted">Do YouTube só se ouve o som: o vídeo fica escondido. Alguns vídeos não deixam ser tocados fora do YouTube;
        esses são saltados. Ficheiros até 100 MB cada${NUVEM?'.':' (na demonstração, só ficam até recarregar a página).'}</p>
    </div>

    <div class="card pn-bloco">
      ${pnTog(r.activo,'ssEdActivo(this.checked)','Mostrar na página do evento','Aparece no ecrã do Mural da página do evento, para todos os visitantes.')}
      <div class="pn-acts" style="margin-top:12px">
        <button class="btn" onclick="ssGuardar()">Guardar slideshow</button>
        <button class="btn ghost" onclick="ssPrever()" ${escolhidas?'':'disabled'}>${ico('play')} Pré-visualizar</button>
      </div>
    </div>
  </div>`;
}
function ssEdConta(){
  const e=ev(), n=ssFotosEvento(e).filter(f=>ssRasc.fotos.includes(f.id)).length, t=ssFotosEvento(e).length;
  const el=document.getElementById('ssEdConta'); if(el){ el.textContent=n+' de '+t+' escolhidas'; el.className='pn-pill '+(n?'ok':'rascunho'); }
  const pv=document.querySelector('.ss-ed button[onclick="ssPrever()"]'); if(pv) pv.disabled=!n;
}
function ssEdFoto(b){
  const id=b.dataset.id, r=ssRasc, on=!r.fotos.includes(id);
  r.fotos=on?[...r.fotos,id]:r.fotos.filter(x=>x!==id);
  b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); ssEdConta();
}
function ssEdTodas(on){
  const e=ev(); ssRasc.fotos=on?ssFotosEvento(e).map(f=>f.id):[];
  document.querySelectorAll('.ss-ed-foto').forEach(b=>{ b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); });
  ssEdConta();
}
function ssEdParte(sid){
  const e=ev(), ids=ssFotosEvento(e).filter(f=>f.sub===sid).map(f=>f.id);
  ssRasc.fotos=[...new Set([...ssRasc.fotos,...ids])];
  document.querySelectorAll('.ss-ed-foto').forEach(b=>{ if(ids.includes(b.dataset.id)){ b.classList.add('on'); b.setAttribute('aria-pressed',true); } });
  ssEdConta();
}
function ssEdTrans(k){ ssRasc.transicao=k; ssEdRedesenhar(); }
function ssEdActivo(on){ ssRasc.activo=on; }
/* lista de músicas */
function ssEdAddYT(){
  const r=ssEdLer(); if(!r.ytUrl) { toast('Cole primeiro o link do YouTube.'); return; }
  if(!ssYoutubeId(r.ytUrl)){ toast('O link do YouTube não é válido. Copie o endereço do vídeo (youtube.com/watch?v=… ou youtu.be/…).'); return; }
  r.faixas.push({tipo:'youtube', url:r.ytUrl}); r.ytUrl=''; renderAdmin();
}
function ssEdFicheiros(inp){
  const r=ssEdLer(); let n=0;
  [...(inp.files||[])].forEach(f=>{
    if(!/^audio\//.test(f.type)){ toast('“'+f.name+'” não é um ficheiro de áudio.'); return; }
    if(f.size>100*1024*1024){ toast('“'+f.name+'” tem mais de 100 MB.'); return; }
    r.faixas.push({tipo:'ficheiro', nome:f.name, file:f}); n++;
  });
  inp.value=''; if(n) renderAdmin();
}
function ssEdMover(i,d){
  const r=ssEdLer(), j=i+d; if(j<0||j>=r.faixas.length) return;
  [r.faixas[i],r.faixas[j]]=[r.faixas[j],r.faixas[i]]; renderAdmin();
}
function ssEdTirar(i){ const r=ssEdLer(); r.faixas.splice(i,1); renderAdmin(); }

/* configuração a partir do rascunho; devolve null (com aviso) se faltar alguma coisa */
function ssConfigDoRascunho(paraPrever){
  const e=ev(), r=ssEdLer();
  const validas=new Set(ssFotosEvento(e).map(f=>f.id)), fotosOk=r.fotos.filter(id=>validas.has(id));
  if(!fotosOk.length){ toast('Escolha pelo menos uma fotografia.'); return null; }
  if(r.ytUrl){                                   // link colado mas sem carregar em "Adicionar"
    if(!ssYoutubeId(r.ytUrl)){ toast('O link do YouTube não é válido.'); return null; }
    r.faixas.push({tipo:'youtube', url:r.ytUrl}); r.ytUrl='';
  }
  const musicas=r.faixas.map(f=>f.tipo==='youtube'?{tipo:'youtube', url:f.url}
    : f.file?(paraPrever?{tipo:'ficheiro', nome:f.nome, src:URL.createObjectURL(f.file)}:{tipo:'ficheiro', nome:f.nome, file:f.file})
    : {tipo:'ficheiro', nome:f.nome||'', path:f.path||null, src:f.src||''});
  return {activo:r.activo, titulo:r.titulo, fotos:fotosOk, transicao:r.transicao, segundos:+r.segundos||5, ordem:r.ordem, musicas};
}
function ssPrever(){ const c=ssConfigDoRascunho(true); if(c) abrirSlideshow(c,ev()); }
async function ssGuardar(){
  const e=ev(), cfg=ssConfigDoRascunho(false); if(!cfg) return;
  const antigos=ssFaixas(e.slide).map(f=>f.path).filter(Boolean), novos=cfg.musicas.some(f=>f.file);
  if(NUVEM) return naNuvem(async()=>{
    const musicas=[];
    for(const f of cfg.musicas){
      if(f.tipo==='youtube') musicas.push(f);
      else if(f.file){ toast('A carregar “'+f.nome+'”…'); musicas.push({tipo:'ficheiro', path:await nvCarregarAdmin(e,'musica',f.file), nome:f.nome}); }
      else if(f.path) musicas.push({tipo:'ficheiro', path:f.path, nome:f.nome});
    }
    await nv.upd('eventos',e.uid,{slideshow:{...cfg, musicas}});
    const ficam=new Set(musicas.map(f=>f.path).filter(Boolean)), sair=antigos.filter(p=>!ficam.has(p));
    if(sair.length) NUVEM.storage.from('ficheiros').remove(sair).catch(()=>{});
    ssRasc=null;
  },'Slideshow guardado.');
  cfg.musicas=cfg.musicas.map(f=>f.file?{tipo:'ficheiro', nome:f.nome, src:URL.createObjectURL(f.file), temporario:true}:f);
  e.slide=cfg; ssRasc=null; guardar(); renderAdmin();
  toast(novos?'Slideshow guardado (demonstração: as músicas carregadas só ficam até recarregar a página).':'Slideshow guardado.');
}

/* ao mudar de página, o slideshow fecha (e a música pára) */
window.addEventListener('hashchange',()=>{ if(SS) fecharSlideshow(); });
