/* Secções do convidado dentro da página do evento (uma só página, como a maquete):
   transmissão em directo (no programa) · vídeos · "Faça parte desta memória" (enviar fotos)
   · QR Code "Partilhe o evento" · localização e contactos.
   renderEvento (evento.js) chama renderSeccoesEvento(e,s) depois de desenhar o resto. */

/* ---------- utilitários ---------- */
function cvTokenContribuir(e){const m=String(e.linkContribuir||'').match(/c\/([\w-]+)/); return m?m[1]:''}
function cvMapa(e){return e.mapa||[e.localNome,e.endereco,e.local].filter(Boolean).join(', ')}
function cvVideosVisiveis(e,s){
  if(e.perm&&e.perm.videos===false) return [];
  return (e.videos||[]).filter(v=>!v.sub||!s||v.sub===s.id);
}
function cvGaleriaAberta(e){return !(e.perm&&e.perm.galeria===false)}
/* link que o QR da página mostra: o de envio de fotos, se estiver aberto; senão, o da própria página */
function cvLinkQR(e,s){return e.linkContribuir||urlPagina(e,s)}

function renderSeccoesEvento(e,s){
  renderDirecto(e,s);
  renderVideos(e,s);
  renderContribuir(e,s);
  renderQREvento(e,s);
  renderLocalizacao(e,s);
}

/* ---------- transmissão em directo (faixa no fim do programa) ---------- */
function renderDirecto(e,s){
  const live=cvVideosVisiveis(e,s).find(v=>v.tipo==='live'), agora=estadoEv(e)==='decorrer';
  document.getElementById('evDirecto').innerHTML=live?`<div class="ve-directo">
      <span class="ve-directo-ic">${ico('ao_vivo')}</span>
      <div><b>Transmissão em directo</b><small>${agora?'Acompanhe o evento em tempo real.':'A transmissão fica disponível aqui.'}</small></div>
      ${agora?'<span class="ve-aovivo">Ao vivo</span>':''}
      <button class="ve-btn" onclick="irSeccao('videos')">Assistir</button>
    </div>`:'';
}

/* ---------- vídeos ---------- */
function mediaVideo(v){
  if(v.embed) return `<iframe src="${esc(v.embed)}" allowfullscreen loading="lazy" title="${esc(v.titulo)}"></iframe>`;
  if(v.tipo==='upload'&&v.src) return `<video src="${esc(v.src)}#t=0.1" controls playsinline preload="metadata"></video>`;
  return `<a href="${esc(v.src)}" target="_blank" rel="noopener" class="ve-video-link">${ico('play')}<span>${v.tipo==='live'?'Ver em directo':'Ver vídeo'}</span></a>`;
}
function rotuloVideo(v,e){
  return [v.oficial?'Vídeo oficial':'Vídeo', v.tipo==='live'?(estadoEv(e)==='decorrer'?'em directo':'transmissão'):'', v.duracao?'Duração: '+v.duracao:'']
    .filter(Boolean).map(esc).join(' · ');
}
function renderVideos(e,s){
  const vids=cvVideosVisiveis(e,s), el=document.getElementById('videos');
  if(!vids.length){ el.innerHTML=''; el.style.display='none'; return; }
  el.style.display='';
  const [p,...outros]=vids;
  el.innerHTML=`<span class="ve-eti">Vídeos</span>
    <h2 class="ve-h2">Reviva o evento em vídeo</h2>
    <p class="ve-sub">Assista ao vídeo oficial${vids.some(v=>v.tipo==='live')?' ou acompanhe a transmissão':''}.</p>
    <div class="ve-videos ${outros.length?'':'so-um'}">
      <article class="ve-video grande">
        <div class="ve-video-media">${mediaVideo(p)}${p.oficial?'<span class="ve-video-selo">Vídeo oficial</span>':''}</div>
        <div class="ve-video-txt"><b>${esc(p.titulo)}</b><small>${rotuloVideo(p,e)}</small></div>
      </article>
      ${outros.length?`<div class="ve-videos-lista">${outros.map(v=>`<article class="ve-video">
        <div class="ve-video-media">${mediaVideo(v)}</div>
        <div class="ve-video-txt"><b>${esc(v.titulo)}</b><small>${rotuloVideo(v,e)}</small></div></article>`).join('')}</div>`:''}
    </div>`;
}

/* ---------- "Faça parte desta memória" (leva à página de envio do QR de convidados) ---------- */
function renderContribuir(e,s){
  const tok=cvTokenContribuir(e);
  document.getElementById('galEnviar').style.display=tok?'':'none';
  document.getElementById('evContribuir').innerHTML=`<span class="ve-eti">Partilhar</span>
    <h2 class="ve-h2">Faça parte desta memória!</h2>
    ${tok?`<p class="ve-sub">Envie as suas fotos e vídeos do evento.</p>
      <button class="ve-drop" onclick="cvPartilharFotos()">
        ${ico('nuvem')}<b>Envie as suas fotos aqui</b><small>Abre a página de envio · fotografias e vídeos, até 20 de cada vez</small>
      </button>
      <button class="ve-btn" onclick="cvPartilharFotos()">${ico('camara')} Enviar fotos</button>
      <p class="ve-nota-p">${ico('coracao')} As fotos dos convidados entram na galeria depois de aprovadas pela organização.</p>`
    :`<p class="ve-sub">Os envios de fotografias estão fechados neste evento.</p>
      <div class="ve-drop off">${ico('nuvem')}<b>Envios fechados</b><small>Se recebeu um QR Code no convite ou na mesa, use esse.</small></div>`}`;
}
function cvPartilharFotos(){
  const tok=cvTokenContribuir(ev());
  if(!tok){ toast('Os envios de fotografias estão fechados neste evento.'); return; }
  ir('c/'+tok+'/'+atual.sub);
}

/* ---------- QR Code "Partilhe o evento" ---------- */
function renderQREvento(e,s){
  const contrib=!!e.linkContribuir, url=cvLinkQR(e,s);
  document.getElementById('evQR').innerHTML=`<span class="ve-eti">QR Code</span>
    <h2 class="ve-h2">Partilhe o evento</h2>
    <p class="ve-sub">${contrib?'Permita que os convidados enviem as suas fotos.':'Partilhe a página do evento com quem quiser.'}</p>
    <div class="ve-qr-grelha">
      <div class="ve-qr" id="evQRcaixa"></div>
      <div class="ve-qr-det">
        <b>Detalhes</b>
        <div class="ve-qr-linha"><span>Link de partilha</span><button onclick="copiarTexto(cvLinkQR(ev(),sub()))">${ico('copiar')} Copiar link</button></div>
        <div class="ve-qr-linha"><span>Descarregar QR Code</span><button onclick="baixarQRUrl(cvLinkQR(ev(),sub()),'${contrib?'envio':'pagina'}')" aria-label="Descarregar QR Code em PNG">${ico('descarregar')} PNG</button></div>
        <div class="ve-qr-linha"><span>Partilhar</span><span class="ve-redes">${htmlRedes()}</span></div>
      </div>
    </div>
    <p class="ve-qr-nota">${ico('info')} ${contrib?'Este código abre a página de envio de fotos para a galeria do evento.':'Este código abre esta página: programa e galeria.'}
      ${NUVEM?'':' Na demonstração, este evento de exemplo só existe neste navegador.'}</p>`;
  desenharQR(document.getElementById('evQRcaixa'),url,180);
}

/* ---------- localização e contactos ---------- */
function renderLocalizacao(e,s){
  const el=document.getElementById('localizacao'), q=cvMapa(e), tel=String(e.telefone||'').replace(/[^\d+]/g,'');
  const locais=[]; e.subs.forEach(x=>x.momentos.forEach(m=>{ if(m.l && !locais.some(l=>l.l===m.l)) locais.push({l:m.l, d:x.titulo+(m.h?' · '+m.h:'')}); }));
  if(!q && !tel && !e.email){ el.innerHTML=''; el.style.display='none'; return; }
  el.style.display='';
  el.innerHTML=`<div class="ve-dois">
    <div>
      <span class="ve-eti">Localização</span>
      <h2 class="ve-h2">Onde estamos?</h2>
      <div class="ve-local">${ico('pin')}<div><b>${esc(e.localNome||e.local||'Local por anunciar')}</b>
        <small>${esc([e.endereco,e.localNome?e.local:''].filter(Boolean).join(' · '))}</small></div></div>
      ${q?`<a class="ve-btn-suave" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}" target="_blank" rel="noopener">${ico('pin')} Ver no Google Maps</a>`:''}
      <div class="ve-info">
        <div><h3>Contactos</h3>
          ${tel||e.email?`${tel?`<a href="tel:${esc(tel)}">${ico('telefone')}<span>${esc(e.telefone)}</span></a>`:''}
            ${e.email?`<a href="mailto:${esc(e.email)}">${ico('email')}<span>${esc(e.email)}</span></a>`:''}`
          :'<p class="ve-nota-p">A organização ainda não indicou contactos.</p>'}</div>
        ${locais.length?`<div><h3>Locais do programa</h3>${locais.slice(0,5).map(l=>`<p class="ve-info-l">${ico('pin')}<span>${esc(l.l)}<small>${esc(l.d)}</small></span></p>`).join('')}</div>`:''}
      </div>
    </div>
    ${q?`<div class="ve-mapa"><iframe loading="lazy" referrerpolicy="no-referrer" title="Mapa — ${esc(q)}"
        src="https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed"></iframe></div>`:''}
  </div>`;
}
