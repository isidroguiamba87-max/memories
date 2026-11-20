# Memória — segurança e SEO (estado em 20/11/2026)

Auditoria e implementação do «Padrão de segurança e SEO» (Partes A e B) neste repositório.
Site estático (HTML + CSS + JavaScript sem build) na Vercel, dados no Supabase.
Domínio actual: **https://memories-sigma-flax.vercel.app**.

**Verificação:** `npm test` (base de dados em PGlite + interface em jsdom, 112 testes) e `npm run audit`.
Não há build, verificação de tipos nem lint, porque o projecto não usa nenhum destes passos.

---

## 1. Relatório

### Implementado (commits `c0ae0d6` → este)
| Fase | O quê |
|---|---|
| Cabeçalhos | HSTS, CSP (Report-Only), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP, cache longa para `assets/vendor` |
| Cadeia de fornecimento | qrcode, jszip e supabase-js servidos do próprio site (`assets/vendor/`). O qrcode descarregado confere com o SRI do cdnjs. supabase-js 2.45.4 → 2.119.0 (corrige GHSA-8r88-6cj9-9fh5) |
| Testes | `testes/` no repositório + `npm test`, com código de saída ≠ 0 quando algo falha |
| SEO | título e descrição únicos, canónica, Open Graph + cartão X (imagem 1200×630), JSON-LD (Organization, WebSite, Service), `robots.txt`, `sitemap.xml`, `llms.txt`, `manifest.webmanifest`, ícones, `404.html`, `lang="pt-MZ"`. As vistas privadas (eventos, links de convidado/fotógrafo, painel) recebem título próprio e `noindex` |
| Desempenho | fotos em WebP (800/1600 px, até 85 % mais leves), `srcset`, hero com `fetchpriority=high` + preload, scripts `defer`, fontes sem bloquear o desenho da página, sem imagem externa da Adobe Stock na página inicial |
| Acessibilidade | contraste AA no laranja da página inicial (#C8582B → #B04A20), nome acessível nas miniaturas do carrossel |
| Anti-abuso | migração `20261120120000_limites.sql`: pedidos 5/h por IP e 200/h no total, mural 10 por 10 min, ficheiros 300/h (convidado) ou 3000/h (fotógrafo), visitas 60 por 10 min. IP guardado só como hash e apagado ao fim de 1 dia. Campo-armadilha validado no formulário e na base de dados |
| Erros | o formulário de pedidos deixou de mostrar mensagens técnicas e não regista dados pessoais na consola |
| `SECURITY.md` | canal privado de relato (GitHub → Security) |

### Medições (Lighthouse 12, Chrome headless)
| | Desempenho | Acessib. | Boas práticas | SEO | LCP |
|---|---|---|---|---|---|
| **Antes**: produção, telemóvel | 66 | 88 | 100 | 91 | 4,7 s |
| **Antes**: produção, computador | 71 | 93 | 100 | 91 | 2,5 s |
| **Depois**: produção, telemóvel | 88–89* | 95 | 100 | 100 | 3,6–3,9 s |
| **Depois**: produção, computador | 94 | 93 | 100 | 100 | 1,6 s |

\* Duas medições em 20/11/2026, depois do commit `cb32841`. A primeira medição a seguir à publicação
deu 63, por a cache da Vercel ainda estar vazia. Confirma também no PageSpeed Insights.

### Não foi possível fazer no código, e porquê
- **CSP sem `'unsafe-inline'`:** o site tem ~170 `onclick` escritos no HTML, e um site estático não consegue gerar nonces. A política continua a limitar as origens de scripts, ligações e iframes. Para retirar o `'unsafe-inline'` é preciso passar os handlers para `addEventListener`, uma refactorização grande.
- **Sessão em cookie HttpOnly:** o supabase-js guarda a sessão em `localStorage`. Mudar isto exige um servidor (SSR ou funções), e o site é estático.
- **Política de palavra-passe, bloqueio de login, 2FA, cópias de segurança:** configuram-se no painel do Supabase (ver secção 3).
- **Um único H1:** a página inicial tem a versão telemóvel e a de computador, cada uma com o seu H1. O CSS só mostra uma, e a escondida (`display:none`) fica fora da árvore de acessibilidade.
- **Fontes alojadas no site:** ficaram no Google Fonts (com `display=swap`), porque o editor de estilo dos eventos oferece mais 5 famílias carregadas a pedido.

---

## 2. Lista de verificação

Legenda: ✅ feito · 🟡 parcial · 🔧 depende de acção externa · ➖ não se aplica

### A. Segurança
| Item | Estado | Nota |
|---|---|---|
| A1 HTTPS + redirecção + domínio canónico | ✅ | a Vercel redirecciona HTTP→HTTPS (308) |
| A1 HSTS ≥ 1 ano + subdomínios | ✅ | 2 anos |
| A1 CSP | 🟡 | Report-Only, com `'unsafe-inline'` (ver acima); aplicada a sério em 14 rotas sem violações |
| A1 clickjacking / nosniff / Referrer-Policy | ✅ | |
| A1 Permissions-Policy | ✅ | |
| A1 esconder tecnologia | 🟡 | a Vercel envia sempre `Server: Vercel` |
| A1 CORS | ✅ | o site não tem API própria; o Supabase só aceita a chave pública e aplica RLS |
| A1 SRI / auto-alojar | ✅ | auto-alojado |
| A2 hash de palavras-passe | ✅ | Supabase Auth (bcrypt) |
| A2 política mínima de palavra-passe | 🔧 | painel do Supabase |
| A2 tokens curtos + refresh rotativo | ✅ | Supabase (JWT 1 h + refresh rotativo) |
| A2 invalidar sessão no logout | ✅ | `signOut()` revoga o refresh token |
| A2 tokens em cookie HttpOnly | 🟡 | localStorage (limitação de site estático) |
| A2 validação de token | ✅ | Supabase |
| A2 bloqueio de tentativas | 🔧 | limites de Auth no painel do Supabase |
| A2 erro genérico no login | ✅ | o Supabase responde «Invalid login credentials» nos dois casos |
| A2 2FA para administradores | 🔧 | Supabase MFA (TOTP); ainda não ligado no painel |
| A2 recuperação de palavra-passe | ➖ | não há recuperação no site; o admin é criado no painel |
| A3 permissões no servidor / IDOR / RBAC / RLS | ✅ | RLS em todas as tabelas; escrita só com `e_admin()`; tokens de convidado validados em cada envio |
| A3 conta da aplicação sem superpoderes | ✅ | o site usa o papel `anon`/`authenticated` |
| A3 admin fora da indexação | ✅ | `#admin` não é indexável + `noindex` dinâmico |
| A3 **registos públicos desligados** | 🔧 | **hoje estão ligados**: qualquer pessoa cria conta. Não dá acesso a nada (tudo exige `e_admin()`), mas deve ser desligado |
| A4 validação de entrada | ✅ | CHECKs de tamanho e listas fechadas nas tabelas e nas funções |
| A4 SQL injection | ✅ | supabase-js / PostgREST parametrizados; funções sem SQL dinâmico |
| A4 XSS | ✅ | `esc()` em todo o conteúdo dinâmico |
| A4 CSRF | ✅ | não há cookies de sessão: o token vai no cabeçalho `Authorization` |
| A4 open redirect / SSRF | ✅ | vídeos só do YouTube (id extraído); sem redirecções por parâmetro |
| A4 travessia de caminhos | ✅ | nomes aleatórios; `registar_envio` valida o caminho do token |
| A5 tipos e tamanho | ✅ | bucket: image/* e video/*, 100 MB; máx. 20 por envio |
| A5 tipo real pelos bytes | 🟡 | o browser re-codifica as fotos (canvas); os vídeos não são verificados |
| A5 nome aleatório, fora da raiz, sem execução | ✅ | bucket privado + URLs assinadas de 1 h |
| A5 EXIF | 🟡 | removido nas fotos redimensionadas; uma foto pequena em JPEG passa intacta |
| A5 antivírus | ➖ | só imagens e vídeos |
| A6 tratamento de erros | 🟡 | ações com `try/naNuvem`; o painel ainda mostra algumas mensagens do Supabase ao admin |
| A6 sem source maps / ficheiros expostos | ✅ | `/.env.local`, `/.git/config`, `/supabase/`, `/README.md` → 404 (verificado em produção) |
| A6 auditoria de acções do admin | ❌ | por fazer (tabela + gatilhos) |
| A7 segredos fora do código e do histórico | ✅ | só a chave pública; `.env*` ignorados |
| A7 minimização de dados | ✅ | IP só em hash e por 1 dia; visitas sem dados pessoais |
| A7 plano de rotação de chaves | 🔧 | secção 3 |
| A8 rate limiting | ✅ | depois de correr o passo 6 do SQL |
| A8 anti-robô | 🟡 | campo-armadilha; sem CAPTCHA |
| A8 DDoS / firewall | 🔧 | Vercel Firewall (activar regras no painel) |
| A9 auditoria de dependências / lockfile | ✅ | 0 vulnerabilidades |
| A9 Dependabot / CI | ❌ | por fazer (requer GitHub Actions) |
| A9 SECURITY.md | ✅ | |
| A10 cópias de segurança diárias + restauro | 🔧 | o plano gratuito do Supabase **não** tem cópias automáticas |
| A10 monitorização / alertas | 🔧 | secção 3 |
| A11 cookies / análise com consentimento | ✅ | o site não usa cookies nem ferramentas de análise |
| A11 Política de Privacidade | 🟡 | existe dentro do site (ligação «Privacidade»); faltam os Termos de Uso e a revisão jurídica |

### B. SEO e desempenho
| Item | Estado | Nota |
|---|---|---|
| B1 sitemap.xml / robots.txt / llms.txt / canónica | ✅ | |
| B1 hreflang | ➖ | só uma língua |
| B1 pré-visualizações não indexáveis | ✅ | a Vercel envia `X-Robots-Tag: noindex` nas pré-visualizações |
| B1 404 personalizada | ✅ | redirecções 301: não há URLs antigos |
| B2 título 50–60 / descrição 140–160 | ✅ | 53 e 160 caracteres |
| B2 Open Graph / X / favicon / manifesto / cor de tema | ✅ | |
| B3 Organization / WebSite / Service | 🟡 | sem morada, telefone nem redes (o `CONTACTO` em `config.js` está vazio); sem SearchAction (o site não tem pesquisa) |
| B3 validação | 🔧 | Rich Results Test depois de publicar |
| B4 H1 / hierarquia / semântica / alt | 🟡 | ver nota sobre os dois H1 |
| B4 blogue | ❌ | decisão editorial |
| B5 LCP < 2,5 s / CLS < 0,1 | 🟡 | CLS < 0,05; LCP de computador 1,6 s, de telemóvel 3,6–3,9 s |
| B5 WebP + dimensões + lazy | ✅ | |
| B5 cache / CDN / compressão | ✅ | Vercel |
| B6 360/390/414 px, toque ≥ 44 px | 🟡 | testado a 390 px; corpo de texto < 16 px em várias zonas |
| B6 contraste AA / foco / lang | 🟡 | página inicial corrigida; o painel não foi auditado |
| B7 Search Console / Bing / Perfil de Empresa | 🔧 | secção 3 |

---

## 3. Acções manuais (por ordem)

1. **Correr o passo 6 no Supabase.** No SQL Editor, cola `supabase/CORRER_AGORA.sql` e carrega em **Run**. No fim deve mostrar `limites = 1 · gatilhos = 3 · armadilha = 1`.
2. **Desligar os registos públicos.** Em Supabase → Authentication → Sign In / Providers, desliga **Allow new users to sign up**. Os administradores passam a ser criados em Authentication → Users → Add user.
3. **Palavra-passe.** Em Authentication → Policies (Password), define o mínimo de **12 caracteres**, exige letras + números e liga **Leaked password protection**, se o plano o permitir.
4. **Limites de login.** Em Authentication → Rate Limits, confirma os valores por omissão (tentativas de login e emails por hora).
5. **2FA.** Em Authentication → Multi-Factor, liga o **TOTP**. Diz-me quando estiver ligado e eu acrescento o passo de verificação ao login do painel.
6. **Publicar.** Faz `git push` (ou pede-me que o faça). A Vercel publica a partir do GitHub (`isidroguiamba87-max/memories`).
7. **Verificar depois de publicar:**
   - https://securityheaders.com/?q=memories-sigma-flax.vercel.app (objectivo: A);
   - https://pagespeed.web.dev/ no domínio (objectivo: 90 ou mais);
   - https://search.google.com/test/rich-results (dados estruturados);
   - abrir o site e o painel com a consola aberta, durante uma semana, e procurar mensagens «Content-Security-Policy».
8. **Ligar a CSP a sério.** Se não aparecerem avisos, em `vercel.json` troca `Content-Security-Policy-Report-Only` por `Content-Security-Policy` e acrescenta `; upgrade-insecure-requests` no fim (em Report-Only o navegador ignora esta diretiva e mostra um aviso na consola).
9. **Google Search Console.** Adiciona a propriedade de prefixo de URL `https://memories-sigma-flax.vercel.app/`, verifica-a pela meta-tag HTML (eu coloco-a no `index.html` se me deres o código), submete `sitemap.xml` e pede a indexação da página inicial. Depois importa a propriedade no **Bing Webmaster Tools**.
10. **Cópias de segurança.** No plano gratuito do Supabase não há cópias automáticas. Ou passas para o plano Pro (cópias diárias com 7 dias), ou fazes um `pg_dump` semanal com a connection string da base de dados (Settings → Database), guardado fora do Supabase. Uma vez por trimestre, restaura essa cópia num projecto de teste e confirma que abre.
11. **Monitorização.** Cria um monitor gratuito (UptimeRobot ou Better Stack) para o domínio, com alerta por email. Quando houver domínio próprio, liga também o alerta de expiração do domínio.
12. **Contactos e conteúdo.** Preenche `CONTACTO` em `assets/js/config.js` (WhatsApp, redes). Eu acrescento-os aos dados estruturados. Envia também a foto de conferência para substituir a provisória.
13. **Termos de Uso e Política de Privacidade** revistos por alguém com formação jurídica, à luz da lei moçambicana de protecção de dados.
14. **Domínio próprio** (quando houver). Corre `grep -rl memories-sigma-flax .` e troca o domínio em todos esses ficheiros (index.html, robots, sitemap, llms, config.js); depois repete os passos 7 e 9.

## 4. Riscos residuais e próximos passos
| Risco | Gravidade | Recomendação |
|---|---|---|
| Registos públicos ligados | Média | passo 2 (5 minutos) |
| Sem cópias de segurança | **Alta** | passo 10 antes de receber eventos reais |
| CSP com `'unsafe-inline'` + sessão em localStorage: um XSS daria acesso à sessão do admin | Média | o `esc()` cobre o conteúdo actual; a médio prazo, passar os `onclick` para `addEventListener` e ligar o 2FA |
| Ficheiros carregados directamente no Storage sem `registar_envio` não contam para o limite | Baixa | o token é necessário; se houver abuso, revogar o token no painel |
| Sem auditoria das acções do admin | Baixa (1 admin) | criar uma tabela `auditoria` + gatilhos quando houver mais administradores |
| Sem Dependabot/CI | Baixa | GitHub → Settings → Code security → Dependabot alerts (um clique) |
| LCP no telemóvel 3,6–3,9 s em produção (objectivo < 2,5 s) | Média | gerar a página inicial em HTML estático (pré-renderizar), para não depender do JavaScript |
