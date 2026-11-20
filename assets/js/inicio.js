/* Página inicial (landing) — versão mobile — e formulário de pedidos. */

let PEDIDOS=[];
/* Logótipo (assets/img/logo-simbolo.svg) em linha: o arco escuro usa a cor do texto (currentColor),
   para se ver em fundos claros e escuros; o arco terracota mantém-se. */
let LOGO_N=0;
function logoSvg(cls){
  const id='lgm'+(++LOGO_N);
  return `<svg class="logo-svg ${cls||''}" viewBox="0 0 232 128" aria-hidden="true" focusable="false"><defs><mask id="${id}">
    <rect x="-20" y="-20" width="280" height="180" fill="#fff"/><path d="M 130 128 V 56 A 42 42 0 0 1 214 56 V 128" fill="none" stroke="#000" stroke-width="42"/></mask></defs>
    <path d="M 18 128 V 86 A 50 50 0 0 1 118 86 V 128" fill="none" stroke="#A55C38" stroke-width="28" mask="url(#${id})"/>
    <path d="M 130 128 V 56 A 42 42 0 0 1 214 56 V 128" fill="none" stroke="currentColor" stroke-width="28"/>
    <circle cx="172" cy="72" r="9" fill="#A55C38"/></svg>`;
}
/* Fotografias próprias do site (assets/img). */
const IMG={noivos:'assets/img/hero-noivos.jpg', flores:'assets/img/flores-casamento.jpg', danca:'assets/img/danca-africana.jpg',
  dancaMz:'assets/img/danca-mocambicana.jpg', batizado:'assets/img/batizado-igreja.jpg', corporativo:'assets/img/corporativo-banquete.jpg',
  batizadoBanner:'assets/img/batizado-conversa.jpg', culturaisBanner:'assets/img/eventos-culturais.jpg'};
/* Serviços da página inicial: [ícone, nome, filtro da lista de eventos, imagem].
   A mesma imagem serve de fundo no topo da lista de eventos quando se escolhe esse tipo (fundoFiltro). */
const SERVICOS=[['aneis','Casamentos','t:casamento',IMG.flores],['bolo','Aniversários','t:aniversario',IMG.danca],
  ['cruz','Baptizados','t:batizado',IMG.batizado],['pessoas','Conferências','t:conferencia',IMG.corporativo],
  ['pasta','Eventos Corporativos','corporativo',IMG.corporativo],['estrela','Galas e Homenagens','t:gala',IMG.dancaMz]];
/* imagem de fundo para um filtro da lista ('t:<tipo>' ou id de categoria); vazio = sem fundo */
const FUNDO_CAT={uniao:IMG.flores, familia:IMG.danca, corporativo:IMG.corporativo, homenagem:IMG.dancaMz};
function fundoFiltro(f){
  if(!f||f==='todas'||f==='guardados') return '';
  const s=SERVICOS.find(x=>x[2]===f); if(s) return s[3];
  const cat=f.startsWith('t:')?(TIPOS[f.slice(2)]||{}).cat:f;
  return FUNDO_CAT[cat]||'';
}
function nomeServico(f){const s=SERVICOS.find(x=>x[2]===f); return s?s[1]:''}
const CHAVE_PEDIDOS='memoria.pedidos';
const CAT_CURTA={uniao:'Casamentos', familia:'Celebrações', corporativo:'Corporativo', homenagem:'Homenagens'};
let lpCat='todas', lpBusca='', lpSlide=0;

/* ---------- ícones (traço) ---------- */
const IC={
  seta:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  baixo:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  fechar:'<path d="M6 6l12 12M18 6L6 18"/>',
  busca:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  pin:'<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  coracao:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>',
  pasta:'<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17"/>',
  tacas:'<path d="M7 3h5l-.6 5.2a2 2 0 0 1-3.8 0zM9.5 10v8M7 18h5M12.5 6l4.7-1.8 1.4 5a2 2 0 0 1-3.5 1.4zM16.2 11.2l2.3 6.9M15.5 19l4.4-1.5"/>',
  pessoas:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14.5 15a4.3 4.3 0 0 1 6 4"/>',
  nuvem:'<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5"/><path d="M12 12v8M9 15l3-3 3 3"/>',
  engrenagem:'<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 6.5l2.1 1.2M17.7 16.3l2.1 1.2M4.2 17.5l2.1-1.2M17.7 7.7l2.1-1.2M2.8 12h2.4M18.8 12h2.4"/><circle cx="12" cy="12" r="6.6"/>',
  imagem:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
  partilha:'<circle cx="17.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="M8.7 10.8l6.6-4M8.7 13.2l6.6 4"/>',
  conversa:'<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4A8 8 0 1 1 20 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  expandir:'<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
  camara:'<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.8"/>',
  mais:'<path d="M12 5v14M5 12h14"/>',
  whatsapp:'<path d="M4 20l1.2-4.2A8 8 0 1 1 8.3 19z"/><path d="M9 8.8c0 3.3 2.9 6.2 6.2 6.2l1.3-1.6-2-1-1 .9a4.2 4.2 0 0 1-2.8-2.8l.9-1-1-2z"/>',
  instagram:'<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.7"/><circle cx="16.8" cy="7.2" r=".6"/>',
  youtube:'<rect x="3" y="6" width="18" height="12" rx="4"/><path d="M10.5 9.5v5l4.2-2.5z"/>',
  facebook:'<circle cx="12" cy="12" r="8.5"/><path d="M13.2 20.5v-7h2.3l.4-2.6h-2.7V9.3c0-.8.3-1.3 1.4-1.3h1.4V5.7a17 17 0 0 0-2-.1c-2 0-3.3 1.2-3.3 3.4v1.9H8.4v2.6h2.3v7"/>'
};
const ico=(n,cls)=>`<svg class="ico ${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const onda=(cls)=>`<svg class="lp-onda ${cls||''}" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 34 C 90 70, 190 6, 290 26 S 380 40, 400 22 L400 60 L0 60 Z"/></svg>`;

function contacto(){return (typeof CONTACTO!=='undefined'&&CONTACTO)||{}}
function linkWhats(){const n=String(contacto().whatsapp||'').replace(/\D/g,''); return n?'https://wa.me/'+n:''}

/* ---------- dados para a página ---------- */
function eventosLanding(){
  const ordem={decorrer:0, encerrado:1, preparacao:2};
  /* só eventos publicados — os rascunhos ficam no painel (igual à página Eventos) */
  return eventosPublicos().sort((a,b)=>ordem[estadoEv(a)]-ordem[estadoEv(b)] || intervaloDatas(a).localeCompare(intervaloDatas(b)));
}
function fotosVitrine(){
  /* fotos escolhidas no painel (Página inicial); sem escolha, fica automático */
  const escolhidas=typeof vitrineEscolhida==='function'?vitrineEscolhida():[];
  if(escolhidas.length){
    const f0=escolhidas.find(f=>f.ev);
    return {lista:escolhidas.map(f=>({src:f.src, id:f.id})), rota:f0?'evento/'+f0.ev+'/'+f0.sub:'eventos'};
  }
  const pubEv=new Set(eventosPublicos().map(e=>e.id));
  const pub=fotos.filter(f=>f.estado==='publicada'&&!f.vid&&f.src&&pubEv.has(f.ev));
  if(pub.length){
    const porEv={}; pub.forEach(f=>(porEv[f.ev]=porEv[f.ev]||[]).push(f));
    const evId=Object.keys(porEv).sort((a,b)=>porEv[b].length-porEv[a].length)[0];
    const f0=porEv[evId][0];
    return {lista:porEv[evId].slice(0,10).map(f=>({src:f.src, id:f.id})), rota:'evento/'+evId+'/'+f0.sub};
  }
  return {lista:[IMG.flores,IMG.dancaMz,IMG.batizado,IMG.danca,IMG.corporativo,IMG.noivos,...(NUVEM?[]:[...POOL.festa,...POOL.recep])].slice(0,10).map(src=>({src})), rota:'eventos'};
}

/* ---------- render ---------- */
function renderInicio(){
  const vit=fotosVitrine(); if(lpSlide>=vit.lista.length) lpSlide=0;
  const wa=linkWhats(), c=contacto();
  const sociais=[['instagram','Instagram'],['youtube','YouTube'],['facebook','Facebook']].filter(([k])=>c[k]);
  document.getElementById('view-inicio').innerHTML=`<div class="lpm">
  <header class="lp-topo" id="lpTopo">
    <div class="lp-marca">${logoSvg()} Memória</div>
    <button class="lp-menu-btn" onclick="lpMenu(true)" aria-label="Abrir menu">${ico('menu')}</button>
  </header>

  <section class="lp-hero" id="lp-topo">
    <div class="lp-hero-img">${imgTag('assets/img/hero-noivos.jpg','Noivos sorriem, testa com testa, no dia do casamento','',true)}</div>
    <div class="lp-hero-txt">
      <h1>Cada evento tem momentos que merecem ser encontrados.</h1>
      <p>Galerias digitais para reviver, partilhar e guardar memórias.</p>
      <button class="lp-btn" onclick="abrirPedido('galeria')">Solicitar uma galeria ${ico('seta')}</button>
      <button class="lp-btn contorno" onclick="lpIr('lp-eventos')">Explorar eventos</button>
      <button class="lp-desce" onclick="lpIr('lp-eventos')" aria-label="Descer">${ico('baixo')}</button>
    </div>
    ${onda('creme')}
  </section>

  <section class="lp-sec" id="lp-eventos">
    <div class="lp-eyebrow">Eventos</div>
    <h2>Cada evento, uma galeria.</h2>
    <div class="lp-chips" id="lpChips"></div>
    <div class="lp-busca" id="lpBuscaW" hidden><input id="lpBusca" placeholder="Procurar por nome ou cidade" oninput="lpBusca=this.value;lpCards()"></div>
    <div id="lpCards"></div>
    <button class="lp-link" data-go="eventos">Ver todos os eventos ${ico('seta')}</button>
  </section>

  <section class="lp-sec lp-servicos" id="lp-servicos">
    <div class="lp-foto-onda">${imgTag(IMG.danca,'Convidados a dançar numa celebração')}${onda('creme')}</div>
    <div class="lp-eyebrow">Serviços</div>
    <h2>Uma solução para todos os eventos.</h2>
    <div class="lp-grid4">
      ${SERVICOS.map(([i,n,f,img])=>`<button class="lp-serv com-foto" onclick="lpCategoria('${f}')">${imgTag(img,'')}
        <span class="lp-serv-txt">${ico(i)}<span>${n}</span></span></button>`).join('')}
    </div>
    <button class="lp-barra" onclick="lpIr('lp-como')">${ico('imagem')}<span>Galerias organizadas com cuidado.</span><b>${ico('seta')}</b></button>
  </section>

  <section class="lp-sec" id="lp-como">
    <div class="lp-eyebrow">Como funciona</div>
    <h2>É simples.</h2>
    <ol class="lp-passos">
      ${[['nuvem','Envie as fotografias','Convidados e fotógrafos enviam pelo link ou QR Code do evento.'],
         ['engrenagem','Organizamos o conteúdo','Cada fotografia fica no momento certo do programa.'],
         ['imagem','Criamos a galeria','Uma página por evento, com programa, galeria e mural.'],
         ['partilha','Partilhamos o link','Um link para ver, outro para enviar — e downloads incluídos.']]
        .map(([i,t,d],k)=>`<li><span class="lp-num">0${k+1}</span><span class="lp-ic">${ico(i)}</span><div><b>${t}</b><small>${d}</small></div></li>`).join('')}
    </ol>
    <div class="lp-portatil"><div class="lp-ecra">${vit.lista.slice(0,6).map(f=>imgTag(f.src,'')).join('')}</div><div class="lp-base"></div></div>
  </section>

  <section class="lp-sec lp-galeria" id="lp-galeria">
    <div class="lp-slide">
      <div id="lpSlideImg">${imgTag(vit.lista[lpSlide].src,'Fotografia da galeria')}</div>
      <span class="lp-cont" id="lpCont">${lpSlide+1} / ${vit.lista.length}</span>
      <button class="lp-exp" onclick="lpExpandir()" aria-label="Ver em grande">${ico('expandir')}</button>
    </div>
    <div class="lp-miniaturas">${vit.lista.map((f,i)=>`<button class="${i===lpSlide?'on':''}" onclick="lpVerSlide(${i})" aria-label="Ver foto ${i+1}">${imgTag(f.src,'')}</button>`).join('')}</div>
    <div class="lp-eyebrow">Galeria</div>
    <h2>Os momentos do seu evento, um só lugar.</h2>
    <p class="lp-p">Aceda à galeria de forma rápida e partilhe com quem mais importa.</p>
    <button class="lp-btn" data-go="${vit.rota}">Ver galeria ${ico('seta')}</button>
  </section>

  <section class="lp-sec lp-fotografos" id="lp-fotografos">
    <div class="lp-foto-onda">${imgTag(IMG.flores,'Flores de casamento em tons suaves')}<span class="lp-selo">${ico('camara')}</span>${onda('creme')}</div>
    <div class="lp-eyebrow">Para fotógrafos</div>
    <h2>O seu trabalho merece destaque.</h2>
    <p class="lp-p">Disponibilize as suas fotografias através das nossas galerias: cada fotógrafo tem a sua página, publica directamente e o cliente recebe tudo organizado.</p>
    <button class="lp-btn" onclick="abrirPedido('fotografo')">Quero colaborar ${ico('seta')}</button>
  </section>

  <section class="lp-sec" id="lp-faq">
    <div class="lp-eyebrow">Perguntas frequentes</div>
    <h2>Tem dúvidas?</h2>
    <div class="lp-faq">
      ${[['Preciso de contratar um fotógrafo?','Não. Pode trazer o seu fotógrafo, trabalhar com um dos nossos parceiros, ou contar só com as fotografias dos convidados. A galeria junta tudo no mesmo lugar.'],
         ['Posso enviar fotografias que já tenho?','Sim. Envie pelo link ou QR Code do evento e cada fotografia fica arrumada no momento certo do programa.'],
         ['Como recebo o link da galeria?','Quando a galeria é criada, recebe o link da página do evento e os QR Codes: um para os convidados enviarem fotos, outro para cada fotógrafo e outro só para ver.'],
         ['Posso partilhar a galeria?','Sim. O link da página do evento pode ser partilhado com quem quiser, e as fotografias podem ser descarregadas — uma a uma, por momento ou o álbum completo.'],
         ['As fotos dos convidados aparecem logo?','Não. A organização revê e aprova cada envio antes de aparecer na galeria.']]
        .map(([p,r])=>`<details><summary>${p}<span>${ico('mais')}</span></summary><p>${r}</p></details>`).join('')}
    </div>
    <button class="lp-barra" onclick="abrirPedido('informacao')">${ico('conversa')}<span>Ainda tem dúvidas?<small>Fale connosco.</small></span><b>${ico('seta')}</b></button>
  </section>

  <section class="lp-final" id="lp-contacto">
    <h2>O próximo evento pode ter a sua própria galeria.</h2>
    <p>Solicite informações e descubra como podemos ajudar.</p>
    <button class="lp-btn" onclick="abrirPedido('informacao')">Solicitar informações ${ico('seta')}</button>
    ${wa?`<a class="lp-btn contorno" href="${esc(wa)}" target="_blank" rel="noopener">${ico('whatsapp')} Falar no WhatsApp</a>`:''}
    <div class="lp-rodape">
      <div class="lp-marca grande">${logoSvg()} Memória</div>
      <small>Galerias digitais para eventos.</small>
      ${sociais.length?`<div class="lp-sociais">${sociais.map(([k,n])=>`<a href="${esc(c[k])}" target="_blank" rel="noopener" aria-label="${n}">${ico(k)}</a>`).join('')}${wa?`<a href="${esc(wa)}" target="_blank" rel="noopener" aria-label="WhatsApp">${ico('whatsapp')}</a>`:''}</div>`:''}
      <button class="lp-org" onclick="abrirPrivacidade()">Privacidade e termos</button>
      ${NUVEM?'':'<small class="lp-credito">Algumas fotografias de demonstração: Adobe Stock (nível gratuito).</small>'}
    </div>
  </section>

  <nav class="lp-gaveta" id="lpGaveta" hidden>
    <button class="lp-menu-btn" onclick="lpMenu(false)" aria-label="Fechar menu">${ico('fechar')}</button>
    ${[['lp-topo','Início'],['lp-eventos','Eventos'],['lp-servicos','Serviços'],['lp-como','Como funciona'],['lp-galeria','Galeria'],
       ['lp-fotografos','Para fotógrafos'],['lp-faq','Perguntas frequentes'],['lp-contacto','Contacto']]
      .map(([id,n])=>`<button onclick="lpIr('${id}')">${n}</button>`).join('')}
  </nav></div>
  ${htmlDesktop(vit,wa,c,sociais)}`;
  lpChips(); lpCards();
}

function lpChips(){
  const cats=CATEGORIAS.filter(c=>eventosPublicos().some(e=>e.cat===c.id));
  if(lpCat!=='todas'&&!cats.some(c=>c.id===lpCat)) lpCat='todas';
  document.getElementById('lpChips').innerHTML=
    `<button class="${lpCat==='todas'?'on':''}" onclick="lpSetCat('todas')">Todos</button>`+
    cats.map(c=>`<button class="${lpCat===c.id?'on':''}" onclick="lpSetCat('${c.id}')">${CAT_CURTA[c.id]||c.n}</button>`).join('')+
    `<button class="lp-lupa" onclick="lpAbrirBusca()" aria-label="Procurar">${ico('busca')}</button>`;
}
function lpCards(){
  const b=lpBusca.trim().toLowerCase();
  const lista=eventosLanding().filter(e=>(lpCat==='todas'||e.cat===lpCat) &&
    (!b || (e.titulo+' '+e.local+' '+e.subs.map(s=>s.titulo).join(' ')).toLowerCase().includes(b))).slice(0,4);
  document.getElementById('lpCards').innerHTML = lista.length ? lista.map(e=>{
    const est=estadoEv(e), n=fotos.filter(f=>f.ev===e.id&&f.estado==='publicada').length;
    const disp=n>0, ds=e.subs.map(s=>s.data).filter(Boolean).sort();
    return `<button class="lp-card" data-go="evento/${e.id}">
      <div class="lp-card-img">${imgTag(capaDe(e),esc(e.titulo))}<span class="lp-badge ${disp?'':'breve'}">${disp?'Disponível':ESTADOS[est]}</span></div>
      <div class="lp-card-meta">${ico('cal')}<span>${ds.length?dataCurta(ds[0]):'Data por definir'}</span>${e.local?ico('pin')+'<span>'+esc(e.local)+'</span>':''}</div>
      <div class="lp-card-tit"><b>${esc(e.titulo)}</b><span class="lp-seta">${ico('seta')}</span></div>
    </button>`}).join('')
    : `<div class="lp-vazio">${eventosPublicos().length?'Nenhum evento encontrado.':'Os primeiros eventos aparecem aqui em breve.'}</div>`;
}
function lpSetCat(c){lpCat=c; lpChips(); lpCards()}
function lpAbrirBusca(){const w=document.getElementById('lpBuscaW'); w.hidden=!w.hidden; if(!w.hidden) document.getElementById('lpBusca').focus()}
function lpCategoria(c){ filtroCat=c; ir('eventos'); }
/* lpIr('lp-como') ou lpIr('lpd-como'): vai para a secção da versão que está visível (mobile ou computador) */
function lpIr(id){
  lpMenu(false);
  const nome=id.replace(/^lpd?-/,''), alvo=eDesktop()?'lpd-'+({eventos:'galerias',galeria:'galerias',fotografos:'contacto',faq:'contacto'}[nome]||nome):'lp-'+nome;
  if(alvo==='lpd-topo') return window.scrollTo({top:0,behavior:'smooth'});
  const el=document.getElementById(alvo)||document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}
function lpMenu(abrir){ const g=document.getElementById('lpGaveta'); if(g) g.hidden=!abrir; document.body.classList.toggle('sem-scroll',!!abrir); }
function lpVerSlide(i){
  const vit=fotosVitrine(); lpSlide=i;
  document.getElementById('lpSlideImg').innerHTML=imgTag(vit.lista[i].src,'Fotografia da galeria');
  document.getElementById('lpCont').textContent=(i+1)+' / '+vit.lista.length;
  document.querySelectorAll('.lp-miniaturas button').forEach((b,k)=>b.classList.toggle('on',k===i));
}
function lpExpandir(){
  const f=fotosVitrine().lista[lpSlide];
  if(f.id){ const x=fotos.find(y=>y.id===f.id); if(x){ seleccionar(x.ev,x.sub); return abrirLb(f.id); } }
  const lb=document.getElementById('lb'), im=document.getElementById('lbI');
  document.getElementById('lbV').style.display='none'; im.style.display=''; im.src=hi(f.src);
  document.getElementById('lbT').textContent='Fotografia de demonstração'; document.getElementById('lbS').textContent='';
  lbFoto=null; lb.classList.add('on');
}

/* ===================== VERSÃO DE COMPUTADOR (≥ 1000 px) =====================
   Bloco .lpd, desenhado a partir da maquete de desktop. A versão mobile (.lpm) fica igual.
   Ids das secções: lpd-<nome>; lpIr('lp-<nome>') escolhe a versão visível. */
Object.assign(IC,{
  folha:'<path d="M12 20c-1.5-3-1.5-7 0-11 1.5 4 1.5 8 0 11z"/><path d="M11.4 19.6C8 18 5.6 14.6 5.4 10.4c3.6 1.4 5.8 5 6 9.2z"/><path d="M12.6 19.6c3.4-1.6 5.8-5 6-9.2-3.6 1.4-5.8 5-6 9.2z"/><path d="M10.8 19C7 19.4 3.6 17.8 2 15c3-.8 6.6.6 8.8 4z"/><path d="M13.2 19c3.8.4 7.2-1.2 8.8-4-3-.8-6.6.6-8.8 4z"/>',
  aneis:'<circle cx="9" cy="14" r="5"/><circle cx="15" cy="14" r="5"/><path d="M10.5 5.5L12 4l1.5 1.5L12 7z"/>',
  bolo:'<path d="M4 20h16M5 20v-6a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 19 14v6"/><path d="M5 16c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0"/><path d="M8 12.5V9.5M12 12.5V9.5M16 12.5V9.5"/><path d="M8 7.2c.6-.7.6-1.4 0-2.2-.6.8-.6 1.5 0 2.2zM12 7.2c.6-.7.6-1.4 0-2.2-.6.8-.6 1.5 0 2.2zM16 7.2c.6-.7.6-1.4 0-2.2-.6.8-.6 1.5 0 2.2z"/>',
  cruz:'<path d="M12 3v18M7 8h10"/>',
  estrela:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  raio:'<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  escudo:'<path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>'
});
/* folha decorativa grande (ramo) */
const RAMO=`<svg viewBox="0 0 120 220" aria-hidden="true"><path d="M60 215C58 160 62 100 92 20" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M88 34c-18-4-30 6-32 22 18 3 30-6 32-22zM84 40c14-12 30-12 36-2-12 10-28 10-36 2z"/><path d="M76 74c-20-2-32 10-32 26 20 1 32-10 32-26zM74 78c14-14 32-14 40-4-12 12-30 12-40 4z"/>
<path d="M66 116c-20 0-30 13-29 29 20 0 30-13 29-29zM66 120c14-13 32-12 39-2-13 11-30 11-39 2z"/><path d="M62 158c-19 1-28 14-26 30 19-1 28-14 26-30zM62 162c13-12 30-10 36 0-12 10-28 9-36 0z"/></svg>`;

function htmlDesktop(vit,wa,c,sociais){
  const fotosEv=e=>fotos.filter(f=>f.ev===e.id&&f.estado==='publicada').length;
  const destaque=eventosLanding().filter(e=>!(e.perm&&e.perm.galeria===false)&&fotosEv(e)>0)
    .sort((a,b)=>fotosEv(b)-fotosEv(a)).slice(0,3);
  const th=vit.lista.map(f=>f.src);
  const t=i=>th[i%th.length];
  const ecra=(n,cls)=>`<div class="${cls}">${Array.from({length:n},(_,i)=>imgTag(t(i),'')).join('')}</div>`;
  const aparelhos=(cls)=>`<div class="lpd-aparelhos ${cls||''}" aria-hidden="true">
      <div class="lpd-portatil"><div class="lpd-moldura"><div class="lpd-barra-app"><i></i>Memória</div>${ecra(12,'lpd-ecra')}</div><div class="lpd-teclado"></div></div>
      <div class="lpd-telemovel"><div class="lpd-barra-app"><i></i></div>${ecra(8,'lpd-ecra tel')}</div>
    </div>`;
  const servicos=SERVICOS;
  const faq=[['O que é uma galeria digital de eventos?','É uma página própria para o seu evento, com o programa e todas as fotografias e vídeos arrumados por momento, para ver, descarregar e partilhar.'],
    ['Posso enviar fotografias do meu telemóvel?','Sim. Pelo link ou QR Code do evento, directamente no telemóvel e sem instalar nada. As fotografias dos convidados aparecem depois de aprovadas pela organização.'],
    ['Como recebo o link da galeria?','Quando a galeria é criada, recebe o link da página do evento e os QR Codes: um para os convidados enviarem fotos, outro para cada fotógrafo e outro só para ver.'],
    ['Posso partilhar a galeria com os convidados?','Sim. O link da página do evento pode ser partilhado com quem quiser, e as fotografias podem ser descarregadas uma a uma, por momento ou o álbum completo.'],
    ['Como posso contactar o serviço?','Carregue em “Solicitar informações”'+(wa?' ou fale connosco pelo WhatsApp':'')+' e deixe o seu contacto. Respondemos em breve.']];
  const menu=[['lpd-topo','Início'],['lpd-servicos','Serviços'],['lpd-galerias','Galerias'],['lpd-como','Como funciona'],['lpd-sobre','Sobre nós'],['lpd-contacto','Contactos']];
  const polaroids=[IMG.danca,IMG.flores,IMG.dancaMz,IMG.batizado];
  return `<div class="lpd">
  <header class="lpd-topo">
    <div class="lpd-marca" data-go="inicio">${logoSvg('lpd-logo')}Memória</div>
    <nav>${menu.map(([id,n],i)=>`<button class="${i===0?'on':''}" data-sec="${id}" onclick="lpIr('${id}')">${n}</button>`).join('')}</nav>
    <button class="lpd-btn" onclick="abrirPedido('galeria')">Solicitar uma galeria ${ico('seta')}</button>
  </header>

  <section class="lpd-hero" id="lpd-topo">
    <div class="lpd-hero-img">${imgTag('assets/img/hero-noivos.jpg','Noivos sorriem, testa com testa, no dia do casamento','',true)}</div>
    <div class="lpd-in lpd-hero-txt">
      <h1>Cada evento tem momentos que merecem ser encontrados.</h1>
      <p>Organizamos fotografias de eventos em galerias digitais, para que possa aceder, visualizar e partilhar.</p>
      <div class="lpd-acts">
        <button class="lpd-btn" onclick="abrirPedido('galeria')">Solicitar uma galeria ${ico('seta')}</button>
        <button class="lpd-btn contorno" data-go="eventos">Explorar eventos</button>
      </div>
    </div>
    <svg class="lpd-onda" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60C260 90 520 30 760 52S1180 96 1440 20V90H0z"/></svg>
    <svg class="lpd-traco" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10C120 20 250 40 400 58" fill="none"/></svg>
  </section>

  <section class="lpd-in lpd-sec" id="lpd-galerias">
    <div class="lpd-eb">Galerias em destaque</div>
    <div class="lpd-cab"><h2>Momentos inesquecíveis.</h2>
      <button class="lpd-link" onclick="catModo='galerias';ir('eventos')">Ver todas as galerias ${ico('seta')}</button></div>
    ${destaque.length?`<div class="lpd-destaques">${destaque.map(e=>{const n=fotosEv(e), ds=e.subs.map(s=>s.data).filter(Boolean).sort();
      return `<button class="lpd-destaque" data-go="evento/${e.id}">${imgTag(capaDe(e),esc(e.titulo))}
        <span class="lpd-destaque-txt"><b>${esc(typeof tituloLongo==='function'?tituloLongo(e):e.titulo)}</b>
          <span class="lpd-destaque-meta"><span>${ico('cal')}${ds.length?dataCurta(ds[0]):'Data por definir'}</span>${e.local?`<span>${ico('pin')}${esc(e.local)}</span>`:''}
          <span class="lpd-n">${ico('imagem')}${n} ${n===1?'foto':'fotos'}</span></span></span></button>`}).join('')}</div>`
      :'<div class="lp-vazio">Os primeiros eventos aparecem aqui em breve.</div>'}
  </section>

  <section class="lpd-in lpd-sec lpd-servicos" id="lpd-servicos">
    <div class="lpd-servicos-txt">
      <div class="lpd-eb">Serviços</div>
      <h2>Uma solução para diferentes momentos e ocasiões.</h2>
      <p>Registe, partilhe e preserve os momentos mais importantes da sua vida.</p>
      <i class="lpd-risco"></i>
    </div>
    <div class="lpd-servicos-grelha">${servicos.map(([i,n,f,img])=>`<button class="lpd-serv" onclick="lpCategoria('${f}')">${imgTag(img,'')}
      <span>${ico(i)}<b>${n}</b></span></button>`).join('')}</div>
  </section>

  <section class="lpd-in lpd-sec lpd-como" id="lpd-como">
    <div><div class="lpd-eb">Como funciona</div><h2>Em 4 passos simples.</h2></div>
    <ol class="lpd-passos">${[['camara','Recebemos as fotografias'],['engrenagem','Organizamos o conteúdo'],['imagem','Criamos e publicamos a galeria'],['partilha','Partilhamos o link']]
      .map(([i,n],k)=>`${k?`<li class="lpd-seta" aria-hidden="true">${ico('seta')}</li>`:''}<li class="lpd-passo"><span class="lpd-num">${k+1}</span>${ico(i)}<span>${n}</span></li>`).join('')}</ol>
  </section>

  <section class="lpd-faixa lpd-escura" id="lpd-sobre">
    <div class="lpd-in lpd-faixa-in">
      <div>
        <h2>As fotografias do seu evento, organizadas num só lugar.</h2>
        <ul class="lpd-vantagens">${[['raio','Acesso rápido'],['partilha','Partilha simples'],['escudo','Seguro e organizado']]
          .map(([i,n])=>`<li><span>${ico(i)}</span>${n}</li>`).join('')}</ul>
        <button class="lpd-btn" onclick="lpIr('lpd-como')">Saber mais ${ico('seta')}</button>
      </div>
      <div class="lpd-faixa-arte"><span class="lpd-ramo a">${RAMO}</span>${aparelhos()}<span class="lpd-ramo b">${RAMO}</span></div>
    </div>
  </section>

  <section class="lpd-experiencia">
    <div class="lpd-in lpd-exp-in">
      ${aparelhos('claro')}
      <div>
        <div class="lpd-eb">A experiência</div>
        <h2>Transforme fotografias em memórias para sempre.</h2>
        <p>Reviva os melhores momentos do seu evento, em qualquer lugar.</p>
        <button class="lpd-btn" data-go="${vit.rota}">Explorar galeria ${ico('seta')}</button>
      </div>
    </div>
  </section>

  <section class="lpd-faixa lpd-escura lpd-ocasioes">
    <div class="lpd-in lpd-faixa-in">
      <div>
        <h2>Uma solução para todas as ocasiões.</h2>
        <button class="lpd-btn" onclick="lpIr('lpd-servicos')">Explorar serviços ${ico('seta')}</button>
      </div>
      <div class="lpd-polaroids" aria-hidden="true">${polaroids.map(p=>`<span>${imgTag(p,'')}</span>`).join('')}</div>
    </div>
  </section>

  <section class="lpd-in lpd-sec lpd-dupla">
    <div class="lpd-parceria">
      <div class="lpd-parceria-foto">${imgTag(IMG.flores,'Flores de casamento em tons suaves')}</div>
      <div>
        <div class="lpd-eb">Parceria</div>
        <h3>O seu trabalho merece uma apresentação à altura.</h3>
        <p>Mostre o seu talento através da Memória.</p>
        <button class="lpd-btn contorno" onclick="abrirPedido('fotografo')">Quero colaborar ${ico('seta')}</button>
      </div>
    </div>
    <div class="lpd-faq">
      <div class="lpd-eb">Perguntas frequentes</div>
      <h3>Tire as suas dúvidas</h3>
      ${faq.map(([p,r])=>`<details><summary>${p}<span>${ico('mais')}</span></summary><p>${r}</p></details>`).join('')}
    </div>
  </section>

  <section class="lpd-cta" id="lpd-contacto">
    <span class="lpd-ramo c">${RAMO}</span>
    <div class="lpd-in lpd-cta-in">
      <h2>O próximo evento pode ter a sua própria galeria.</h2>
      <div class="lpd-acts">
        <button class="lpd-btn" onclick="abrirPedido('informacao')">Solicitar informações ${ico('seta')}</button>
        ${wa?`<a class="lpd-btn contorno" href="${esc(wa)}" target="_blank" rel="noopener">${ico('whatsapp')} Falar no WhatsApp</a>`:''}
      </div>
    </div>
    <span class="lpd-ramo d">${RAMO}</span>
  </section>

  <footer class="lpd-rodape">
    <div class="lpd-in lpd-rodape-in">
      <div class="lpd-rodape-marca">
        <div class="lpd-marca">${logoSvg('lpd-logo')}Memória</div>
        <small>Galerias Digitais de Eventos<br>Preservando momentos, criando histórias.</small>
      </div>
      ${sociais.length||wa?`<div class="lpd-sociais">${sociais.map(([k,n])=>`<a href="${esc(c[k])}" target="_blank" rel="noopener" aria-label="${n}">${ico(k)}</a>`).join('')}${wa?`<a href="${esc(wa)}" target="_blank" rel="noopener" aria-label="WhatsApp">${ico('whatsapp')}</a>`:''}</div>`:''}
      <nav class="lpd-rodape-nav">${menu.map(([id,n])=>`<button onclick="lpIr('${id}')">${n}</button>`).join('')}</nav>
      <div class="lpd-rodape-cats"><b>Categorias de Eventos</b>
        <p>${CATEGORIAS.map(x=>`<button onclick="lpCategoria('${x.id}')">${esc(CAT_CURTA[x.id]||x.n)}</button>`).join(' · ')}</p></div>
    </div>
    <div class="lpd-in lpd-rodape-fim">
      <small>© ${new Date().getFullYear()} Memória. Todos os direitos reservados.${NUVEM?'':' Fotografias de demonstração: Adobe Stock (nível gratuito).'}</small>
    </div>
  </footer>
</div>`;
}
function eDesktop(){return window.matchMedia('(min-width:1000px)').matches}

/* ---------- pedidos (formulário) ---------- */
const PEDIDO_TXT={
  galeria:['Solicitar uma galeria','Conte-nos sobre o evento. Respondemos com uma proposta.'],
  fotografo:['Quero colaborar','Fale-nos do seu trabalho. Entramos em contacto para criar a sua página de fotógrafo.'],
  informacao:['Fale connosco','Deixe a sua pergunta e o contacto. Respondemos em breve.']
};
function abrirPedido(tipo){
  lpMenu(false);
  const [t,d]=PEDIDO_TXT[tipo]||PEDIDO_TXT.informacao, foto=tipo==='fotografo';
  let m=document.getElementById('pedido'); if(!m){ m=document.createElement('div'); m.id='pedido'; document.body.appendChild(m); }
  m.className='lp-folha on';
  m.innerHTML=`<div class="lp-folha-fundo" onclick="fecharPedido()"></div>
  <form class="lp-folha-caixa" onsubmit="event.preventDefault();enviarPedido('${tipo}')">
    <button type="button" class="lp-menu-btn" onclick="fecharPedido()" aria-label="Fechar">${ico('fechar')}</button>
    <div class="lp-eyebrow">${foto?'Para fotógrafos':'Pedido'}</div>
    <h2>${t}</h2><p class="lp-p">${d}</p>
    <div class="lp-armadilha" aria-hidden="true"><label>Não preencher <input id="pdSiteWeb" tabindex="-1" autocomplete="off"></label></div>
    <label class="field"><span>Nome${foto?' / estúdio':''}</span><input id="pdNome" required maxlength="120" autocomplete="name"></label>
    <label class="field"><span>Telefone, WhatsApp ou email</span><input id="pdContacto" required maxlength="160" autocomplete="tel"></label>
    ${tipo==='galeria'?`<div class="grid-f">
      <label class="field"><span>Tipo de evento</span><select id="pdTipo">${Object.keys(TIPOS).map(k=>`<option>${TIPOS[k].n}</option>`).join('')}<option>Outro</option></select></label>
      <label class="field"><span>Data prevista</span><input id="pdData" type="date"></label></div>`:''}
    <label class="field"><span>${foto?'Portefólio, redes ou mensagem':'Mensagem'}</span><textarea id="pdMsg" maxlength="2000"></textarea></label>
    <p class="tiny" style="margin:0 0 12px;color:#6F6259">Usamos estes dados só para responder ao pedido. <button type="button" class="lp-link-txt" onclick="abrirPrivacidade()">Privacidade</button></p>
    <button class="lp-btn largo" type="submit">Enviar ${ico('seta')}</button>
  </form>`;
  document.body.classList.add('sem-scroll');
  setTimeout(()=>{const i=document.getElementById('pdNome'); if(i) i.focus()},50);
}
function fecharPedido(){const m=document.getElementById('pedido'); if(m) m.className='lp-folha'; document.body.classList.remove('sem-scroll')}
async function enviarPedido(tipo){
  const p={tipo, nome:val('pdNome'), contacto:val('pdContacto'), tipo_evento:val('pdTipo')||null,
           data_evento:val('pdData')||null, mensagem:val('pdMsg')||null};
  if(!p.nome||p.contacto.length<3){toast('Preenche o nome e um contacto.');return}
  const armadilha=val('pdSiteWeb');            // só robôs preenchem este campo invisível
  if(armadilha){ fecharPedido(); toast('Pedido enviado. Obrigado — entraremos em contacto.'); return; }
  if(NUVEM){
    toast('A enviar…');
    const r=await NUVEM.from('pedidos').insert(p);
    if(r.error){
      console.warn('pedido:', r.error.code);   // sem dados pessoais na consola
      toast(r.error.code==='P0001' ? r.error.message : 'Não foi possível enviar o pedido. Tente de novo dentro de alguns minutos.');
      return;
    }
  }else{
    PEDIDOS.unshift(Object.assign({id:'p'+Date.now(), estado:'novo', criado_em:new Date().toISOString()},p));
    try{ localStorage.setItem(CHAVE_PEDIDOS,JSON.stringify(PEDIDOS)); }catch(e){}
  }
  fecharPedido();
  toast(NUVEM?'Pedido enviado. Obrigado — entraremos em contacto.':'Pedido guardado (demonstração: fica só neste navegador).');
}
function carregarPedidosLocais(){ try{ PEDIDOS=JSON.parse(localStorage.getItem(CHAVE_PEDIDOS)||'[]'); }catch(e){ PEDIDOS=[]; } }

/* ---------- pedidos no painel ---------- */
function htmlPedidos(){
  const tipoTxt={galeria:'Galeria', fotografo:'Fotógrafo', informacao:'Informação'};
  return PEDIDOS.length ? PEDIDOS.map(p=>`<div class="card pedido ${p.estado}">
    <div class="adm-ev-tit"><b>${esc(p.nome)}</b><span class="estado">${tipoTxt[p.tipo]||p.tipo}</span>
      <span class="estado ${p.estado==='novo'?'decorrer':''}">${p.estado}</span>
      <span class="tiny muted" style="margin-left:auto">${new Date(p.criado_em).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'})}</span></div>
    <div class="small">${esc(p.contacto)}${p.tipo_evento?' · '+esc(p.tipo_evento):''}${p.data_evento?' · '+dataCurta(p.data_evento):''}</div>
    ${p.mensagem?`<p class="small muted" style="margin:6px 0 0;white-space:pre-wrap">${esc(p.mensagem)}</p>`:''}
    <div style="display:flex;gap:7px;margin-top:10px;flex-wrap:wrap">
      ${p.estado!=='respondido'?`<button class="btn sm" onclick="marcarPedido('${p.id}','respondido')">Marcar como respondido</button>`:''}
      ${p.estado!=='arquivado'?`<button class="btn ghost sm" onclick="marcarPedido('${p.id}','arquivado')">Arquivar</button>`:''}
    </div></div>`).join('')
    : '<div class="empty">Ainda não chegaram pedidos pela página inicial.</div>';
}
function marcarPedido(id,estado){
  if(NUVEM) return naNuvem(()=>nv.upd('pedidos',id,{estado}),'Pedido actualizado.');
  const p=PEDIDOS.find(x=>x.id===id); if(p) p.estado=estado;
  try{ localStorage.setItem(CHAVE_PEDIDOS,JSON.stringify(PEDIDOS)); }catch(e){}
  renderAdmin();
}

/* ---------- barra de topo fixa (versão de computador) ----------
   Segue o scroll; enquanto a página se move fica translúcida, quando pára volta a ficar opaca.
   O item do menu da secção visível fica marcado. */
(function(){
  let parar=null, pedido=false;
  function actualizar(){
    pedido=false;
    const topo=document.querySelector('#view-inicio.on .lpd-topo');
    if(!topo || !eDesktop()) return;
    topo.classList.toggle('fixo', window.scrollY>8);
    const ids=['lpd-galerias','lpd-servicos','lpd-como','lpd-sobre','lpd-contacto'];
    let act='lpd-topo';
    ids.forEach(id=>{ const el=document.getElementById(id); if(el && el.getBoundingClientRect().top<140) act=id; });
    if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4) act='lpd-contacto';
    topo.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.sec===act));
  }
  window.addEventListener('scroll',()=>{
    const topo=document.querySelector('#view-inicio.on .lpd-topo'); if(!topo) return;
    if(window.scrollY>8) topo.classList.add('a-rolar');
    clearTimeout(parar); parar=setTimeout(()=>topo.classList.remove('a-rolar'),180);
    if(!pedido){ pedido=true; requestAnimationFrame(actualizar); }
  },{passive:true});
})();

/* ---------- privacidade e termos ----------
   Texto-modelo: rever com quem é juridicamente responsável antes do lançamento. */
function aceitouTermos(){
  const c=document.getElementById('upAceito');
  if(c && !c.checked){ toast('Confirma primeiro que podes partilhar estas fotografias.'); c.focus(); return false; }
  return true;
}
function abrirPrivacidade(){
  let m=document.getElementById('privacidade'); if(!m){ m=document.createElement('div'); m.id='privacidade'; document.body.appendChild(m); }
  m.className='lp-folha on';
  m.innerHTML=`<div class="lp-folha-fundo" onclick="fecharPrivacidade()"></div>
  <div class="lp-folha-caixa lp-texto-legal">
    <button type="button" class="lp-menu-btn" onclick="fecharPrivacidade()" aria-label="Fechar">${ico('fechar')}</button>
    <div class="lp-eyebrow">Memória</div>
    <h2>Privacidade e termos</h2>
    <h3>O que recolhemos</h3>
    <p>As fotografias e vídeos que envia, o nome com que quer aparecer, o momento do programa e quem está a enviar (convidado, MC ou fotógrafo).
       Nos pedidos da página inicial: nome, contacto e mensagem. Contamos as visitas a cada evento sem guardar dados pessoais.</p>
    <h3>Para quê</h3>
    <p>Para mostrar a galeria do evento organizada por momentos, permitir o download do álbum e responder aos pedidos. Não vendemos nem cedemos estes dados.</p>
    <h3>Quem vê</h3>
    <p>A organização do evento vê tudo o que é enviado e decide o que é publicado. O público só vê o que foi aprovado, e apenas se a galeria do evento for pública.</p>
    <h3>Onde fica guardado</h3>
    <p>Num servidor seguro do nosso fornecedor de alojamento (Supabase), num espaço privado. As fotografias só ficam acessíveis através de links temporários.</p>
    <h3>Ao enviar fotografias</h3>
    <p>Confirma que tirou as fotografias ou tem autorização para as partilhar, e que as pessoas que aparecem aceitam ser mostradas.
       Para crianças é precisa a autorização de quem é responsável por elas. A organização pode recusar ou retirar qualquer fotografia.</p>
    <h3>Os seus direitos</h3>
    <p>Pode pedir, a qualquer momento, que uma fotografia sua ou os seus dados sejam retirados ou apagados. Fale com a organização do evento
       ou use <button type="button" class="lp-link-txt" onclick="fecharPrivacidade();abrirPedido('informacao')">o formulário de contacto</button>.</p>
  </div>`;
  document.body.classList.add('sem-scroll');
}
function fecharPrivacidade(){const m=document.getElementById('privacidade'); if(m) m.className='lp-folha'; if(!document.querySelector('.lp-folha.on')) document.body.classList.remove('sem-scroll')}


/* ---------- cabeçalho da página inicial (mobile) ----------
   Fica fixo e acompanha o scroll: transparente por cima da foto do topo;
   translúcido enquanto há scroll; visível (fundo creme) quando o scroll pára. */
let lpTopoTimer=null;
function lpTopoScroll(){
  const t=document.getElementById('lpTopo');
  if(!t || vistaActual!=='inicio') return;
  const hero=document.getElementById('lp-topo'), limite=Math.max(80,hero?hero.offsetHeight-70:200);
  t.classList.toggle('solida', window.scrollY>limite);
  t.classList.add('a-mexer');
  clearTimeout(lpTopoTimer);
  lpTopoTimer=setTimeout(()=>t.classList.remove('a-mexer'),260);
}
window.addEventListener('scroll',lpTopoScroll,{passive:true});
