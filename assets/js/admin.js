/* Painel do administrador — fluxo v1.0
   Secções: Dashboard · Eventos · Galerias · Contribuições · Vídeos · Pedidos · Definições
   Dentro de um evento (passos do fluxo): Informações · Programa · QR Code · Contribuições ·
   Vídeos · Actividade · Permissões · Publicar · Fotógrafos · Avançado */

const SECCOES_PAINEL=['dashboard','eventos','novo','modelos','galerias','contribuicoes','videos','pedidos','site','definicoes'];
var pnContribTab='pendente', pnGrafTab='visitas', pnVideoTipo='upload';  // var: lidas pelos botões (onclick)

/* ---------- utilitários ---------- */
const PERM_COL={envios:'permitir_envios', videos:'mostrar_videos', galeria:'galeria_publica'};
const ETIQ={fotografo:'Fotógrafo', mc:'MC', convidado:'Convidado'};
function pnEv(){return ev()}
function pnContribuicoes(e){return fotos.filter(f=>f.ev===e.id && f.origem==='participante')}
function pnVisitas(e){return (e.visitasDia||[]).reduce((n,v)=>n+v.n,0)}
function pnNum(n){return n>=1e6?(n/1e6).toFixed(1).replace('.0','')+'M':n>=1e3?(n/1e3).toFixed(1).replace('.0','')+'K':String(n)}
function pnDias(n){const out=[]; for(let i=n-1;i>=0;i--) out.push(new Date(Date.now()-i*864e5).toISOString().slice(0,10)); return out}
function pnTog(on,acao,rotulo,ajuda){
  return `<label class="pn-perm"><span><b>${rotulo}</b>${ajuda?`<small>${ajuda}</small>`:''}</span>
    <span class="pn-tog"><input type="checkbox" ${on?'checked':''} onchange="${acao}"><i></i></span></label>`;
}
function pnEstadoPub(e){return e.publico===false?'<span class="pn-pill rascunho">Rascunho</span>':'<span class="pn-pill ok">Publicado</span>'}

/* registo de visualizações (chamado pela página do evento) */
function registarVisita(e){
  if(!e) return;
  const k='memoria.visto.'+(e.uid||e.id);
  try{ if(sessionStorage.getItem(k)) return; sessionStorage.setItem(k,'1'); }catch(_){}
  if(NUVEM){ if(e.uid && e.publico!==false && !souAdmin) NUVEM.rpc('registar_visita',{p_evento_id:e.uid}).then(()=>{},()=>{}); return; }
  const hoje=new Date().toISOString().slice(0,10), v=(e.visitasDia=e.visitasDia||[]).find(x=>x.dia===hoje);
  if(v) v.n++; else e.visitasDia.push({dia:hoje, n:1});
  guardar();
}

/* ---------- gráfico (SVG) ---------- */
function pnGrafico(series,labels){
  const W=600,H=180,P=28, max=Math.max(1,...series.flatMap(s=>s.v));
  const x=i=>P+i*(W-2*P)/Math.max(1,labels.length-1), y=v=>H-P-(v/max)*(H-2*P);
  const grelha=[0,.5,1].map(f=>`<line x1="${P}" x2="${W-P}" y1="${y(max*f)}" y2="${y(max*f)}" class="pn-g-linha"/>
    <text x="${P-6}" y="${y(max*f)+4}" class="pn-g-txt" text-anchor="end">${pnNum(Math.round(max*f))}</text>`).join('');
  const eixos=labels.map((l,i)=>i%3===0||i===labels.length-1?`<text x="${x(i)}" y="${H-8}" class="pn-g-txt" text-anchor="middle">${l}</text>`:'').join('');
  const linhas=series.map(s=>{
    const pts=s.v.map((v,i)=>x(i)+','+y(v)).join(' ');
    return `<polygon points="${P},${H-P} ${pts} ${W-P},${H-P}" fill="${s.cor}" opacity=".12"/>
      <polyline points="${pts}" fill="none" stroke="${s.cor}" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="${x(s.v.length-1)}" cy="${y(s.v[s.v.length-1])}" r="4" fill="${s.cor}"/>`;}).join('');
  return `<svg class="pn-grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico">${grelha}${linhas}${eixos}</svg>`;
}
function pnSerieVisitas(lista,dias){return dias.map(d=>lista.reduce((n,e)=>n+((e.visitasDia||[]).find(v=>v.dia===d)||{n:0}).n,0))}
function pnSerieContrib(lista,dias){return dias.map(d=>fotos.filter(f=>f.origem==='participante'&&f.criado&&String(f.criado).slice(0,10)===d&&lista.some(e=>e.id===f.ev)).length)}
function pnRotulos(dias){return dias.map(d=>d.slice(8,10)+'/'+d.slice(5,7))}

/* =====================================================================
   ESTRUTURA
   ===================================================================== */
function renderPainel(emEvento){
  const pend=fotos.filter(f=>f.estado==='pendente').length, novos=PEDIDOS.filter(p=>p.estado==='novo').length;
  const itens=[['dashboard','📊','Dashboard'],['eventos','📅','Eventos'],['galerias','🖼️','Galerias'],
               ['contribuicoes','📥','Contribuições',pend],['videos','🎬','Vídeos'],['pedidos','✉️','Pedidos',novos],['site','🏠','Página inicial'],['definicoes','⚙️','Definições']];
  const activo=emEvento?'eventos':(admAba==='novo'||admAba==='modelos'?'eventos':admAba);
  document.getElementById('admRoot').innerHTML=`<div class="pn">
    <aside class="pn-lado">
      <div class="pn-marca"><i></i> Memória</div>
      <nav>${itens.map(([k,ic,n,c])=>`<button class="${activo===k?'on':''}" data-go="${k==='dashboard'?'admin':'admin/'+k}">
        <span class="pn-ic">${ic}</span>${n}${c?`<b class="pn-badge">${c}</b>`:''}</button>`).join('')}</nav>
      <button class="pn-novo" data-go="admin/novo">+ Novo evento</button>
    </aside>
    <div class="pn-corpo">${emEvento?pnEvento():pnSeccao()}</div>
  </div>`;
  document.querySelectorAll('[id^="qrd-"]').forEach(el=>desenharQR(el,el.dataset.url));
}
function pnSeccao(){
  switch(admAba){
    case 'eventos': return pnTitulo('Eventos','Todos os eventos, por categoria.')+htmlListaEventos();
    case 'novo': return pnTitulo('Criar evento','Passo 2 do fluxo: configure as informações do evento.')+htmlNovo();
    case 'modelos': return pnTitulo('Tipos e modelos','')+htmlModelos();
    case 'galerias': return pnGalerias();
    case 'contribuicoes': return pnTitulo('Contribuições','Fotografias enviadas pelos convidados, em todos os eventos.')+pnContribHtml(EVENTOS,true);
    case 'videos': return pnVideosGlobal();
    case 'pedidos': return pnTitulo('Pedidos','Pedidos recebidos pela página inicial.')+htmlPedidos();
    case 'site': return pnSite();
    case 'definicoes': return pnDefinicoes();
    default: return pnDashboard();
  }
}
function pnTitulo(t,sub,extra){return `<div class="pn-cab"><div><h2>${t}</h2>${sub?`<p class="muted small">${sub}</p>`:''}</div>${extra||''}</div>`}

/* ---------- 1 · Dashboard ---------- */
function pnDashboard(){
  const nome=NUVEM&&sessao&&sessao.user?String(sessao.user.email||'').split('@')[0]:'Admin';
  const contrib=fotos.filter(f=>f.origem==='participante').length, pend=fotos.filter(f=>f.estado==='pendente').length;
  const vis=EVENTOS.reduce((n,e)=>n+pnVisitas(e),0), dias=pnDias(14);
  const proximos=EVENTOS.slice().filter(e=>estadoEv(e)!=='encerrado').sort((a,b)=>intervaloDatas(a).localeCompare(intervaloDatas(b))).slice(0,4);
  return `${pnTitulo('Bem-vindo, '+esc(nome)+'!','Visão geral de todos os eventos.',`<button class="btn sm" data-go="admin/novo">+ Novo evento</button>`)}
    <div class="pn-stats">
      ${[['📅',EVENTOS.length,'Eventos'],['👁️',pnNum(vis),'Visualizações'],['📥',pnNum(contrib),'Contribuições'],['⏳',pend,'Por aprovar']]
        .map(([i,v,l])=>`<div class="card pn-stat"><span>${i}</span><b>${v}</b><small>${l}</small></div>`).join('')}
    </div>
    <div class="card pn-bloco">
      <div class="pn-bloco-cab"><b>Últimos 14 dias</b>
        <span class="pn-legenda"><i style="background:#C8582B"></i>Visualizações <i style="background:#3F7F86"></i>Contribuições</span></div>
      ${pnGrafico([{cor:'#C8582B',v:pnSerieVisitas(EVENTOS,dias)},{cor:'#3F7F86',v:pnSerieContrib(EVENTOS,dias)}],pnRotulos(dias))}
      ${NUVEM?'':'<p class="tiny muted">Modo demonstração: as visualizações dos eventos de exemplo são fictícias.</p>'}
    </div>
    <div class="pn-duas">
      <div class="card pn-bloco"><b>Próximos eventos</b>
        ${proximos.length?proximos.map(e=>`<button class="pn-linha" data-go="admin/${e.id}">${imgTag(capaDe(e),'')}<span><b>${esc(e.titulo)}</b><small>${intervaloDatas(e)} · ${pnEstadoPub(e)}</small></span></button>`).join('')
          :'<p class="muted small">Sem eventos por realizar.</p>'}
      </div>
      <div class="card pn-bloco"><b>Por aprovar</b>
        ${pend?EVENTOS.filter(e=>fotos.some(f=>f.ev===e.id&&f.estado==='pendente')).map(e=>{const n=fotos.filter(f=>f.ev===e.id&&f.estado==='pendente').length;
          return `<button class="pn-linha" onclick="pnIrEvento('${e.id}','contrib')"><span class="pn-num">${n}</span><span><b>${esc(e.titulo)}</b><small>fotografias à espera</small></span></button>`}).join('')
          :'<p class="muted small">Nada por aprovar. Galerias em dia.</p>'}
        ${PEDIDOS.some(p=>p.estado==='novo')?`<button class="pn-linha" data-go="admin/pedidos"><span class="pn-num">${PEDIDOS.filter(p=>p.estado==='novo').length}</span><span><b>Pedidos novos</b><small>vindos da página inicial</small></span></button>`:''}
      </div>
    </div>`;
}
function pnIrEvento(id,aba){ admEvAba=aba; ir('admin/'+id); }

/* ---------- Galerias ---------- */
function pnGalerias(){
  return pnTitulo('Galerias','Fotografias publicadas por evento, com download do álbum.')+
    (EVENTOS.length?`<div class="pn-galerias">${EVENTOS.map(e=>{
      const pub=fotos.filter(f=>f.ev===e.id&&f.estado==='publicada');
      return `<div class="card pn-gal">
        <div class="pn-gal-img">${pub.slice(0,4).map(f=>midia(f,'')).join('')||imgTag(capaDe(e),'')}</div>
        <div class="pn-gal-txt"><b>${esc(e.titulo)}</b><small>${pub.length} publicadas · ${e.subs.length} ${e.subs.length===1?'parte':'partes'}</small>
          <div class="pn-acts"><button class="btn sm" onclick="pnIrEvento('${e.id}','alb')">Álbum & downloads</button>
          <button class="btn ghost sm" data-go="evento/${e.id}">Ver galeria</button></div></div></div>`}).join('')}</div>`
      :'<div class="empty">Ainda não há eventos.</div>');
}

/* ---------- Vídeos (todos os eventos) ---------- */
function pnVideosGlobal(){
  const todos=EVENTOS.flatMap(e=>(e.videos||[]).map(v=>({e,v})));
  return pnTitulo('Vídeos','Vídeos oficiais e transmissões em directo de todos os eventos.')+
    (todos.length?todos.map(({e,v})=>pnLinhaVideo(e,v,true)).join(''):'<div class="empty">Ainda não há vídeos. Abre um evento → Vídeos para adicionar.</div>')+
    `<div class="pn-acts" style="margin-top:14px">${EVENTOS.map(e=>`<button class="btn ghost sm" onclick="pnIrEvento('${e.id}','videos')">+ ${esc(e.titulo)}</button>`).join('')}</div>`;
}

/* ---------- Definições ---------- */
function pnDefinicoes(){
  const c=contacto();
  return pnTitulo('Definições','')+`<div class="pn-duas">
    <div class="card pn-bloco"><b>Conta</b>
      ${NUVEM?`<p class="small">Sessão: ${esc(sessao&&sessao.user?sessao.user.email:'')}</p><button class="btn ghost sm" onclick="sair()">Terminar sessão</button>`
        :`<p class="small muted">Modo demonstração: sem contas. Os dados ficam só neste navegador.</p><button class="btn ghost sm" onclick="reporDemo()">Repor demonstração</button>`}
    </div>
    <div class="card pn-bloco"><b>Contactos da página inicial</b>
      <p class="small muted">Editam-se em <code>assets/js/config.js</code> (bloco CONTACTO).</p>
      <p class="small">WhatsApp: ${esc(c.whatsapp||'—')}<br>Instagram: ${esc(c.instagram||'—')}<br>YouTube: ${esc(c.youtube||'—')}<br>Facebook: ${esc(c.facebook||'—')}</p>
    </div>
    <div class="card pn-bloco"><b>Tipos e modelos de evento</b>
      <p class="small muted">Categorias, tipos e modelos de programa disponíveis ao criar eventos.</p>
      <button class="btn ghost sm" data-go="admin/modelos">Ver tipos e modelos</button>
    </div>
  </div>`;
}

/* =====================================================================
   DENTRO DE UM EVENTO
   ===================================================================== */
const PN_ABAS=[['info','2 · Informações'],['programa','Programa'],['qr','3 · QR Code'],['contrib','4 · Contribuições'],
  ['videos','5 · Vídeos'],['actividade','6 · Actividade'],['permissoes','7 · Permissões'],['publicar','8 · Publicar'],
  ['fotografos','Fotógrafos'],['alb','Álbum'],['def','Avançado']];
function pnEvento(){
  const e=ev(), s=sub();
  if(!PN_ABAS.some(([k])=>k===admEvAba)) admEvAba='info';
  const pend=fotos.filter(f=>f.ev===e.id&&f.estado==='pendente').length;
  const corpo={info:pnInfo, programa:()=>htmlProgramaEd(e,s), qr:pnQR, contrib:()=>pnContribHtml([e],false), videos:pnVideos,
    actividade:pnActividade, permissoes:pnPermissoes, publicar:pnPublicar, fotografos:()=>htmlAcessos(e,s,'fotografo'),
    alb:()=>htmlAlbum(e,s), def:()=>htmlDefinicoes(e,s)}[admEvAba]();
  return `<button class="linkback" data-go="admin/eventos">← Eventos</button>
    <div class="pn-ev-cab">
      <div class="pn-ev-capa">${imgTag(capaDe(e),'')}</div>
      <div><div class="eyebrow">${(CATEGORIAS.find(c=>c.id===e.cat)||{}).n||''} · ${esc(e.local||'sem local')}</div>
        <h2>${esc(e.titulo)}</h2><div>${pnEstadoPub(e)} <span class="tiny muted">${intervaloDatas(e)}</span></div></div>
    </div>
    <div class="partes adm">
      ${e.subs.map(x=>`<button class="parte ${x.id===s.id?'on':''}" data-go="admin/${e.id}/${x.id}">${TIPOS[x.tipo].ic} ${esc(x.titulo)}<small>${dataCurta(x.data)}</small></button>`).join('')}
      <button class="parte add" onclick="toggleNovaParte()">+ Adicionar parte</button>
    </div>
    ${novaParte?`<div class="parte-ed" style="margin-top:12px">
      <div class="parte-head"><span class="cat-ic sm">${TIPOS[novaParte.tipo].ic}</span><b>Nova parte deste evento</b></div>
      ${htmlParteCampos(novaParte,'novaParte')}
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn sm" onclick="confirmarNovaParte()">Adicionar ao evento</button>
      <button class="btn ghost sm" onclick="toggleNovaParte()">Cancelar</button></div></div>`:''}
    <div class="tabs pn-abas">${PN_ABAS.map(([k,l])=>`<button class="${admEvAba===k?'on':''}" onclick="setEvAba('${k}')">${l}${k==='contrib'&&pend?` (${pend})`:''}</button>`).join('')}</div>
    <div class="pn-pane">${corpo}</div>`;
}

/* ---------- 2 · Informações (criar ou editar evento) ---------- */
function pnInfo(){
  const e=ev(), mapa=e.mapa||e.localNome||e.local;
  return `<div class="pn-info">
    ${pnCapas(e)}
    <div class="grid-f">
      <label class="field"><span>Nome do evento</span><input id="inTitulo" value="${esc(e.titulo)}"></label>
      <label class="field"><span>Categoria</span><select id="inCat">${CATEGORIAS.map(c=>`<option value="${c.id}" ${c.id===e.cat?'selected':''}>${c.ic} ${c.n}</option>`).join('')}</select></label>
      <label class="field"><span>Cidade</span><input id="inLocal" value="${esc(e.local)}" placeholder="Ex.: Maputo"></label>
    </div>
    <h3 style="margin-top:8px">Aparência da página</h3>
    ${htmlEstiloCampos(e.cor,e.fonte,'')}
    <label class="field"><span>Sobre o evento</span><textarea id="inDesc" rows="4" maxlength="4000" placeholder="Um dia inesquecível, repleto de amor e momentos únicos…">${esc(e.descricao)}</textarea></label>
    <h3 style="margin-top:8px">Localização e contacto</h3>
    <div class="grid-f">
      <label class="field"><span>Nome do local</span><input id="inLocalNome" value="${esc(e.localNome)}" placeholder="Ex.: Centro de Eventos"></label>
      <label class="field"><span>Endereço</span><input id="inEndereco" value="${esc(e.endereco)}"></label>
      <label class="field"><span>Pesquisa no mapa</span><input id="inMapa" value="${esc(e.mapa)}" placeholder="Ex.: Centro de Eventos, Maputo"></label>
      <label class="field"><span>Telefone</span><input id="inTel" value="${esc(e.telefone)}" placeholder="+258 …"></label>
      <label class="field"><span>Email</span><input id="inEmail" type="email" value="${esc(e.email)}"></label>
    </div>
    ${mapa?`<iframe class="pn-mapa" loading="lazy" referrerpolicy="no-referrer" src="https://maps.google.com/maps?q=${encodeURIComponent(mapa)}&output=embed" title="Mapa"></iframe>`:''}
    <p class="tiny muted">As datas de cada parte do evento editam-se em <b>Avançado</b>; o programa em <b>Programa</b>.</p>
    <button class="btn" onclick="pnGuardarInfo()">Guardar evento</button>
  </div>`;
}
function pnGuardarInfo(){
  const e=ev(), v=id=>document.getElementById(id).value.trim();
  const d={titulo:v('inTitulo'), cat:v('inCat'), local:v('inLocal'), descricao:v('inDesc'), localNome:v('inLocalNome'),
           endereco:v('inEndereco'), mapa:v('inMapa'), telefone:v('inTel'), email:v('inEmail'), ...esLerCampos()};
  if(!d.titulo){toast('O evento precisa de um nome.');return}
  if(NUVEM) return naNuvem(()=>nv.upd('eventos',e.uid,{titulo:d.titulo, categoria_id:d.cat, local:d.local||null, descricao:d.descricao||null,
    local_nome:d.localNome||null, endereco:d.endereco||null, mapa:d.mapa||null, telefone:d.telefone||null, email:d.email||null,
    cor:d.cor||null, fonte:d.fonte||null}),'Evento guardado.');
  Object.assign(e,d); guardar(); renderAdmin(); toast('Evento guardado.');
}
function pnReduzir(f,max){
  return new Promise((ok,falha)=>{
    const r=new FileReader();
    r.onload=()=>{ const im=new Image(); im.onload=()=>{
      const k=Math.min(1,max/Math.max(im.width,im.height)), c=document.createElement('canvas');
      c.width=Math.round(im.width*k); c.height=Math.round(im.height*k); c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      ok(c.toDataURL('image/jpeg',.82)); }; im.onerror=falha; im.src=r.result; };
    r.onerror=falha; r.readAsDataURL(f);
  });
}
/* Capas: uma por parte do evento + uma geral (reserva). */
function pnCapas(e){
  const vez=parteDaVez(e), agora=capaDe(e);
  const fonte=e.subs.find(s=>s.capa&&s.capa===agora)||null;
  const cartao=(s)=>{
    const c=s?s.capa:e.capa, sid=s?s.id:'';
    return `<div class="pn-capa-cartao ${c&&c===agora?'activa':''}">
      <div class="pn-capa-img">${c?imgTag(c,''):`<span>Sem capa</span>`}${c&&c===agora?'<b class="pn-capa-selo">Na lista agora</b>':''}</div>
      <div class="pn-capa-txt"><b>${s?`${TIPOS[s.tipo].ic} ${esc(s.titulo)}`:'Capa geral'}</b>
        <small>${s?dataCurta(s.data)+(s===vez?' · parte da vez':''):'usada quando nenhuma parte tem capa'}</small></div>
      <div class="pn-acts">
        <label class="btn sm">${c?'Alterar':'Escolher'}<input type="file" accept="image/*" hidden onchange="pnCapa(this,'${sid}')"></label>
        ${c?`<button class="btn ghost sm" onclick="pnCapaRemover('${sid}')">Remover</button>`:''}
      </div></div>`;
  };
  return `<div class="pn-capa-ed">${imgTag(agora,'Capa do evento')}
      <span class="pn-capa-legenda">Capa na lista de eventos agora${fonte?': '+esc(fonte.titulo):''}</span></div>
    <div class="pn-capas">${e.subs.map(s=>cartao(s)).join('')}${cartao(null)}</div>
    <p class="tiny muted">Na lista de eventos aparece a capa da parte de hoje ou da mais próxima. Quando o evento acaba, fica a capa da última parte.
      Se essa parte não tiver capa, usa-se a da parte anterior, depois a capa geral e, por fim, a primeira fotografia publicada.</p>`;
}
async function pnCapa(input,sid){
  const f=input.files[0], e=ev(); if(!f) return;
  const s=sid?e.subs.find(x=>x.id===sid):null;
  if(NUVEM) return naNuvem(async()=>{ const p=await nvCarregarAdmin(e,'capa',f);
    if(s) await nv.upd('partes',s.uid,{capa_path:p}); else await nv.upd('eventos',e.uid,{capa_path:p}); },'Capa actualizada.');
  try{ const d=await pnReduzir(f,1400); if(s) s.capa=d; else e.capa=d; guardar(); renderAdmin(); toast('Capa actualizada.'); }
  catch(_){ toast('Não foi possível ler a imagem.'); }
}
function pnCapaRemover(sid){
  const e=ev(), s=sid?e.subs.find(x=>x.id===sid):null;
  if(NUVEM) return naNuvem(()=>s?nv.upd('partes',s.uid,{capa_path:null}):nv.upd('eventos',e.uid,{capa_path:null}),'Capa removida.');
  if(s) s.capa=null; else e.capa=null; guardar(); renderAdmin(); toast('Capa removida.');
}

/* ---------- 3 · QR Code ---------- */
function pnQR(){
  const e=ev(), s=sub(), conv=(e.acessos||[]).filter(a=>a.perfil==='convidado'), a=conv.find(x=>x.naPagina)||conv[0];
  const url=a?urlRota(rotaAcesso(a)):'';
  return `<div class="pn-qr-destaque card">
      <div class="pn-bloco-cab"><b>Contribuições dos convidados</b>
        ${e.perm.envios&&a&&a.ativo?'<span class="pn-pill ok">● Activo</span>':'<span class="pn-pill rascunho">Fechado</span>'}</div>
      ${a?`<div class="qr-box" id="qrd-${a.id}" data-url="${esc(url)}"></div>
        <div class="linkbox"><span id="lk-${a.id}">${esc(url)}</span></div>
        <div class="pn-acts" style="justify-content:center">
          <button class="btn ghost sm" onclick="baixarQRAcesso('${a.id}')">⇩ Descarregar</button>
          <button class="btn ghost sm" onclick="copiar('lk-${a.id}')">⧉ Copiar link</button></div>
        ${conv.length>1?`<label class="field" style="margin-top:12px"><span>QR mostrado na página do evento</span>
          <select onchange="pnNaPagina(this.value)">${conv.map(x=>`<option value="${x.id}" ${x===a?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></label>`:''}`
       :'<p class="muted small">Ainda não há QR de convidados. Cria um abaixo.</p>'}
      ${pnTog(e.perm.envios,"pnPerm('envios',this.checked)",'Permitir envios','Desligado: os QR de convidados deixam de aceitar fotografias.')}
    </div>
    ${htmlAcessos(e,s,'convidado')}`;
}
function pnNaPagina(id){
  const e=ev();
  if(NUVEM) return naNuvem(async()=>{ chk(await NUVEM.from('acessos').update({na_pagina:false}).eq('evento_id',e.uid));
    await nv.upd('acessos',id,{na_pagina:true}); },'QR da página actualizado.');
  e.acessos.forEach(a=>a.naPagina=a.id===id); guardar(); renderAdmin();
}

/* ---------- 4 · Contribuições ---------- */
function pnContribHtml(lista,global){
  const todas=fotos.filter(f=>f.origem==='participante'&&lista.some(e=>e.id===f.ev));
  const n=k=>todas.filter(f=>f.estado===k).length;
  const itens=todas.filter(f=>f.estado===pnContribTab).slice().reverse();
  return `<div class="pn-sub-abas">${[['pendente','Pendentes'],['publicada','Aprovadas'],['rejeitada','Rejeitadas']]
      .map(([k,l])=>`<button class="${pnContribTab===k?'on':''}" onclick="pnContribTab='${k}';renderAdmin()">${l} <b>${n(k)}</b></button>`).join('')}</div>
    ${pnContribTab==='pendente'&&itens.length>1?`<button class="btn sm" style="margin-bottom:12px" onclick="pnAprovarTodas(${JSON.stringify(itens.map(f=>f.id)).replace(/"/g,'&quot;')})">✓ Aprovar todas (${itens.length})</button>`:''}
    ${itens.length?itens.map(f=>pnLinhaContrib(f,global)).join(''):`<div class="empty">${pnContribTab==='pendente'?'Nada por aprovar. Galeria em dia.':'Sem fotografias aqui.'}</div>`}
    ${lista.length===1?pnVotosPend(lista[0]):''}`;
}
function pnLinhaContrib(f,global){
  const e=EVENTOS.find(x=>x.id===f.ev), s=e&&e.subs.find(x=>x.id===f.sub), ac=f.acesso&&e&&(e.acessos||[]).find(a=>a.id===f.acesso);
  const q=f.missao&&s&&s.missoes.find(x=>x.id===f.missao);
  return `<div class="pn-contrib">
    <button class="pn-contrib-img" onclick="pnVer('${f.id}')">${midia(f,'')}</button>
    <div class="pn-contrib-txt">
      <b>${esc(f.autor)}</b> <span class="pn-pill">${ETIQ[f.etiqueta]||'Convidado'}</span>
      <small>${global&&e?esc(e.titulo)+' · ':''}${s?esc(s.titulo)+' · ':''}${esc(fase(f.fase,s).n)}${ac?' · via “'+esc(ac.nome)+'”':''}${q?' · '+esc(q.ic)+' '+esc(q.t):''}</small>
      ${f.estado==='pendente'&&s?`<select class="sel-sm" onchange="mudarFase('${f.id}',this.value)">${s.momentos.map(m=>`<option value="${m.id}" ${m.id===f.fase?'selected':''}>${esc(m.n)}</option>`).join('')}</select>`:''}
    </div>
    <div class="pn-contrib-acts">
      ${f.estado!=='publicada'?`<button class="pn-ok" title="Aprovar" onclick="aprovar('${f.id}')">✓</button>`:''}
      ${f.estado!=='rejeitada'?`<button class="pn-nao" title="Rejeitar" onclick="rejeitar('${f.id}')">✕</button>`:''}
      ${f.estado==='rejeitada'?`<button class="pn-rep" title="Voltar a pendente" onclick="pnRepor('${f.id}')">↺</button>`:''}
    </div></div>`;
}
function pnVer(id){const f=fotos.find(x=>x.id===id); if(!f) return; const a=atual.ev, b=atual.sub; seleccionar(f.ev,f.sub); abrirLb(id); atual.ev=a; atual.sub=b;}
function pnVotosPend(e){
  const v=e.subs.flatMap(s=>(s.votosPend||[]).map(x=>({s,x})));
  return v.length?`<h3 style="margin-top:28px">Mensagens do mural por aprovar</h3>${v.map(({s,x})=>`<div class="vow"><q>“${esc(x.q)}”</q>
    <div class="tiny muted">${esc(x.a)} · ${esc(s.titulo)}</div>
    <div class="pn-acts" style="margin-top:8px"><button class="btn sm" onclick="moderarVoto('${x.id}','publicado')">Publicar</button>
    <button class="btn ghost sm" onclick="moderarVoto('${x.id}','rejeitado')">Rejeitar</button></div></div>`).join('')}`:'';
}
function pnRepor(id){
  if(NUVEM) return naNuvem(()=>nv.upd('ficheiros',id,{estado:'pendente'}),'Voltou para pendentes.');
  const f=fotos.find(x=>x.id===id); if(f) f.estado='pendente'; guardar(); renderAdmin();
}
function pnAprovarTodas(ids){
  if(!confirmado('todas:'+ids.length,'Aprovar '+ids.length+' fotografias de uma vez?')) return;
  if(NUVEM) return naNuvem(async()=>chk(await NUVEM.from('ficheiros').update({estado:'publicada'}).in('id',ids)),ids.length+' fotografias aprovadas.');
  fotos.forEach(f=>{ if(ids.includes(f.id)) f.estado='publicada'; }); guardar(); renderAdmin(); toast(ids.length+' fotografias aprovadas.');
}

/* ---------- 5 · Vídeos ---------- */
function pnVideos(){
  const e=ev(), lista=e.videos||[];
  return `${e.perm.videos?'':'<div class="qr-nota small">Os vídeos estão escondidos da página pública (Permissões → Mostrar vídeo).</div>'}
    ${lista.length?lista.map(v=>pnLinhaVideo(e,v,false)).join(''):'<div class="empty">Ainda não há vídeos neste evento.</div>'}
    <div class="card pn-bloco" style="margin-top:18px"><b>Adicionar vídeo</b>
      <div class="pn-sub-abas">${[['upload','Carregar ficheiro'],['live','Transmissão em directo'],['link','Link (YouTube…)']]
        .map(([k,l])=>`<button class="${pnVideoTipo===k?'on':''}" onclick="pnVideoTipo='${k}';renderAdmin()">${l}</button>`).join('')}</div>
      <div class="grid-f">
        <label class="field"><span>Título</span><input id="vdTitulo" placeholder="${pnVideoTipo==='live'?'Ex.: Cerimónia em directo':'Ex.: Vídeo oficial do evento'}"></label>
        ${pnVideoTipo==='upload'?`<label class="field"><span>Ficheiro de vídeo</span><input id="vdFicheiro" type="file" accept="video/*"></label>`
          :`<label class="field"><span>${pnVideoTipo==='live'?'Link da transmissão (YouTube, Facebook…)':'Link do vídeo'}</span><input id="vdUrl" type="url" placeholder="https://"></label>`}
        <label class="field"><span>Duração (opcional)</span><input id="vdDur" placeholder="5:32"></label>
        ${e.subs.length>1?`<label class="field"><span>Parte do evento</span><select id="vdParte"><option value="">— todo o evento —</option>${e.subs.map(s=>`<option value="${s.id}">${esc(s.titulo)}</option>`).join('')}</select></label>`:''}
      </div>
      <label class="checks" style="justify-content:flex-start;margin:0 0 12px"><label><input type="checkbox" id="vdOficial" checked> Vídeo oficial</label></label>
      <button class="btn" onclick="pnAddVideo()">Adicionar vídeo</button>
    </div>`;
}
function pnLinhaVideo(e,v,global){
  const media=v.embed?`<iframe src="${esc(v.embed)}" allowfullscreen loading="lazy" title="${esc(v.titulo)}"></iframe>`
    : v.tipo==='upload'&&v.src?`<video src="${esc(v.src)}#t=0.1" controls preload="metadata" playsinline></video>`
    : `<a class="pn-video-link" href="${esc(v.src)}" target="_blank" rel="noopener">▶ Abrir ${v.tipo==='live'?'transmissão':'vídeo'}</a>`;
  return `<div class="card pn-video">
    <div class="pn-video-media">${media}</div>
    <div class="pn-video-txt">
      ${global?`<small class="muted">${esc(e.titulo)}</small>`:''}
      <input class="ac-nome" value="${esc(v.titulo)}" onchange="pnVideoEdit('${e.id}','${v.id}','titulo',this.value)" aria-label="Título">
      <small>${{upload:'Vídeo carregado',live:'Transmissão em directo',link:'Link externo'}[v.tipo]}${v.duracao?' · Duração: '+esc(v.duracao):''}${v.sub?' · '+esc((e.subs.find(s=>s.id===v.sub)||{}).titulo||''):''}</small>
      <div class="pn-acts">
        <label class="checks"><label><input type="checkbox" ${v.oficial?'checked':''} onchange="pnVideoEdit('${e.id}','${v.id}','oficial',this.checked)"> Oficial</label></label>
        <button class="btn ghost sm danger" onclick="pnVideoDel('${e.id}','${v.id}')">Eliminar</button>
      </div>
    </div></div>`;
}
async function pnAddVideo(){
  const e=ev(), titulo=val('vdTitulo'), dur=val('vdDur'), oficial=document.getElementById('vdOficial').checked;
  const parteSel=document.getElementById('vdParte'), sid=parteSel?parteSel.value:'';
  if(!titulo){toast('Dá um título ao vídeo.');return}
  let url='', file=null;
  if(pnVideoTipo==='upload'){ file=(document.getElementById('vdFicheiro').files||[])[0]; if(!file){toast('Escolhe o ficheiro de vídeo.');return} }
  else { url=val('vdUrl'); if(!/^https?:\/\//.test(url)){toast('Escreve um link completo (https://…).');return} }
  if(NUVEM) return naNuvem(async()=>{
    let path=null; if(file){ toast('A carregar o vídeo…'); path=await nvCarregarAdmin(e,'videos',file); }
    await nv.ins('videos',{evento_id:e.uid, parte_id:sid?e.subs.find(s=>s.id===sid).uid:null, titulo, tipo:pnVideoTipo,
      storage_path:path, url:file?null:url, duracao:dur||null, oficial, ordem:(e.videos||[]).length});
  },'Vídeo adicionado.');
  const v={id:'v'+Date.now(), sub:sid||null, titulo, tipo:pnVideoTipo, oficial, duracao:dur, embed:embedVideo(url),
           src:file?URL.createObjectURL(file):url, temporario:!!file};
  (e.videos=e.videos||[]).push(v); guardar(); renderAdmin();
  toast(file?'Vídeo adicionado (demonstração: só fica até recarregar a página).':'Vídeo adicionado.');
}
function pnVideoEdit(eid,id,k,val){
  const e=EVENTOS.find(x=>x.id===eid), v=e&&(e.videos||[]).find(x=>x.id===id); if(!v) return;
  if(k==='titulo'){ val=String(val).trim(); if(!val){renderAdmin();return} }
  if(NUVEM) return naNuvem(()=>nv.upd('videos',id,{[k]:val}),'Guardado.');
  v[k]=val; guardar(); renderAdmin();
}
function pnVideoDel(eid,id){
  const e=EVENTOS.find(x=>x.id===eid), v=e&&(e.videos||[]).find(x=>x.id===id); if(!v) return;
  if(!confirmado('video:'+id,'Eliminar “'+v.titulo+'”?')) return;
  if(NUVEM) return naNuvem(async()=>{ await nv.del('videos',id); if(v.path) NUVEM.storage.from('ficheiros').remove([v.path]).catch(()=>{}); },'Vídeo eliminado.');
  e.videos=e.videos.filter(x=>x.id!==id); guardar(); renderAdmin(); toast('Vídeo eliminado.');
}

/* ---------- 6 · Actividade ---------- */
function pnActividade(){
  const e=ev(), dias=pnDias(14), contrib=pnContribuicoes(e);
  const pessoas={}; contrib.forEach(f=>pessoas[f.autor]=(pessoas[f.autor]||0)+1);
  const top=Object.entries(pessoas).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const porQR=(e.acessos||[]).filter(a=>a.perfil==='convidado').map(a=>[a.nome,fotos.filter(f=>f.acesso===a.id).length,a.usos||0]);
  const serie=pnGrafTab==='visitas'?pnSerieVisitas([e],dias):pnSerieContrib([e],dias);
  return `<div class="pn-stats">
      ${[['👁️',pnNum(pnVisitas(e)),'Visualizações'],['📥',pnNum(contrib.length),'Contribuições'],
         ['📸',fotos.filter(f=>f.ev===e.id&&f.origem==='fotografo').length,'Fotos oficiais'],['👥',Object.keys(pessoas).length,'Participantes']]
        .map(([i,v,l])=>`<div class="card pn-stat"><span>${i}</span><b>${v}</b><small>${l}</small></div>`).join('')}
    </div>
    <div class="card pn-bloco">
      <div class="pn-sub-abas">${[['visitas','Visualizações'],['contrib','Contribuições']].map(([k,l])=>`<button class="${pnGrafTab===k?'on':''}" onclick="pnGrafTab='${k}';renderAdmin()">${l}</button>`).join('')}</div>
      ${pnGrafico([{cor:pnGrafTab==='visitas'?'#C8582B':'#3F7F86',v:serie}],pnRotulos(dias))}
      ${NUVEM?'':'<p class="tiny muted">Modo demonstração: visualizações fictícias.</p>'}
    </div>
    <div class="pn-duas">
      <div class="card pn-bloco"><b>Quem mais contribuiu</b>${top.length?top.map(([n,c])=>`<div class="pn-rank"><span class="av" style="background:${cor(n)}">${esc(ini(n))}</span>${esc(n)}<b>${c}</b></div>`).join(''):'<p class="muted small">Ainda sem contribuições.</p>'}</div>
      <div class="card pn-bloco"><b>Por QR Code</b>${porQR.length?porQR.map(([n,f,u])=>`<div class="pn-rank">${esc(n)}<b>${f} fotos · ${u} envios</b></div>`).join(''):'<p class="muted small">Sem QR de convidados.</p>'}</div>
    </div>`;
}

/* ---------- 7 · Permissões ---------- */
function pnPermissoes(){
  const e=ev();
  return `<div class="card pn-bloco"><b>Privacidade do evento</b>
    ${pnTog(e.perm.envios,"pnPerm('envios',this.checked)",'Permitir envio de fotos','Os convidados podem enviar fotografias pelos QR Codes. Os fotógrafos continuam a poder publicar.')}
    ${pnTog(e.perm.videos,"pnPerm('videos',this.checked)",'Mostrar vídeo','Os vídeos e transmissões aparecem na página pública.')}
    ${pnTog(e.perm.galeria,"pnPerm('galeria',this.checked)",'Galeria pública','Quem abre a página do evento vê as fotografias publicadas. Desligado: só o programa e a informação.')}
  </div>`;
}
function pnPerm(k,on){
  const e=ev();
  if(NUVEM) return naNuvem(()=>nv.upd('eventos',e.uid,{[PERM_COL[k]]:on}),'Permissões actualizadas.');
  e.perm[k]=on; guardar(); renderAdmin(); toast('Permissões actualizadas.');
}

/* ---------- 8 · Publicar e partilhar ---------- */
function pnPublicar(){
  const e=ev(), s=sub(), url=urlPagina(e,s);
  const checks=[[!!(e.capa||fotos.some(f=>f.ev===e.id)),'Capa do evento'],[!!e.descricao,'Descrição (Sobre o evento)'],
    [e.subs.every(x=>x.momentos.length&&x.data),'Programa e datas de cada parte'],[!!(e.localNome||e.mapa),'Localização'],
    [(e.acessos||[]).some(a=>a.perfil==='convidado'&&a.ativo),'QR Code de convidados']];
  if(e.publico!==false) return `<div class="card pn-publicado">
      <div class="pn-check">✓</div><h3>Evento publicado com sucesso!</h3>
      <p class="muted small">A página está visível para quem tiver o link${NUVEM&&e.publicadoEm?' desde '+new Date(e.publicadoEm).toLocaleDateString('pt-PT'):''}.</p>
      <div class="linkbox"><span id="lk-pub">${esc(url)}</span></div>
      <div class="pn-acts" style="justify-content:center;margin-top:14px">
        <button class="btn" data-go="evento/${e.id}/${s.id}">Ver evento</button>
        <button class="btn ghost" onclick="copiar('lk-pub')">⧉ Copiar link</button>
        ${navigator.share?`<button class="btn ghost" onclick="navigator.share({title:${esc(JSON.stringify(e.titulo))},url:${esc(JSON.stringify(url))}}).catch(()=>{})">Partilhar</button>`:''}
      </div>
      <div class="qr-box" id="qr-pagina"></div>
      <button class="btn ghost sm danger" onclick="pnPublica(false)">Voltar a rascunho</button>
    </div>`;
  return `<div class="card pn-bloco"><b>Antes de publicar</b>
      ${checks.map(([ok,t])=>`<div class="pn-rank"><span class="${ok?'pn-ok':'pn-nao'}">${ok?'✓':'!'}</span>${t}</div>`).join('')}
      <p class="small muted" style="margin-top:12px">Enquanto for rascunho, só a organização vê o evento. Os QR Codes já funcionam, para receber fotos antes do dia.</p>
      <button class="btn" onclick="pnPublica(true)">Publicar evento</button>
    </div>`;
}
function pnPublica(on){
  const e=ev();
  if(!on && !confirmado('despub:'+e.id,'O evento deixa de estar visível ao público.')) return;
  if(NUVEM) return naNuvem(()=>nv.upd('eventos',e.uid,{publico:on, publicado_em:on?new Date().toISOString():null}),
    on?'Evento publicado com sucesso!':'Evento voltou a rascunho.');
  e.publico=on; guardar(); renderAdmin(); toast(on?'Evento publicado com sucesso!':'Evento voltou a rascunho.');
}

/* ---------- 6 · Partilhar fotos: arrastar ficheiros para a zona de envio ---------- */
(function(){
  const z=document.getElementById('upDrop'), inp=document.getElementById('upFile'); if(!z||!inp) return;
  ['dragenter','dragover'].forEach(t=>z.addEventListener(t,ev=>{ev.preventDefault(); z.classList.add('sobre')}));
  ['dragleave','drop'].forEach(t=>z.addEventListener(t,ev=>{ev.preventDefault(); z.classList.remove('sobre')}));
  z.addEventListener('drop',ev=>{ if(ev.dataTransfer&&ev.dataTransfer.files.length){ lerFicheiros({files:ev.dataTransfer.files},'conv','upPrev'); } });
})();
