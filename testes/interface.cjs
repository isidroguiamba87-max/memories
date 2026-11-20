// Teste de fumo do protótipo em jsdom: modo demo, modo servidor real (sem permissões) e modo servidor simulado.
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const raiz = process.argv[2];
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').replace(/<script src="http[^"]*"><\/script>/g, '');
const scripts = [...fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').matchAll(/<script src="(assets\/js\/[^"]+)"/g)].map(m => fs.readFileSync(path.join(raiz, m[1]), 'utf8'));
const espera = (ms) => new Promise(r => setTimeout(r, ms));

function abrir(url, supabaseLib) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  w.matchMedia = w.matchMedia || (q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  w.erros = []; w.addEventListener('error', e => w.erros.push(e.message));
  w.console.error = (...a) => w.erros.push(a.map(String).join(' '));
  if (supabaseLib) w.supabase = supabaseLib;
  w.crypto.randomUUID = () => require('crypto').randomUUID();
  // classic scripts partilham o âmbito global léxico: concatenar num só eval
  w.eval(scripts.join('\n;\n') + '\n;window.__t={get EVENTOS(){return EVENTOS},get fotos(){return fotos},ir,emNuvem,get atual(){return atual},sub,ev,porToken,setEvAba,get vistaActual(){return vistaActual},get souAdmin(){return souAdmin},set souAdmin(v){souAdmin=v},nvCarregar,nvCarregarAcesso,navegar,get NUVEM(){return NUVEM},abrirPedido,enviarPedido,get PEDIDOS(){return PEDIDOS},lpSetCat,get acessoAtual(){return acessoAtual},get buffer(){return buffer},setRascunho(v){rascunho=v}};');
  return w;
}
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ FALHOU: ') + m); if (!c) process.exitCode = 1; };

(async () => {
  // ---------- 1. modo demonstração ----------
  let w = abrir('http://localhost:8000/?demo');
  await espera(50);
  const t = w.__t;
  ok(!t.NUVEM, 'demo: sem servidor');
  ok(t.vistaActual === 'inicio' && w.document.querySelector('.topbar').style.display === 'none', 'demo: abre na página inicial sem a barra antiga');
  ok(w.document.querySelectorAll('.lp-card').length === 4 && w.document.querySelectorAll('.lp-serv').length >= 4 && w.document.querySelectorAll('.lp-faq details').length === 5, 'demo: inicial com eventos, serviços e perguntas');
  { const topo=w.document.getElementById('lpTopo');
    Object.defineProperty(w,'scrollY',{configurable:true,value:3000}); w.dispatchEvent(new w.Event('scroll'));
    ok(topo && topo.classList.contains('a-mexer') && topo.classList.contains('solida'), 'cabeçalho acompanha o scroll: translúcido enquanto há scroll');
    await espera(350); ok(!topo.classList.contains('a-mexer') && topo.classList.contains('solida'), 'cabeçalho: visível (fundo creme) quando o scroll pára');
    Object.defineProperty(w,'scrollY',{configurable:true,value:0}); w.dispatchEvent(new w.Event('scroll')); await espera(350);
    ok(!topo.classList.contains('solida'), 'cabeçalho: transparente de novo no topo da página'); }
  t.lpSetCat('corporativo'); ok(w.document.querySelectorAll('.lp-card').length === 1, 'demo: filtro Corporativo');
  t.abrirPedido('galeria'); w.document.getElementById('pdNome').value='Ana'; w.document.getElementById('pdContacto').value='840000000'; await t.enviarPedido('galeria');
  ok(t.PEDIDOS.length === 1 && !w.document.getElementById('pedido').classList.contains('on'), 'demo: pedido guardado');
t.abrirPedido('galeria'); w.document.getElementById('pdNome').value='Robô'; w.document.getElementById('pdContacto').value='840000001'; w.document.getElementById('pdSiteWeb').value='http://spam'; await t.enviarPedido('galeria');  ok(t.PEDIDOS.length === 1, 'anti-robô: campo-armadilha preenchido não grava o pedido');
  t.ir('admin'); w.setAdmAba('pedidos'); ok(w.document.querySelectorAll('.pedido').length === 1, 'demo: pedido aparece no painel');
  // ---- painel (fluxo do administrador) ----
  t.ir('admin'); ok(w.document.querySelectorAll('.pn-stat').length === 4 && w.document.querySelector('.pn-grafico'), 'admin 1: dashboard com estatísticas e gráfico');
  for (const sec of ['site','eventos','galerias','contribuicoes','videos','pedidos','definicoes','novo','modelos']) { t.ir('admin/'+sec); if (w.location.hash !== '#admin/'+sec) ok(false, 'rota admin/'+sec+' → '+w.location.hash); }
  ok(w.erros.length === 0, 'admin: todas as secções abrem ' + w.erros.join(' | '));
  t.setRascunho({titulo:'Ana & Pedro',cat:'uniao',local:'Maputo',partes:[{tipo:'casamento',modelo:'classico',titulo:'Casamento',data:'2027-06-14'}]});
  w.criarEvento(); const novo = t.ev();
  ok(novo && novo.publico === false && w.location.hash.startsWith('#admin/ana-pedro') && w.document.getElementById('inTitulo'), 'admin 2: criar evento → rascunho, abre Informações');
  w.document.getElementById('inDesc').value='Um dia inesquecível'; w.document.getElementById('inLocalNome').value='Centro de Eventos'; w.document.getElementById('inMapa').value='Centro de Eventos, Maputo'; w.pnGuardarInfo();
  ok(t.ev().descricao==='Um dia inesquecível' && w.document.querySelector('.pn-mapa'), 'admin 2: guardar informações + mapa');
  t.setEvAba('qr'); ok(w.document.querySelector('[id^="qrd-"]') && w.document.querySelector('.pn-qr-destaque .pn-tog'), 'admin 3: QR em destaque + Permitir envios');
  w.pnPerm('envios',false); ok(t.ev().perm.envios===false && t.ev().linkContribuir==='', 'admin 3/7: fechar envios esconde o link de contribuir'); w.pnPerm('envios',true);
  ok(/[\/#]c\/[\w-]+/.test(t.ev().linkContribuir), 'linkContribuir activo');
  t.setEvAba('videos'); w.pnVideoTipo='link'; w.renderAdmin();
  w.eval('pnVideoTipo="link"'); w.renderAdmin(); w.document.getElementById('vdTitulo').value='Cerimónia em directo'; w.document.getElementById('vdUrl').value='https://www.youtube.com/live/abc12345'; await w.pnAddVideo();
  ok(t.ev().videos.length===1 && t.ev().videos[0].embed==='https://www.youtube.com/embed/abc12345' && w.document.querySelector('.pn-video iframe'), 'admin 5: vídeo (link YouTube → embed)');
  t.setEvAba('actividade'); ok(w.document.querySelector('.pn-grafico'), 'admin 6: actividade com gráfico');
  t.setEvAba('permissoes'); ok(w.document.querySelectorAll('.pn-perm').length===3, 'admin 7: três permissões');
  t.setEvAba('publicar'); w.pnPublica(true); ok(t.ev().publico===true && w.document.querySelector('.pn-check') && w.document.querySelector('#qr-pagina'), 'admin 8: publicar → sucesso, link e QR');
  // ---- slideshow (fotos de todo o evento, transição, música do YouTube) ----
  w.Image = class { set src(v) { this._s = v; setTimeout(() => this.onload && this.onload(), 1); } get src() { return this._s; } };
  t.ir('admin/nelia-tomas'); t.setEvAba('slide');
  { const fs_ = w.document.querySelectorAll('.ss-ed-foto');
    ok(fs_.length > 5 && w.document.querySelectorAll('.ss-ed-trans button').length === 5, 'slideshow: painel lista as fotos do evento e as transições');
    [0, 2, 4].forEach(i => w.ssEdFoto(fs_[i]));
    ok(w.document.getElementById('ssEdConta').textContent.startsWith('3 de'), 'slideshow: contador das escolhidas'); }
  w.ssEdTrans('variadas');
  for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3', 'https://youtu.be/9bZkp7q19f0', 'https://youtu.be/kJQP7kiw5Fk']) { w.document.getElementById('ssYt').value = u; w.ssEdAddYT(); }
  ok(w.document.querySelectorAll('.ss-faixas li').length === 3, 'slideshow: lista com três músicas do YouTube');
  w.ssEdMover(2, -1);                                   // a 3.ª sobe para 2.º lugar
  w.document.getElementById('ssSeg').value = '3';
  await w.ssGuardar();
  { const sl = t.ev().slide;
    ok(sl && sl.fotos.length === 3 && sl.transicao === 'variadas' && sl.segundos === 3 && sl.musicas.map(m => w.ssYoutubeId(m.url)).join() === 'dQw4w9WgXcQ,kJQP7kiw5Fk,9bZkp7q19f0', 'slideshow: guardar configuração e a ordem das músicas'); }
  t.ir('evento/nelia-tomas/' + t.ev().subs[0].id + '/mural');
  ok(w.document.querySelector('#mural #slideshow .ss-capa') && !w.document.getElementById('mural').classList.contains('ve-oculta'), 'slideshow: capa no ecrã do Mural');
  await espera(30); w.abrirSlideshow(); await espera(30);
  { const fr = w.document.querySelector('#ssMusica iframe');
    ok(fr && /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?autoplay=1&controls=0/.test(fr.src), 'slideshow: 1.ª música do YouTube num leitor escondido (sem repetir sozinha)');
    const enviadas = []; fr.contentWindow.postMessage = m => enviadas.push(JSON.parse(m));
    w.ssMensagemYT({ source: fr.contentWindow, data: JSON.stringify({ event: 'onStateChange', info: 0 }) });
    const carregou = enviadas.find(m => m.func === 'loadVideoById');
    ok(carregou && carregou.args[0] === 'kJQP7kiw5Fk', 'slideshow: quando a música acaba, toca a seguinte da lista');
    ok(w.document.getElementById('ssConta').textContent === '1 / 3' && w.document.querySelectorAll('#ssPalco .ss-cam').length === 1, 'slideshow: primeira foto'); }
  w.ssPasso(1); await espera(30);
  ok(w.document.getElementById('ssConta').textContent === '2 / 3' && w.document.querySelector('#ssPalco .ss-cam.sai'), 'slideshow: foto seguinte com transição');
  w.ssPasso(-1); w.ssPasso(-1); await espera(30);
  ok(w.document.getElementById('ssConta').textContent === '3 / 3', 'slideshow: volta ao fim (repete)');
  w.ssAlternar(); w.ssSom();
  ok(w.document.getElementById('ssPlay').getAttribute('aria-label') === 'Continuar' && w.document.getElementById('ssSom').getAttribute('aria-label') === 'Ligar o som', 'slideshow: pausa e sem som');
  w.fecharSlideshow(); ok(!w.document.getElementById('ss'), 'slideshow: fechar');
  t.ir('admin/nelia-tomas'); t.setEvAba('slide'); w.document.getElementById('ssYt').value = 'https://exemplo.com/musica'; w.ssEdAddYT();
  ok(w.document.querySelectorAll('.ss-faixas li').length === 3, 'slideshow: link que não é do YouTube é recusado');
  w.document.getElementById('ssYt').value = ''; w.ssEdTirar(0); await w.ssGuardar();
  ok(t.ev().slide.musicas.length === 2 && t.ev().slide.musicas[0].url.endsWith('kJQP7kiw5Fk'), 'slideshow: tirar uma música da lista');
  ok(w.erros.length === 0, 'slideshow: sem erros JS ' + w.erros.join(' | '));
  t.ir('admin/nelia-tomas'); t.setEvAba('contrib');
  ok(w.document.querySelectorAll('.pn-contrib').length===5, 'admin 4: 5 contribuições pendentes');
  w.aprovar(t.fotos.find(f=>f.estado==='pendente'&&f.ev==='nelia-tomas').id); const rj=t.fotos.find(f=>f.estado==='pendente'&&f.ev==='nelia-tomas').id; w.rejeitar(rj);
  w.eval('pnContribTab="rejeitada"'); w.renderAdmin(); ok(w.document.querySelectorAll('.pn-contrib').length===1, 'admin 4: rejeitada vai para Rejeitadas');
  w.pnRepor(rj); ok(t.fotos.find(f=>f.id===rj).estado==='pendente', 'admin 4: repor rejeitada');
  // ---- convidado: secções na página do evento (versão actual, outra sessão) ----
  t.ir('evento/nelia-tomas');
  ok(typeof w.renderSeccoesEvento==='function' && w.erros.length===0, 'convidado: página do evento com as secções sem erros '+w.erros.join(' | '));
  // ---- capas por parte ----
  { const e=t.EVENTOS.find(x=>x.id==='andre-lucia'), [lb,ca]=e.subs; const guard={lb:lb.data, ca:ca.data, cap:e.capa};
    const hoje=w.hojeMz(), dia=n=>new Date(Date.parse(hoje+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
    e.capa='GERAL'; lb.capa='LOBOLO'; ca.capa=null;
    lb.data=dia(-10); ca.data=dia(+20);
    ok(w.capaDe(e)==='LOBOLO', 'capa: próxima parte sem capa → fica a última usada (lobolo)');
    ca.capa='CASAMENTO'; ok(w.capaDe(e)==='CASAMENTO', 'capa: antes do casamento → capa do casamento (a mais próxima)');
    lb.data=hoje; ok(w.capaDe(e)==='LOBOLO', 'capa: no dia do lobolo → capa do lobolo');
    lb.data=dia(-30); ca.data=dia(-5); ok(w.capaDe(e)==='CASAMENTO', 'capa: evento acabado → fica a capa da última parte');
    ok(w.capaDe(e,lb)==='LOBOLO', 'capa: página de uma parte usa a capa dessa parte');
    lb.capa=null; ca.capa=null; ok(w.capaDe(e)==='GERAL', 'capa: sem capas de partes → capa geral');
    t.ir('admin/andre-lucia'); t.setEvAba('info'); lb.capa='LOBOLO';
    w.renderAdmin(); ok(w.document.querySelectorAll('.pn-capa-cartao').length===3, 'capa: painel com capa por parte + geral');
    lb.data=guard.lb; ca.data=guard.ca; e.capa=guard.cap; lb.capa=null; ca.capa=null; }
  // ---- convidado: partilhar fotos com origem ----
  t.ir('c/nt-mesas'); w.escolherOrigem('mc'); t.buffer.conv.push({src:'data:x',vid:false}); w.document.getElementById('upName').value='DJ Zé'; const antes=t.fotos.length; w.enviarConvidado(); ok(t.fotos.length===antes, 'privacidade: sem confirmar a autorização, o envio é bloqueado'); w.document.getElementById('upAceito').checked=true; w.enviarConvidado();
  ok(t.fotos.some(f=>f.autor==='DJ Zé'&&f.etiqueta==='mc'&&f.estado==='pendente'), 'convidado 6: envio com origem MC');
  t.ir('evento/nelia-tomas'); ok(t.EVENTOS[0].visitasDia.length>0, 'visita registada');
  w.abrirPrivacidade(); ok(!!w.document.querySelector('#privacidade.on .lp-texto-legal h3'), 'privacidade: página de termos abre'); w.fecharPrivacidade();
  ok(w.erros.length === 0, 'demo: fluxo sem erros ' + w.erros.join(' | '));
  t.ir('eventos'); ok(w.document.querySelectorAll('#view-eventos [data-go^="evento/"], #view-eventos [onclick*="evento/"]').length >= 5, 'demo: catálogo com eventos');
{ const rob=()=>w.document.querySelector('meta[name="robots"]').content;    ok(/noindex/.test(rob()) && w.document.title==='Eventos · Memória', 'SEO: catálogo com título próprio e noindex');    t.ir('evento/nelia-tomas'); ok(/noindex/.test(rob()) && / · Memória$/.test(w.document.title) && !/^Memória/.test(w.document.title), 'SEO: evento privado com título do evento e noindex');    t.ir('inicio'); ok(/^index/.test(rob()) && /Moçambique/.test(w.document.title), 'SEO: página inicial indexável com título principal');    ok(w.document.querySelectorAll('meta[name="robots"]').length===1, 'SEO: uma só meta robots');    const im=w.document.querySelector('.lp-hero-img img'); ok(im && /hero-noivos-800.webp 800w/.test(im.getAttribute('srcset')) && im.getAttribute('fetchpriority')==='high' && !im.hasAttribute('loading'), 'desempenho: hero em WebP com srcset e prioridade alta'); }
  t.ir('c/al-lobolo'); ok(t.vistaActual === 'convidado', 'demo: link de convidado abre');
  t.ir('admin/andre-lucia/lobolo'); t.setEvAba('fotografos');
  ok(w.document.querySelectorAll('.qr-card').length === 2, 'demo: 2 fotógrafos no André & Lúcia');
  ok(!w.document.querySelector('.login'), 'demo: painel sem login');
  { // programa: "Em curso" só no dia da parte e a partir da hora (hora de Maputo)
    const hj = w.hojeMz, hr = w.horaMz;
    const ms = [{id:'a',n:'Pequeno-almoço',h:'06:00'},{id:'b',n:'Preparativos',h:'08:00'},{id:'c',n:'Chegada',h:'09:30'}];
    const E = (estado, data, momento) => ({estado, subs:[{data, momentos:ms, momento:momento||'a'}]});
    w.hojeMz = () => '2026-11-20'; w.horaMz = () => '08:15';
    const ep = (e) => w.estadoParte(e, e.subs[0]);
    ok(ep(E('decorrer','2026-11-21')).fase === 'antes', 'programa: parte de amanhã não está em curso, mesmo com o evento "a decorrer"');
    ok(ep(E('decorrer','2026-11-19')).fase === 'depois', 'programa: parte de ontem fica como terminada');
    const x = ep(E('auto','2026-11-20')); ok(x.fase === 'decorrer' && x.idx === 1, 'programa: no dia, às 08:15, em curso = Preparativos (08:00)');
    w.horaMz = () => '05:30'; ok(ep(E('auto','2026-11-20')).fase === 'hoje-antes', 'programa: no dia, antes da primeira hora, ainda não começou');
    w.horaMz = () => '08:15'; ok(ep(E('auto','2026-11-20','c')).idx === 2, 'programa: a organização pode avançar o momento');
    ok(ep(E('encerrado','2026-11-20')).fase === 'depois', 'programa: evento encerrado não mostra nada em curso');
    ok(ep(E('preparacao','2026-11-20')).fase === 'hoje-antes', 'programa: estado "em preparação" escolhido à mão impede o "em curso"');
    // no ecrã: parte futura sem "Em curso" e faixa parada
    t.ir('evento/nelia-tomas'); const s0 = t.sub(); const dataAntes = s0.data; s0.data = '2026-11-21'; w.renderPrograma();
    ok(!w.document.querySelector('#prog li.agora') && w.document.getElementById('liveBar').classList.contains('parado') && /Ainda não começou/.test(w.document.getElementById('liveTxt').textContent), 'programa: parte de amanhã sem "Em curso" e faixa "Ainda não começou"');
    s0.data = '2026-11-20'; w.renderPrograma();
    ok(w.document.querySelectorAll('#prog li.agora').length === 1 && /A acontecer agora/.test(w.document.getElementById('liveTxt').textContent), 'programa: no dia da parte mostra um único momento em curso');
    s0.data = dataAntes; w.hojeMz = hj; w.horaMz = hr; }
  ok(w.erros.length === 0, 'demo: sem erros JS ' + w.erros.join(' | '));

  // ---------- 2. servidor real (estado actual) ----------
  w = abrir('http://localhost:8000/#eventos', require('@supabase/supabase-js'));
  for (let i = 0; i < 40 && !w.document.querySelector('.erro-nuvem') && w.__t.EVENTOS.length === 0; i++) await espera(250);
  const banner = w.document.querySelector('.erro-nuvem');
  console.log('  servidor real →', banner ? banner.textContent.trim() : ('eventos: ' + w.__t.EVENTOS.length));

  // ---------- 3. servidor simulado ----------
  const db = {
    eventos: [{ id: 'E1', slug: 'andre-lucia', titulo: 'André & Lúcia', categoria_id: 'uniao', local: 'Maputo', estado: 'auto', publico: true, criado_em: '1' }],
    partes: [{ id: 'P1', evento_id: 'E1', slug: 'lobolo', tipo_id: 'lobolo', modelo_id: 'M1', titulo: 'Lobolo', data: '2026-11-08', tema_id: null, momento_actual_id: 'O2', ordem: 0 }],
    momentos: [{ id: 'O1', parte_id: 'P1', ordem: 1, hora: '09:00:00', nome: 'Chegada', local: 'Matola' }, { id: 'O2', parte_id: 'P1', ordem: 2, hora: '10:00:00', nome: 'Apresentação', local: null }],
    missoes: [{ id: 'Q1', parte_id: 'P1', momento_id: 'O2', ordem: 1, icone: '🧣', titulo: 'Capulanas' }],
    votos: [{ id: 'V1', parte_id: 'P1', autor_nome: 'Avó', mensagem: 'Parabéns', estado: 'publicado' }, { id: 'V2', parte_id: 'P1', autor_nome: 'Tio', mensagem: 'Viva', estado: 'pendente' }],
    ficheiros: [{ id: 'F1', parte_id: 'P1', momento_id: 'O2', storage_path: 'tok/P1/a.jpg', tipo: 'imagem', estado: 'publicada', origem: 'fotografo', autor_nome: 'Foto Xirico', acesso_id: 'A2' },
                { id: 'F2', parte_id: 'P1', momento_id: 'O1', storage_path: 'tok/P1/b.mp4', tipo: 'video', estado: 'pendente', origem: 'participante', autor_nome: 'Zica', acesso_id: 'A1' }],
    modelos: [{ id: 'M1', tipo_id: 'lobolo', codigo: 'completo' }, { id: 'M2', tipo_id: 'casamento', codigo: 'classico' }],
    acessos: [{ id: 'A1', evento_id: 'E1', perfil: 'convidado', nome: 'QR geral', token: 'tok-geral', ativo: true, usos: 1 }, { id: 'A2', evento_id: 'E1', perfil: 'fotografo', nome: 'Foto Xirico', token: 'tok-xirico', ativo: true, usos: 1 }],
    acesso_partes: []
  };
  const escritas = [];
  const qb = (tab) => {
    const st = { tab, op: 'select', filtros: [] };
    const b = {
      select() { return b; }, order() { return b; }, neq(c, v) { st.filtros.push(r => r[c] !== v); return b; },
      eq(c, v) { st.filtros.push(r => r[c] === v); st.eq = [c, v]; return b; },
      insert(l) { st.op = 'insert'; st.linha = l; return b; }, update(c) { st.op = 'update'; st.campos = c; return b; },
      delete() { st.op = 'delete'; return b; },
      then(res, rej) {
        let data = (db[tab] || []).filter(r => st.filtros.every(f => f(r)));
        if (st.op !== 'select') { escritas.push({ ...st, filtros: undefined }); if (st.op === 'insert') { const l = [].concat(st.linha).map(x => ({ id: 'NOVO', ...x })); db[tab].push(...l); data = l; } }
        return Promise.resolve({ data, error: null }).then(res, rej);
      }
    };
    return b;
  };
  let adminOn = false;
  const mock = { createClient: () => ({
    from: qb,
    rpc: async (f, a) => { escritas.push({ rpc: f, a }); if (f === 'e_admin') return { data: adminOn, error: null };
      if (f === 'acesso_info') { const ac = db.acessos.find(x => x.token === a.p_token); return { data: ac ? { acesso: { id: ac.id, perfil: ac.perfil, nome: ac.nome }, evento: { id: 'E1', slug: 'andre-lucia', titulo: 'André & Lúcia', local: 'Maputo', categoria_id: 'uniao' }, partes: [{ id: 'P1', slug: 'lobolo', titulo: 'Lobolo', data: '2026-11-08', tipo_id: 'lobolo', momentos: [], missoes: [] }] } : null, error: null }; }
      if (f === 'registar_envio') return { data: a.p_ficheiros.length, error: null };
      return { data: 'P1', error: null }; },
    auth: { getSession: async () => ({ data: { session: adminOn ? { user: {} } : null }, error: null }),
            signInWithPassword: async () => { adminOn = true; return { data: {}, error: null }; }, signOut: async () => { adminOn = false; return { error: null }; } },
    storage: { from: () => ({ createSignedUrls: async (ps) => ({ data: ps.map(p => ({ path: p, signedUrl: 'https://x/' + p })) }),
      upload: async (p) => { escritas.push({ upload: p }); return { data: {}, error: null }; }, remove: async () => ({}) }) }
  }) };
  w = abrir('http://localhost:8000/#eventos', mock);
  await espera(150);
  const s = w.__t;
  ok(s.NUVEM && s.EVENTOS.length === 1, 'simulado: 1 evento carregado');
  ok(s.fotos.length === 1 || s.fotos.length === 2, 'simulado: ficheiros mapeados (' + s.fotos.length + ')');
  s.ir('evento/andre-lucia/lobolo');
  ok(w.document.querySelectorAll('#gal figure').length === 1, 'simulado: galeria mostra só o publicado');
  ok(w.document.getElementById('liveSel').selectedOptions[0].textContent.includes('Apresentação'), 'simulado: momento actual vem do servidor');
  ok(w.document.getElementById('liveSel').style.display === 'none', 'simulado: público não muda o momento actual');
  ok(w.document.querySelectorAll('#vows .vow').length === 1, 'simulado: mural só com o publicado');
  s.ir('admin'); ok(!!w.document.querySelector('.login'), 'simulado: painel pede login');
  w.document.getElementById('lgEmail').value = 'a@b.test'; w.document.getElementById('lgSenha').value = 'x';
  await w.entrar(); await espera(100);
  ok(s.souAdmin && !w.document.querySelector('.login'), 'simulado: login → painel');
  s.ir('admin/andre-lucia/lobolo'); s.setEvAba('qr');
  ok(w.document.querySelectorAll('.qr-card').length >= 2, 'simulado: acessos visíveis para admin');
  s.setEvAba('contrib');
  ok(w.document.querySelectorAll('.pn-contrib video').length === 1, 'simulado: vídeo pendente na moderação');
  ok(w.document.body.innerHTML.includes('Mensagens do mural por aprovar'), 'simulado: mural pendente na moderação');
  escritas.length = 0;
  await s.emNuvem.aprovar('F2'); ok(escritas.some(e => e.tab === 'ficheiros' && e.campos && e.campos.estado === 'publicada'), 'simulado: aprovar grava estado');
  w.rascunho = null;
  s.setRascunho({titulo:'Teste & Par',cat:'uniao',local:'Beira',partes:[{tipo:'casamento',modelo:'classico',titulo:'Casamento',data:'2027-01-01'}]});
  escritas.length = 0; await s.emNuvem.criarEvento();
  console.log('  toast:', w.document.getElementById('toast').textContent, JSON.stringify(escritas).slice(0,300));
  const ce = escritas.find(e => e.rpc === 'criar_evento');
  ok(ce && ce.a.p_partes[0].modelo_id === 'M2' && ce.a.p_slug === 'teste-par', 'simulado: criar_evento com modelo e slug certos');
  w.document.getElementById('acNome') || s.setEvAba('qr');
  s.ir('admin/andre-lucia/lobolo'); s.setEvAba('qr');
  w.document.getElementById('acNome').value = 'Mesa 1';
  escritas.length = 0; await s.emNuvem.criarAcesso('convidado');
  ok(escritas.some(e => e.tab === 'acessos' && e.op === 'insert' && e.linha.evento_id === 'E1'), 'simulado: criar QR grava acesso');
  // link de convidado (sessão nova, sem admin)
  adminOn = false;
  w = abrir('http://localhost:8000/#c/tok-geral', mock); await espera(150);
  ok(w.__t.vistaActual === 'convidado' && w.__t.acessoAtual.token === 'tok-geral', 'simulado: link de convidado validado no servidor');
  w.__t.buffer.conv.push({ src: 'data:x', vid: false, file: new w.File(['x'], 'foto.JPG', { type: 'image/jpeg' }) });
  w.document.getElementById('upName').value = 'Zica'; w.document.getElementById('upAceito').checked = true;
  escritas.length = 0; await w.__t.emNuvem.enviarConvidado();
  console.log('  toast2:', w.document.getElementById('toast').textContent, JSON.stringify(escritas).slice(0,300));
  const up = escritas.find(e => e.upload), re = escritas.find(e => e.rpc === 'registar_envio');
  ok(up && /^tok-geral\/P1\/.+\.jpg$/.test(up.upload), 'simulado: upload no caminho token/parte (' + (up && up.upload) + ')');
  ok(re && re.a.p_autor === 'Zica' && re.a.p_ficheiros[0].tipo === 'imagem', 'simulado: registar_envio chamado');
  w = abrir('http://localhost:8000/#f/nao-existe', mock); await espera(150);
  ok(w.__t.vistaActual === 'aviso', 'simulado: token inexistente → aviso');
  ok(w.erros.length === 0, 'simulado: sem erros JS ' + w.erros.join(' | '));
  process.exit(0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
