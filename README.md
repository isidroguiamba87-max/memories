# Memória — plataforma de memórias de evento

Protótipo funcional de uma plataforma onde cada evento tem a sua própria página com
programa, galeria organizada por momento, envio de fotografias por QR Code e painel
de administração. O primeiro evento é um casamento (evento piloto).

Endereço público: **https://memories-sigma-flax.vercel.app/** — todos os links partilhados e QR Codes
apontam para aqui (constante `SITE_URL` em `assets/js/config.js`). Pensado como
plataforma multi-evento e com linguagem de eventos sociais.

## Como abrir

Não precisa de instalação. Qualquer um dos dois:

```bash
# opção 1 — abrir directamente
# duplo clique em index.html

# opção 2 — servidor local (recomendado)
npm install   # só na primeira vez (instala o servidor estático "serve")
npm start     # serve a pasta em http://localhost:8000
# ou
python -m http.server 8000
```

Depois abre `http://localhost:8000`.

**Precisa de internet** para carregar as fotografias de demonstração (CDN da Adobe),
os tipos de letra (Google Fonts) e a biblioteca de QR Code (cdnjs).

## Estrutura

```
memoria-eventos/
├── index.html              marcação das 5 vistas
├── assets/
│   ├── css/styles.css      tema, componentes, responsividade
│   └── js/
│       ├── dados.js        fases, missões, pool de fotos, carregamento inicial
│       └── app.js          estado, navegação, renderização, acções
├── ESPECIFICACAO.md        especificação funcional e modelo de dados
├── CLAUDE.md               contexto para o Claude Code
└── README.md
```

## Vistas

São três áreas separadas, cada uma com o seu cabeçalho e o seu link:

| Área | Hash | Para quem |
|---|---|---|
| Catálogo e página do evento | `#eventos`, `#evento/<evento>/<parte>` | público (só ver) |
| Página dos convidados | `#c/<token>/<parte>` | convidados, via link/QR |
| Página do fotógrafo | `#f/<token>/<parte>` | cada fotógrafo, via o seu link/QR |
| Organização | `#admin`, `#admin/novo`, `#admin/<evento>/<parte>` | quem organiza |

Cada evento tem uma ou mais **partes** (ex.: lobolo + casamento), cada uma com
programa, galeria, missões, mural e tema próprios. Os tipos de evento estão
organizados por categoria e cada tipo tem um ou mais modelos de programa
(`assets/js/dados.js` → `CATEGORIAS`, `TIPOS`, `TEMAS`).

No painel, cada evento pode ter **quantos links/QR de convidados** forem precisos
(um geral para todos, ou um por grupo) e **quantas páginas de fotógrafo** forem
precisas, cada uma limitada às partes escolhidas, com contagem de envios,
desactivação e remoção.

O fluxo completo (convidado, fotógrafo, organização) está em [`FLUXO.md`](FLUXO.md).

## Servidor (Supabase) e modo demonstração

Com `assets/js/config.js` preenchido, o site lê e grava tudo no Supabase: eventos, partes,
programa, links/QR, fotos e vídeos (Storage), moderação e mural. O painel pede login com um
utilizador que esteja em `administradores`. Para abrir a demonstração local (dados fictícios no
navegador), junta `?demo` ao endereço: `http://localhost:8000/?demo#eventos`.

Instalação da base de dados: ver [`supabase/LEIA-ME.md`](supabase/LEIA-ME.md).

## O que é real e o que é simulado

**Real no protótipo:** criação de eventos com várias partes a partir de modelos, edição
do programa e das missões, temas por tipo, navegação, filtros por momento, geração de
QR Code, leitura de ficheiros do dispositivo, fila de moderação, mural, contagem
decrescente, downloads (foto, ZIP por momento/álbum, QR em PNG). Os dados ficam
guardados no `localStorage` do navegador.

**Simulado:** servidor e base de dados (nada sai do navegador), autenticação, tokens
de QR, envio de notificações. Vídeos aparecem como imagem de substituição.

**Fotografias:** rendições do nível gratuito do Adobe Stock, apenas para
demonstração. Têm de ser licenciadas ou substituídas antes de qualquer uso real.

## Próximo passo

Ver `ESPECIFICACAO.md` → secção "Caminho para produção".

## Publicar na internet (Vercel)

O site é estático (`index.html` + `assets/`), por isso não há passo de build. O `vercel.json`
e o `.vercelignore` já estão prontos.

1. Criar conta em [vercel.com](https://vercel.com) (pode ser com o GitHub).
2. Na pasta do projecto: `npx vercel` (faz login e liga o projecto) e depois `npx vercel --prod`.
   Alternativa: pôr o projecto no GitHub e, na Vercel, *Add New → Project → Import*.
3. Em *Settings → Domains*, juntar o domínio escolhido e criar
   no fornecedor do domínio o registo DNS que a Vercel indicar.
4. No Supabase, *Authentication → URL Configuration*: pôr o endereço do site em **Site URL**.
5. Se o domínio mudar, actualizar `SITE_URL` em `assets/js/config.js` (links e QR Codes usam-no).

Os QR Codes gerados no painel usam automaticamente o endereço onde o site está aberto, por isso
passam a apontar para o domínio real assim que o painel for usado a partir dele.
