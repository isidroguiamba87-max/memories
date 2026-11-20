/* Personalização:
   · cor e tipo de letra de cada evento (escolhidos ao criar o evento e em Informações);
   · página inicial: fotos da faixa da galeria, escolhidas no painel (secção "Página inicial").
   Carregar depois de evento.js e antes de admin.js/app.js. */

/* ---------- tipos de letra (títulos da página do evento) ---------- */
const FONTES={
  cormorant: {n:'Cormorant (clássica)',     css:"'Cormorant Garamond',Georgia,serif", g:null},
  playfair:  {n:'Playfair (elegante)',      css:"'Playfair Display',Georgia,serif",   g:'Playfair+Display:wght@500;600'},
  lora:      {n:'Lora (suave)',             css:"'Lora',Georgia,serif",               g:'Lora:wght@500;600'},
  dmserif:   {n:'DM Serif (forte)',         css:"'DM Serif Display',Georgia,serif",   g:'DM+Serif+Display'},
  greatvibes:{n:'Great Vibes (manuscrita)', css:"'Great Vibes',cursive",              g:'Great+Vibes'},
  montserrat:{n:'Montserrat (moderna)',     css:"'Montserrat',system-ui,sans-serif",  g:'Montserrat:wght@500;600'},
  poppins:   {n:'Poppins (arredondada)',    css:"'Poppins',system-ui,sans-serif",     g:'Poppins:wght@500;600'}
};
const CORES_EVENTO=[['#C8582B','Laranja'],['#A8824C','Dourado'],['#9E4F36','Terracota'],['#3F5D45','Verde'],
  ['#2F7F86','Oceano'],['#2D5BB8','Azul'],['#B83F7A','Rosa'],['#6B4A8E','Roxo'],['#1E1714','Preto']];

function carregarFonte(id){
  const f=FONTES[id]; if(!f||!f.g) return;
  if(document.querySelector('link[data-fonte="'+id+'"]')) return;
  const l=document.createElement('link'); l.rel='stylesheet'; l.dataset.fonte=id;
  l.href='https://fonts.googleapis.com/css2?family='+f.g+'&display=swap';
  document.head.appendChild(l);
}
function corValida(c){ return /^#[0-9a-f]{6}$/i.test(String(c||'')); }

/* aplica na página do evento: cor (sobrepõe-se ao tema) e tipo de letra dos títulos */
function aplicarEstiloEvento(e){
  const v=document.getElementById('view-evento'); if(!v||!e) return;
  if(corValida(e.cor)) v.style.setProperty('--ve-acc',e.cor);
  const f=FONTES[e.fonte];
  if(f && e.fonte!=='cormorant'){ carregarFonte(e.fonte); v.style.setProperty('--ve-fonte',f.css); }
  else v.style.removeProperty('--ve-fonte');
  v.dataset.fonte=e.fonte||'';
}

/* campos do formulário (criar evento e Informações). alvo: expressão JS do objecto a alterar, ou '' para só ler por id */
function htmlEstiloCampos(cor,fonte,alvo){
  const set=(k,val)=>alvo?`${alvo}.${k}=${val};`:'';
  const c=corValida(cor)?cor:'';
  return `<div class="es-campos">
    <div class="field"><span>Cor do evento</span>
      <div class="es-cores" role="radiogroup" aria-label="Cor do evento">
        <button type="button" class="es-cor auto ${c?'':'on'}" title="Automática (pelo tema do tipo de evento)" onclick="${set('cor',"''")}esEscolherCor(this,'')">Auto</button>
        ${CORES_EVENTO.map(([h,n])=>`<button type="button" class="es-cor ${c.toLowerCase()===h.toLowerCase()?'on':''}" style="--c:${h}" title="${n}" aria-label="${n}"
          onclick="${set('cor',`'${h}'`)}esEscolherCor(this,'${h}')"></button>`).join('')}
        <label class="es-cor livre ${c&&!CORES_EVENTO.some(([h])=>h.toLowerCase()===c.toLowerCase())?'on':''}" title="Outra cor">
          <input type="color" value="${c||'#C8582B'}" oninput="${set('cor','this.value')}esEscolherCor(this.parentNode,this.value)"></label>
      </div>
      <input type="hidden" id="esCor" value="${esc(c)}">
    </div>
    <label class="field"><span>Estilo de letra dos títulos</span>
      <select id="esFonte" onchange="${set('fonte','this.value')}esPreverFonte(this.value)">
        ${Object.keys(FONTES).map(k=>`<option value="${k}" ${(fonte||'cormorant')===k?'selected':''}>${FONTES[k].n}</option>`).join('')}
      </select></label>
    <div class="es-previa" id="esPrevia" style="--c:${c||'#C8582B'};font-family:${(FONTES[fonte]||FONTES.cormorant).css}">Casamento de Nélia &amp; Tomás</div>
  </div>`;
}
function esEscolherCor(el,h){
  const box=el.closest('.es-cores'); box.querySelectorAll('.es-cor').forEach(b=>b.classList.toggle('on',b===el));
  const i=document.getElementById('esCor'); if(i) i.value=h;
  const p=document.getElementById('esPrevia'); if(p) p.style.setProperty('--c',h||'#C8582B');
}
function esPreverFonte(k){ carregarFonte(k); const p=document.getElementById('esPrevia'); if(p) p.style.fontFamily=(FONTES[k]||FONTES.cormorant).css; }
function esLerCampos(){
  const c=(document.getElementById('esCor')||{}).value||'', f=(document.getElementById('esFonte')||{}).value||'cormorant';
  return {cor:corValida(c)?c:'', fonte:f==='cormorant'?'':f};
}

/* ===================== PÁGINA INICIAL ===================== */
/* SITE.vitrine: fotos escolhidas para a faixa da galeria da página inicial.
   Vazio = automático (as fotos do evento com mais fotografias publicadas, como antes). */
let SITE={vitrine:[]};
const CHAVE_SITE='memoria.site';
function carregarSiteLocal(){ try{ const s=JSON.parse(localStorage.getItem(CHAVE_SITE)||'null'); if(s&&Array.isArray(s.vitrine)) SITE=s; }catch(e){} }
function vitrineEscolhida(){
  return (SITE.vitrine||[]).map(x=>{
    const f=x.foto&&fotos.find(y=>y.id===x.foto);
    return f ? {src:f.src, id:f.id, ev:f.ev, sub:f.sub} : (x.src?{src:x.src}:null);
  }).filter(x=>x&&x.src);
}

/* --- secção do painel --- */
let siteFiltroEv='';
function pnSite(){
  const esc_=vitrineEscolhida(), ids=new Set((SITE.vitrine||[]).map(x=>x.foto).filter(Boolean));
  const evs=EVENTOS.filter(e=>fotos.some(f=>f.ev===e.id&&f.estado==='publicada'&&!f.vid));
  if(siteFiltroEv && !evs.some(e=>e.id===siteFiltroEv)) siteFiltroEv='';
  const disp=fotos.filter(f=>f.estado==='publicada'&&!f.vid&&f.src&&(!siteFiltroEv||f.ev===siteFiltroEv));
  return pnTitulo('Página inicial','Escolha as fotografias que aparecem na faixa da galeria da página inicial.')+`
  <div class="card pn-bloco">
    <div class="es-cab"><b>Fotografias em destaque (${esc_.length})</b>
      <span class="small muted">${esc_.length?'Aparecem por esta ordem.':'Automático: mostra as fotos do evento com mais fotografias publicadas.'}</span></div>
    ${esc_.length?`<div class="es-escolhidas">${esc_.map((f,i)=>`<div class="es-esc">
        ${imgTag(f.src,'')}<span class="es-n">${i+1}</span>
        <div class="es-esc-acts">
          <button onclick="siteMover(${i},-1)" title="Mais cedo" ${i?'':'disabled'}>←</button>
          <button onclick="siteMover(${i},1)" title="Mais tarde" ${i<esc_.length-1?'':'disabled'}>→</button>
          <button onclick="siteRemover(${i})" title="Retirar">✕</button></div></div>`).join('')}</div>`
      :'<div class="empty small">Ainda não escolheu fotografias — a página inicial continua com as automáticas.</div>'}
    <div class="es-acts">
      <label class="btn sm">+ Carregar fotografias<input type="file" accept="image/*" multiple hidden onchange="siteCarregar(this)"></label>
      ${esc_.length?'<button class="btn ghost sm" onclick="siteAutomatico()">Voltar ao automático</button>':''}
      <a class="btn ghost sm" href="#inicio" target="_blank" rel="noopener">Ver página inicial ↗</a>
    </div>
  </div>
  <div class="card pn-bloco" style="margin-top:16px">
    <div class="es-cab"><b>Escolher das galerias publicadas</b>
      <select class="sel-sm" onchange="siteFiltroEv=this.value;renderAdmin()"><option value="">Todos os eventos</option>
        ${evs.map(e=>`<option value="${e.id}" ${e.id===siteFiltroEv?'selected':''}>${esc(e.titulo)}</option>`).join('')}</select></div>
    ${disp.length?`<div class="es-grelha">${disp.slice(0,120).map(f=>`<button class="es-foto ${ids.has(f.id)?'on':''}" onclick="siteAlternar('${f.id}')"
        title="${ids.has(f.id)?'Retirar da página inicial':'Mostrar na página inicial'}">${imgTag(f.src,'')}<i>${ids.has(f.id)?'✓':'+'}</i></button>`).join('')}</div>`
      :'<div class="empty small">Ainda não há fotografias publicadas. Aprove contribuições ou carregue fotografias acima.</div>'}
  </div>`;
}
function siteAlternar(id){
  const v=SITE.vitrine||[], i=v.findIndex(x=>x.foto===id);
  if(i>=0) v.splice(i,1); else { if(v.length>=12){toast('Máximo de 12 fotografias.');return} v.push({foto:id}); }
  SITE.vitrine=v; guardarSite();
}
function siteMover(i,d){ const v=SITE.vitrine, j=i+d; if(j<0||j>=v.length) return; [v[i],v[j]]=[v[j],v[i]]; guardarSite(); }
function siteRemover(i){ const x=SITE.vitrine.splice(i,1)[0]; guardarSite(x&&x.path?[x.path]:[]); }
function siteAutomatico(){
  if(!confirmado('site-auto','A página inicial volta a mostrar as fotografias automáticas.')) return;
  const paths=(SITE.vitrine||[]).map(x=>x.path).filter(Boolean); SITE.vitrine=[]; guardarSite(paths);
}
async function siteCarregar(input){
  const fs=[...input.files].slice(0,12-(SITE.vitrine||[]).length); input.value='';
  if(!fs.length){toast('Máximo de 12 fotografias.');return}
  toast('A preparar '+fs.length+' fotografia(s)…');
  for(const f of fs){
    try{
      if(NUVEM){
        const ext=(f.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)||'jpg';
        const path='admin/site/'+crypto.randomUUID()+'.'+ext;
        chk(await NUVEM.storage.from('ficheiros').upload(path,f,{contentType:f.type||undefined, upsert:false}));
        SITE.vitrine.push({path});
      }else SITE.vitrine.push({src:await pnReduzir(f,1600)});
    }catch(e){ toast('Não foi possível carregar '+f.name+': '+e.message); }
  }
  guardarSite();
}
/* guarda: no servidor em site_config('inicio'); na demonstração no navegador */
async function guardarSite(remover){
  const valor={vitrine:(SITE.vitrine||[]).map(x=>x.foto?{foto:x.foto}:x.path?{path:x.path}:{src:x.src})};
  if(NUVEM){
    const ok=await naNuvem(async()=>chk(await NUVEM.from('site_config').upsert({chave:'inicio', valor, actualizado_em:new Date().toISOString()})),
      'Página inicial actualizada.');
    if(ok && remover&&remover.length) NUVEM.storage.from('ficheiros').remove(remover).catch(()=>{});
    return;
  }
  try{ localStorage.setItem(CHAVE_SITE,JSON.stringify(valor)); toast('Página inicial actualizada.'); }
  catch(e){ toast('Sem espaço no navegador para guardar estas fotografias. Use menos ou mais pequenas.'); }
  renderAdmin();
}

/* modo demonstração: fotos da página inicial guardadas neste navegador */
if(!NUVEM) carregarSiteLocal();
