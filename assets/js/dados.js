/* Dados de demonstração: categorias, tipos de evento com modelos de programa,
   temas visuais, pool de fotografias e eventos iniciais. */

/* ===================== CATEGORIAS ===================== */
const CATEGORIAS=[
 {id:'uniao',       n:'Casamentos & união',     ic:'💍', d:'Casamento, lobolo, noivado e bodas'},
 {id:'familia',     n:'Família & celebrações',  ic:'🎈', d:'Batizados, aniversários, chás e graduações'},
 {id:'corporativo', n:'Corporativo',            ic:'🏢', d:'Conferências, lançamentos e galas'},
 {id:'homenagem',   n:'Homenagens',             ic:'🕊️', d:'Cerimónias de homenagem e memória'}
];

/* ===================== TEMAS ===================== */
/* Cada tema substitui as variáveis de cor do CSS na página pública do evento. */
const TEMAS={
 marfim:     {n:'Marfim e dourado',        gold:'#A8824C', terra:'#9E4F36', ivory:'#FAF7F2', sand:'#EDE4D7', line:'#DCD0BE'},
 capulana:   {n:'Capulana (terra e ocre)', gold:'#B5541C', terra:'#7A2E1C', ivory:'#FBF4EA', sand:'#F2DFC6', line:'#E3C7A2'},
 oceano:     {n:'Oceano (praia)',          gold:'#2F7F86', terra:'#C46A4A', ivory:'#F5F8F7', sand:'#DFECEA', line:'#C6DAD6'},
 prata:      {n:'Prata',                   gold:'#7E848E', terra:'#4F5664', ivory:'#F8F8F6', sand:'#EAEAE6', line:'#D6D6D0'},
 ternura:    {n:'Ternura (tons suaves)',   gold:'#7F98C2', terra:'#C27F86', ivory:'#FAF9F7', sand:'#ECEFF5', line:'#D7DCE6'},
 festa:      {n:'Festa (vibrante)',        gold:'#B83F7A', terra:'#D98E04', ivory:'#FCF8F5', sand:'#F6E6EC', line:'#EBCFDB'},
 corporativo:{n:'Corporativo (azul)',      gold:'#2D5BB8', terra:'#1B2B4A', ivory:'#F6F7FA', sand:'#E6EBF3', line:'#D0D8E6'},
 memoria:    {n:'Memória (sóbrio)',        gold:'#6B7D6A', terra:'#4A4A46', ivory:'#F6F5F1', sand:'#E8E7E0', line:'#D4D2C8'}
};

/* ===================== TIPOS E MODELOS ===================== */
/* Momento: [hora, nome, local (vazio = repete o anterior), chave do POOL de fotos demo]
   Missão:  [ícone, texto, índice do momento] */
const TIPOS={
 casamento:{n:'Casamento', cat:'uniao', ic:'💍', tema:'marfim',
  d:'Cerimónia civil e/ou religiosa seguida de copo-d\'água.',
  modelos:[
   {id:'classico', n:'Clássico — civil, igreja e copo-d\'água', m:[
     ['08:00','Preparativos','Casa da noiva','prep'],
     ['10:30','Cerimónia Civil','Conservatória','civil'],
     ['12:00','Cerimónia Religiosa','Igreja','igreja'],
     ['14:30','Sessão de Fotos','Local da sessão','sessao'],
     ['16:30','Copo-d\'água','Salão de festas','recep'],
     ['18:30','Discursos & Bolo','','disc'],
     ['20:00','Primeira Dança','','danca'],
     ['21:30','Festa','','festa']],
    mis:[['💃','O teu melhor passo de dança',7],['🪑','A tua mesa completa',4],
         ['👟','Os sapatos mais bonitos da festa',4],['😂','Alguém a rir sem saber que é foto',5],
         ['🤍','Os noivos sem olharem',2]]},
   {id:'civil', n:'Civil e copo-d\'água', m:[
     ['08:30','Preparativos','Casa da noiva','prep'],
     ['10:00','Cerimónia Civil','Conservatória','civil'],
     ['11:30','Fotos de família','Jardim da conservatória','sessao'],
     ['13:00','Copo-d\'água','Salão de festas','recep'],
     ['16:00','Discursos & Bolo','','disc'],
     ['18:00','Festa','','festa']],
    mis:[['👨‍👩‍👧','As duas famílias juntas',2],['🥂','O brinde da tua mesa',3],
         ['🎂','O bolo de outro ângulo',4],['💃','O teu melhor passo de dança',5]]},
   {id:'praia', n:'Casamento na praia (fim de tarde)', m:[
     ['12:00','Preparativos','Hotel / casa','prep'],
     ['15:30','Chegada dos convidados','Praia','sessao'],
     ['16:00','Cerimónia na praia','','igreja'],
     ['17:15','Pôr-do-sol com os noivos','','sessao'],
     ['18:30','Jantar','Restaurante / lodge','recep'],
     ['20:00','Primeira Dança','','danca'],
     ['21:00','Festa','','festa']],
    mis:[['🌅','O pôr-do-sol atrás dos noivos',3],['🐚','Pés na areia',1],['💃','O teu melhor passo de dança',6]]}
  ]},
 lobolo:{n:'Lobolo', cat:'uniao', ic:'🧣', tema:'capulana',
  d:'Casamento tradicional do sul de Moçambique: pedido, kuphahla, negociação da carta de lobolo e entrega dos presentes.',
  modelos:[
   {id:'completo', n:'Lobolo tradicional completo', m:[
     ['06:30','Kuphahla — evocação dos antepassados','Casa da família da noiva'],
     ['09:00','Chegada da comitiva do noivo',''],
     ['10:00','Apresentação das famílias',''],
     ['11:00','Negociação e carta de lobolo',''],
     ['13:00','Entrega dos presentes e do lobolo',''],
     ['14:00','A noiva avalia os presentes e aceita',''],
     ['15:00','Refeição partilhada',''],
     ['17:00','Festa e dança','']],
    mis:[['👨‍👩‍👧‍👦','As duas famílias na mesma foto',2],['🎁','Os presentes antes da entrega',4],
         ['🧣','As capulanas mais bonitas',6],['👵','Os mais velhos a contar histórias',6],
         ['🥁','A dança das famílias',7]]},
   {id:'pedido', n:'Pedido — hikombela-mati', m:[
     ['10:00','Chegada da família do noivo','Casa da família da noiva'],
     ['10:30','Pedido (hikombela-mati)',''],
     ['11:30','Entrega da carta de lobolo',''],
     ['12:30','Almoço das famílias','']],
    mis:[['🤝','O primeiro cumprimento entre famílias',1],['🍲','A mesa do almoço',3]]},
   {id:'simbolico', n:'Lobolo simbólico com almoço', m:[
     ['10:00','Chegada das famílias','Casa da família da noiva'],
     ['11:00','Apresentação e conversa',''],
     ['12:00','Entrega simbólica',''],
     ['13:00','Almoço',''],
     ['15:00','Convívio e dança','']],
    mis:[['🧣','As capulanas mais bonitas',4],['👨‍👩‍👧‍👦','As duas famílias na mesma foto',1]]}
  ]},
 noivado:{n:'Noivado', cat:'uniao', ic:'💌', tema:'marfim',
  d:'Pedido de casamento e jantar com família e amigos.',
  modelos:[
   {id:'jantar', n:'Jantar de noivado', m:[
     ['18:30','Recepção dos convidados','Restaurante'],
     ['19:15','O pedido e o anel',''],
     ['19:30','Brinde',''],
     ['20:00','Jantar',''],
     ['21:30','Festa','']],
    mis:[['💍','O anel de perto',1],['🥂','O teu brinde',2]]}
  ]},
 bodas:{n:'Bodas', cat:'uniao', ic:'🥂', tema:'prata',
  d:'Aniversário de casamento: prata, ouro e outras bodas.',
  modelos:[
   {id:'bodas', n:'Bodas de prata ou ouro', m:[
     ['10:00','Missa de acção de graças','Igreja'],
     ['11:30','Renovação de votos',''],
     ['12:30','Fotos de família','Jardim'],
     ['13:30','Almoço','Salão'],
     ['16:00','Homenagem dos filhos e netos',''],
     ['17:30','Festa','']],
    mis:[['📸','Três gerações na mesma foto',2],['💌','A homenagem dos filhos',4]]}
  ]},
 batizado:{n:'Batizado', cat:'familia', ic:'🕯️', tema:'ternura',
  d:'Cerimónia religiosa e almoço com padrinhos e família.',
  modelos:[
   {id:'igreja', n:'Batizado na igreja com almoço', m:[
     ['09:00','Preparação do bebé','Casa da família'],
     ['10:00','Cerimónia do batismo','Igreja'],
     ['11:30','Fotos com os padrinhos',''],
     ['13:00','Almoço','Casa / salão'],
     ['15:00','Bolo','']],
    mis:[['👶','O bebé com os padrinhos',2],['🕯️','A vela do batismo',1]]}
  ]},
 aniversario:{n:'Aniversário', cat:'familia', ic:'🎂', tema:'festa',
  d:'Festas de aniversário de adultos e crianças.',
  modelos:[
   {id:'adulto', n:'Festa de aniversário', m:[
     ['18:00','Chegada','Local da festa'],
     ['19:00','Jantar',''],
     ['20:30','Parabéns e bolo',''],
     ['21:00','Festa','']],
    mis:[['🎂','O momento de apagar as velas',2],['🎈','A cara mais divertida',3]]},
   {id:'infantil', n:'Aniversário infantil', m:[
     ['14:00','Chegada','Local da festa'],
     ['14:30','Brincadeiras e animação',''],
     ['16:00','Lanche',''],
     ['16:30','Parabéns e bolo',''],
     ['17:30','Lembranças','']],
    mis:[['🎈','A cara mais divertida',1],['🎂','O momento de apagar as velas',3]]}
  ]},
 chabebe:{n:'Chá de bebé', cat:'familia', ic:'🍼', tema:'ternura',
  d:'Encontro antes do nascimento, com jogos e presentes.',
  modelos:[
   {id:'cha', n:'Chá de bebé', m:[
     ['15:00','Recepção','Casa'],
     ['15:30','Jogos',''],
     ['16:30','Revelação',''],
     ['17:00','Lanche',''],
     ['17:45','Presentes','']],
    mis:[['🎁','O presente mais bonito',4]]}
  ]},
 graduacao:{n:'Graduação', cat:'familia', ic:'🎓', tema:'festa',
  d:'Cerimónia de graduação e celebração com a família.',
  modelos:[
   {id:'graduacao', n:'Graduação', m:[
     ['09:00','Cerimónia de graduação','Universidade'],
     ['11:30','Fotos de beca','Campus'],
     ['13:00','Almoço de família','Restaurante'],
     ['19:00','Festa','Local da festa']],
    mis:[['🎓','O chapéu no ar',1]]}
  ]},
 conferencia:{n:'Conferência', cat:'corporativo', ic:'🎤', tema:'corporativo',
  d:'Conferências, seminários e workshops.',
  modelos:[
   {id:'dia', n:'Conferência de um dia', m:[
     ['08:00','Credenciação','Centro de conferências'],
     ['09:00','Abertura',''],
     ['10:00','Painéis da manhã',''],
     ['12:30','Almoço e networking',''],
     ['14:00','Painéis da tarde',''],
     ['17:00','Encerramento',''],
     ['18:00','Cocktail','']],
    mis:[['🤝','Uma nova ligação profissional',3]]}
  ]},
 lancamento:{n:'Lançamento', cat:'corporativo', ic:'🚀', tema:'corporativo',
  d:'Lançamentos de produto, marca ou espaço.',
  modelos:[
   {id:'produto', n:'Lançamento de produto', m:[
     ['17:30','Chegada dos convidados','Espaço do evento'],
     ['18:00','Apresentação',''],
     ['18:45','Revelação do produto',''],
     ['19:15','Demonstrações',''],
     ['20:00','Cocktail','']],
    mis:[]}
  ]},
 gala:{n:'Gala', cat:'corporativo', ic:'🏆', tema:'corporativo',
  d:'Galas de prémios e jantares de empresa.',
  modelos:[
   {id:'premios', n:'Gala de prémios', m:[
     ['19:00','Passadeira','Hotel'],
     ['20:00','Jantar',''],
     ['21:00','Entrega de prémios',''],
     ['22:00','Actuação',''],
     ['22:30','Festa','']],
    mis:[['📸','A tua mesa na passadeira',0]]}
  ]},
 homenagem:{n:'Homenagem', cat:'homenagem', ic:'🕊️', tema:'memoria',
  d:'Cerimónias de homenagem, memória e acção de graças.',
  modelos:[
   {id:'cerimonia', n:'Cerimónia de homenagem', m:[
     ['10:00','Recepção','Local da cerimónia'],
     ['10:30','Cerimónia',''],
     ['11:30','Testemunhos',''],
     ['12:30','Momento de recordação',''],
     ['13:00','Convívio','']],
    mis:[['🕊️','Uma fotografia antiga que guardas',3]]}
  ]}
};

const CORES=['#A8824C','#9E4F36','#3F5D45','#2E3A4A','#6B4A5A','#4A3B32'];

/* Fotografias Adobe Stock (nível gratuito). Tenta a rendição 500px e cai para 240px. */
const C='https://t3.ftcdn.net/jpg/', D='https://t4.ftcdn.net/jpg/';
const POOL={
 prep:[C+'01/20/42/38/240_F_120423819_mlQuKeVE1ijc1a7WOxILair0pJglcaQE.jpg',
       C+'03/17/60/56/240_F_317605634_Xtb3FhuamPd7ZU22KhbgEcjlI0kZwWLJ.jpg',
       C+'05/26/83/38/240_F_526833873_vwiVyiEcDbBH9GBDiQq1qCLC26h64jVQ.jpg',
       D+'03/03/51/17/240_F_303511735_f9531EZHg5N06EQD9WD6Qe6rEbiBtwhO.jpg',
       D+'08/97/06/95/240_F_897069517_aYSJUr5WeWKeaCXMiiuZndI8caI5RFBM.jpg',
       D+'15/14/88/47/240_F_1514884750_YxkduGYXlRGtv2MC1lVcerRmrtpSjsZg.jpg'],
 civil:[D+'18/72/18/49/240_F_1872184917_0dtDC7502nLxmYNlP8SFhDu15JntbdeI.jpg',
       C+'03/38/63/52/240_F_338635207_W85Ms6iJKdsDgxzy1nmoQe0oPoRJ6jLS.jpg',
       D+'02/41/98/61/240_F_241986105_05LW7ciXuGnylOMBPRcR4IMBpvxMgDBW.jpg',
       D+'05/68/16/71/240_F_568167146_yti1AQdmoRBoajM7xJOLu4BdJKPGnMDb.jpg',
       D+'04/73/66/71/240_F_473667142_HS4zyy8r3MpA8oyvKQuhv4EbaxCRDr2s.jpg'],
 igreja:[D+'02/69/26/27/240_F_269262716_cFwM6AdtvD8UApHTnXNOApCo881g0ytT.jpg',
       C+'02/40/83/60/240_F_240836029_WN0qbaV5cqr3RKYWuvBXXYIgWSFPbSix.jpg',
       C+'01/42/70/46/240_F_142704601_LiWBgoyS9LrURqTEalaGaugX1Lnd8WBJ.jpg',
       C+'04/71/45/02/240_F_471450207_ZSmntTjpttNXHQ7YW3ifovq4sU4BheTa.jpg',
       C+'18/75/06/02/240_F_1875060246_7PM4Xh9LYWS7Qk6yn1yA24TlUsEWCf9p.jpg',
       C+'14/30/65/56/240_F_1430655667_hqqFIMjOZFWpTvuLsU4y7nE1TMaGMdd7.jpg',
       D+'02/00/89/81/240_F_200898160_luN11EnNFY2DnoXZMYwYvPakqdwW0QXc.jpg',
       C+'18/75/06/24/240_F_1875062478_9NSV6ap8wXfcP7HC8UjtHpk9e32wixFz.jpg',
       C+'06/19/23/54/240_F_619235425_1fkZn8LRYicTAdJsbT7I07Xw7OgvGlIW.jpg'],
 sessao:[D+'06/27/58/01/240_F_627580191_2frmqASj7qP8bco3ntMkT5rpDueMs5k8.jpg',
       D+'02/19/68/77/240_F_219687764_uO7IfwphDoSTi6bPuVDFkkjEWz23rlWb.jpg',
       C+'01/26/12/76/240_F_126127612_peIC20Ki912MDRcmfYdcCz70SI6DipmN.jpg',
       C+'06/67/96/86/240_F_667968614_AqyEw6snonTga21XDIVMHYHcf6mu5j9U.jpg',
       D+'00/94/71/01/240_F_94710112_SEqmEHtz5FpXmc4XtQjUYjFdZOdzaGws.jpg',
       D+'06/83/31/01/240_F_683310120_ckBzHtXrsRGv5R5rVk45B2uTZzW78Z56.jpg'],
 recep:[D+'02/94/65/19/240_F_294651920_Jo1i6kah0yG3bC0duVVgtOYDP7tInWjx.jpg',
       D+'03/04/13/21/240_F_304132185_rxYDTxC1fXVH2CWOqZ2OOHblsUkjXdtF.jpg',
       D+'03/61/89/19/240_F_361891940_RITbaMdLTUPjl1qSP7mqt7N82G82bgjs.jpg',
       C+'04/16/05/38/240_F_416053829_C1OYgUUqot9pfgroHmNwMMh9ayY6o5Pr.jpg',
       D+'02/26/94/69/240_F_226946956_8QumdX09cYjbZn7h2WEdxR0ciXHpn2Qm.jpg',
       C+'02/98/88/24/240_F_298882437_ZyAGlIQgDTLbHXOC9QNQ7UlOFOvPJkbi.jpg',
       C+'01/60/09/20/240_F_160092021_lV3FOd2YSBaHOb8U3ZqPe7f0tC8bQcz2.jpg',
       D+'01/87/00/27/240_F_187002737_hTOrm57xBMLyVkNZFzmD5uG6B5tygXYD.jpg'],
 disc:[D+'03/76/82/99/240_F_376829984_iZnLYBj6z1SGu1ESR8iCthIsj71tfQuE.jpg',
       C+'15/68/08/60/240_F_1568086023_LCCTl0G7Cgntrdp1YhsaDCO2NLKDJcb4.jpg',
       D+'05/19/13/33/240_F_519133353_RggnwTu4uncsjf9aaQ6H5zBOPx6m2mhs.jpg',
       D+'05/89/55/93/240_F_589559300_TwjGI1ViGtCmpnZvSM71UCKohHhkKyCQ.jpg'],
 danca:[C+'03/81/85/58/240_F_381855881_n9fddqcwMHP0jJvqxMWdkfL1wh7HBptp.jpg',
       C+'01/00/41/62/240_F_100416215_2JVcOtNBld1kpyUUIHjtBdMDiBiJJZUB.jpg',
       D+'03/00/48/21/240_F_300482158_ZnwBx5ZinfZ235DmxrvRk2wBX8oamVvC.jpg',
       D+'03/92/06/27/240_F_392062723_rQN1Kj39XdzpzMJyfQZKY9WtZ5IGSsiA.jpg'],
 festa:[D+'01/67/51/77/240_F_167517788_RQJvr2uUYTvefI4c4hSX2tg5ggZLTTsk.jpg',
       D+'02/38/86/87/240_F_238868766_bvBkhaUpy6ZbO0ncd6pmu9ncSoo3aal2.jpg',
       D+'02/96/44/59/240_F_296445987_Rb7avQwpm5Eih0MP3tn5dGxEzGkf14tJ.jpg',
       C+'08/17/95/64/240_F_817956432_zgjvxsfijwOKnZOb7K9DT7DvEdKHMMoG.jpg']
};
const usados={};
function proxSrc(f){const a=POOL[f]||[]; if(!a.length)return ''; usados[f]=(usados[f]||0); const u=a[usados[f]%a.length]; usados[f]++; return u;}
function hi(u){return u&&u.indexOf('/240_F_')>-1 ? u.replace('/240_F_','/500_F_') : u;}
/* Fotos do próprio site (assets/img/*.jpg) são servidas em WebP (800 e 1600 px); o JPG fica de reserva.
   prio=true: imagem principal da página (sem carregamento diferido, prioridade alta — melhora o LCP). */
function imgTag(u,alt,cls,prio){
  const loc=/^assets\/img\/[\w-]+\.jpg$/.test(u||''), b=loc?u.slice(0,-4):'';
  const fontes=loc?`src="${b}.webp" srcset="${b}-800.webp 800w, ${b}.webp 1600w" sizes="(min-width:900px) 50vw, 100vw" `:`src="${hi(u)}" `;
  const a=String(alt||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  return `<img ${cls?'class="'+cls+'" ':''}${fontes}data-o="${u}" alt="${a}" ${prio?'fetchpriority="high"':'loading="lazy"'} decoding="async"
    onerror="if(!this.dataset.fb&&this.dataset.o){this.dataset.fb=1;this.removeAttribute('srcset');this.src=this.dataset.o}">`;
}

/* Imagem gerada (SVG) para momentos sem fotografia de demonstração. */
function arte(seed,label,largo){
  const pal=[['#2E3A2F','#C7A676'],['#4A3B32','#E3CBAE'],['#1C2B33','#A6563C'],
             ['#5B4A3F','#D8C3A5'],['#303A45','#C9A227'],['#3E2F2B','#CBB49A'],
             ['#43382F','#B9CBB4'],['#2B2A3A','#D9A98C']];
  const p=pal[seed%pal.length];
  const r=n=>{const x=Math.sin(seed*127.1+n*311.7)*43758.5453; return x-Math.floor(x);};
  const w=largo?400:300, h=largo?300:300;
  const txt=String(label||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<circle cx="${(30+r(1)*240).toFixed(0)}" cy="${(40+r(2)*200).toFixed(0)}" r="${(30+r(3)*70).toFixed(0)}" fill="#fff" opacity="${(0.06+r(4)*0.1).toFixed(2)}"/>
<circle cx="${(40+r(5)*260).toFixed(0)}" cy="${(60+r(6)*210).toFixed(0)}" r="${(18+r(7)*46).toFixed(0)}" fill="#000" opacity="0.1"/>
<path d="M0 ${(h*0.72).toFixed(0)} Q ${(w*0.3).toFixed(0)} ${(h*(0.58+r(8)*0.18)).toFixed(0)} ${w} ${(h*0.78).toFixed(0)} L ${w} ${h} L 0 ${h} Z" fill="#000" opacity="0.17"/>
<text x="16" y="${h-16}" font-family="Georgia,serif" font-size="13" fill="#fff" opacity="0.62">${txt}</text>
</svg>`;
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
}

/* Cria uma parte de evento (casamento, lobolo...) a partir de um tipo e modelo. */
function instanciar(tipoId,modeloId,extra){
  const t=TIPOS[tipoId], mod=t.modelos.find(m=>m.id===modeloId)||t.modelos[0];
  let ult='';
  const momentos=mod.m.map((x,i)=>{ ult=x[2]||ult; return {id:'m'+(i+1), h:x[0], n:x[1], l:ult, p:x[3]||null}; });
  const missoes=(mod.mis||[]).map((x,i)=>({id:'q'+(i+1), ic:x[0], t:x[1], f:(momentos[x[2]]||momentos[0]).id}));
  return Object.assign({id:tipoId, tipo:tipoId, modelo:mod.id, titulo:t.n, data:'', tema:t.tema,
    momentos, missoes, votos:[], momento:momentos[0].id}, extra||{});
}

/* ===================== EVENTOS DE DEMONSTRAÇÃO ===================== */
/* Nomes fictícios. */
let EVENTOS=[], fotos=[], seq=0;

/* Acesso = o token por trás de cada link/QR. perfil: convidado | fotografo.
   partes vazio = todas as partes do evento. */
function gerarToken(){return Math.random().toString(36).slice(2,8)+Math.random().toString(36).slice(2,4)}
function novoAcesso(perfil,nome,partes,token){
  return {id:'a'+(token||gerarToken()), perfil, nome, token:token||gerarToken(), partes:partes||[], ativo:true, usos:0};
}
function acessosPadrao(e){
  return [novoAcesso('convidado','QR geral dos convidados',[],e.id+'-c'),
          novoAcesso('fotografo','Fotógrafo principal',[],e.id+'-f')];
}

function add(e,s,idx,autor,origem,estado,vid,acesso){
  const m=s.momentos[idx]; seq++;
  const src=m.p ? proxSrc(m.p) : arte(seq, m.n, false);
  fotos.push({id:'f'+seq, ev:e.id, sub:s.id, fase:m.id, autor, origem, estado, vid:!!vid, src, hora:m.h, missao:null, acesso:acesso||null});
}

function semear(){
  EVENTOS=[]; fotos=[]; seq=0; Object.keys(usados).forEach(k=>delete usados[k]);

  /* --- Nélia & Tomás: casamento clássico (evento piloto) --- */
  const nt={id:'nelia-tomas', titulo:'Nélia & Tomás', cat:'uniao', local:'Inhambane', estado:'decorrer', capa:POOL.sessao[1], subs:[]};
  const c=instanciar('casamento','classico',{data:'2026-12-12'});
  ['Casa da noiva · Bairro Liberdade','Conservatória de Inhambane','Igreja Metodista Unida','Praia do Tofo',
   'Salão Baobá','Salão Baobá','Salão Baobá','Salão Baobá'].forEach((l,i)=>c.momentos[i].l=l);
  c.momento='m5';
  c.votos=[
   {q:'Que a casa de vocês tenha sempre mesa cheia e porta aberta.', a:'Tia Carminda'},
   {q:'Cresci a ver-te sonhar com este dia, Nélia. Valeu a espera.', a:'Hélia Macamo'},
   {q:'Tomás, trataste-a bem. Continua.', a:'Mano Dário'}];
  nt.subs.push(c); EVENTOS.push(nt);
  nt.acessos=[novoAcesso('convidado','Convites e mesas',[],'nt-mesas'),
              novoAcesso('convidado','Família do noivo',[],'nt-familia'),
              novoAcesso('fotografo','Studio Lume',[],'nt-lume'),
              novoAcesso('fotografo','Studio Lume — 2.º fotógrafo',[],'nt-lume2')];
  [4,3,5,6,5,3,3,4].forEach((q,i)=>{for(let k=0;k<q;k++) add(nt,c,i,'Studio Lume','fotografo','publicada',k===q-1&&q>3,'ant-lume');});
  [[1,'Hélia Macamo'],[2,'Dário Nhaca'],[2,'Zica Bila'],[4,'Zica Bila'],[4,'Aurélio Chissano'],[4,'Fátima Jamal'],
   [5,'Hélia Macamo'],[6,'Elton Mavie'],[7,'Elton Mavie'],[7,'Carminda Pereira'],[7,'Dário Nhaca'],[3,'Fátima Jamal']]
    .forEach(([i,a],k)=>add(nt,c,i,a,'participante','publicada',k===9,k%3?'ant-mesas':'ant-familia'));
  [[7,'Elton Mavie'],[4,'Zica Bila'],[6,'Carminda Pereira'],[5,'Aurélio Chissano'],[7,'Hélia Macamo']]
    .forEach(([i,a])=>add(nt,c,i,a,'participante','pendente',false,'ant-mesas'));

  /* --- André & Lúcia: lobolo (já realizado) + casamento (a seguir) --- */
  const al={id:'andre-lucia', titulo:'André & Lúcia', cat:'uniao', local:'Maputo', estado:'auto', capa:null, subs:[]};
  const lb=instanciar('lobolo','completo',{data:'2026-11-08'});
  lb.momentos.forEach(m=>m.l='Casa da família Mondlane · Matola');
  lb.momento='m5';
  lb.votos=[{q:'Duas famílias, uma só mesa. Que seja sempre assim.', a:'Avó Rosalina'}];
  const ca=instanciar('casamento','classico',{data:'2026-12-19'});
  ['Casa da noiva · Sommerschield','Conservatória do 1.º Bairro','Catedral de Maputo','Jardim Tunduru',
   'Salão Polana','Salão Polana','Salão Polana','Salão Polana'].forEach((l,i)=>ca.momentos[i].l=l);
  al.subs.push(lb,ca); EVENTOS.push(al);
  al.acessos=[novoAcesso('convidado','QR geral (convite)',[],'al-geral'),
              novoAcesso('convidado','Família Mondlane — lobolo',['lobolo'],'al-lobolo'),
              novoAcesso('fotografo','Foto Xirico',['lobolo'],'al-xirico'),
              novoAcesso('fotografo','Studio Lume',['casamento'],'al-lume')];
  [1,2,2,3,4,3,4,5].forEach((q,i)=>{for(let k=0;k<q;k++) add(al,lb,i,'Foto Xirico','fotografo','publicada',false,'aal-xirico');});
  [[2,'Rosalina Mondlane'],[4,'Celso Tembe'],[6,'Rosalina Mondlane'],[7,'Neusa Cossa'],[7,'Celso Tembe']]
    .forEach(([i,a])=>add(al,lb,i,a,'participante','publicada',false,'aal-lobolo'));
  [[6,'Neusa Cossa'],[7,'Jaime Sitoe']].forEach(([i,a])=>add(al,lb,i,a,'participante','pendente',false,'aal-geral'));

  /* --- Outros eventos em preparação --- */
  EVENTOS.push({id:'bodas-guambe', titulo:'Bodas de Prata · Sr. e Sra. Guambe', cat:'uniao', local:'Maxixe', estado:'auto',
    capa:'assets/img/flores-casamento.jpg', subs:[instanciar('bodas','bodas',{data:'2027-02-07'})]});
  EVENTOS.push({id:'batizado-luena', titulo:'Batizado da Luena', cat:'familia', local:'Inhambane', estado:'auto',
    capa:'assets/img/batizado-igreja.jpg', subs:[instanciar('batizado','igreja',{data:'2027-03-21'})]});
  EVENTOS.push({id:'gala-inhambane-2027', titulo:'Gala Empresarial de Inhambane 2027', cat:'corporativo', local:'Inhambane', estado:'auto',
    capa:'assets/img/corporativo-banquete.jpg', subs:[instanciar('gala','premios',{data:'2027-04-10'})]});
  EVENTOS.forEach(e=>{ if(!e.acessos) e.acessos=acessosPadrao(e); });
  Object.assign(EVENTOS[0],{descricao:'Depois de sete anos juntos, a Nélia e o Tomás casam-se em Inhambane, entre a conservatória, a igreja e uma tarde na Praia do Tofo. Um dia inesquecível, repleto de amor e de momentos únicos — e aqui fica tudo guardado.',
    localNome:'Salão Baobá', endereco:'Inhambane (morada fictícia)', mapa:'Praia do Tofo, Inhambane, Moçambique',
    telefone:'+258 84 000 0000', email:'organizacao@exemplo.com'});
  Object.assign(EVENTOS[1],{descricao:'Duas famílias, dois dias: o lobolo na Matola e, uma semana depois, o casamento em Maputo.',
    localNome:'Salão Polana', mapa:'Maputo, Moçambique', telefone:'+258 84 000 0000', email:'organizacao@exemplo.com'});
  EVENTOS[0].acessos[0].naPagina=true; EVENTOS[1].acessos[0].naPagina=true;
  EVENTOS.forEach(completarEvento);
}

/* Campos do fluxo v1.0 (informação, permissões, vídeos, visitas) com valores por defeito. */
function completarEvento(e){
  const def={descricao:'', localNome:'', endereco:'', mapa:e.local||'', telefone:'', email:'', cor:'', fonte:'',
             perm:{envios:true, videos:true, galeria:true}, videos:[], visitasDia:[], publico:true};
  Object.keys(def).forEach(k=>{ if(e[k]===undefined) e[k]=def[k]; });
  (e.acessos||[]).forEach(a=>{ if(a.naPagina===undefined) a.naPagina=false; });
  if(!e.acessos.some(a=>a.naPagina)){ const a=e.acessos.find(x=>x.perfil==='convidado'); if(a) a.naPagina=true; }
  if(!e.visitasDia.length && e.publico){            /* visitas fictícias (só modo demonstração) */
    let s=0; for(const c of e.id) s=(s*31+c.charCodeAt(0))>>>0;
    for(let i=13;i>=0;i--){ const d=new Date(Date.now()-i*864e5).toISOString().slice(0,10);
      e.visitasDia.push({dia:d, n:Math.round(20+((s>>(i%16))&31)+ (13-i)*4)}); }
  }
  /* link de contribuição: calculado sempre que é lido (não fica guardado) */
  Object.defineProperty(e,'linkContribuir',{configurable:true, enumerable:false, get(){
    const a=(e.acessos||[]).find(x=>x.perfil==='convidado'&&x.ativo&&x.naPagina);
    return a && e.perm.envios && typeof urlRota==='function' ? urlRota('c/'+a.token) : ''; }});
  return e;
}
