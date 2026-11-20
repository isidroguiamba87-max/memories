# Especificação funcional — Memória

## 1. Conceito

Cada evento recebe um link próprio. Nesse link, quem foi ao evento encontra o
programa, a galeria organizada pelos momentos desse programa, e uma forma simples
de entregar as suas próprias fotografias. Quem organiza recebe um painel para
gerar QR Codes, aprovar o que chega e arrumar tudo no momento certo.

A galeria não é uma pilha de ficheiros: é o programa do evento transformado em
estrutura de navegação. Esse é o eixo do produto.

## 2. Perfis de acesso

| Perfil | Como entra | Pode |
|---|---|---|
| Visitante | link público / QR do evento | ver programa, galeria, mural |
| Participante | QR dos participantes | enviar fotos e vídeos, escrever no mural |
| Fotógrafo | QR dos fotógrafos | publicar directamente, descarregar álbum |
| Organização | credenciais | gerar QR, moderar, mover entre momentos, descarregar |

O QR do participante aponta para um envio que fica **pendente**. O QR do fotógrafo
é de confiança: publica directamente. Esta diferença é o que mantém a galeria
apresentável sem trabalho manual constante.

## 3. Módulos

### 3.1 Catálogo de eventos
Lista de eventos com capa, data, estado (`a decorrer`, `em preparação`,
`encerrado`) e contagem de ficheiros. Porta de entrada da plataforma.

### 3.2 Página do evento
- Cabeçalho com capa, nomes, data e contagem decrescente.
- **Barra Ao Vivo:** mostra o momento do programa a decorrer. No protótipo é
  seleccionável à mão (para demonstrar); em produção deriva da hora do programa.
- **Programa:** momentos com hora, local e número de fotos; cada um é um filtro.
- **Galeria:** grelha filtrada por momento, com visualizador e download.
- **Fotos de participantes:** só o que veio dos convidados, agrupado por pessoa.
- **Missões de foto:** desafios curtos que dirigem os envios para os momentos que
  normalmente ficam vazios. Resolve o problema real de que convidados não fazem
  upload sem um motivo.
- **Mural de votos:** mensagem curta com nome.

### 3.3 Envio de participante
Nome, momento (pré-seleccionado a partir do momento a decorrer), missão opcional,
selecção de ficheiros com pré-visualização. Resulta em registos `pendente`.

### 3.4 Carregamento de fotógrafo
Identificação do estúdio, momento, carregamento em lote. Resulta em registos
`publicada`. Dá acesso ao download do álbum.

### 3.5 Painel de administração
- **QR Codes:** três códigos por evento — participantes, fotógrafos, página do
  evento. Com link copiável e exportação em imagem.
- **Moderação:** fila do que está pendente, com confirmação ou correcção do
  momento antes de publicar, e rejeição.
- **Álbum e momentos:** distribuição por momento, download por momento e total.

## 4. Modelo de dados proposto (Postgres / Supabase)

> **Actualizado:** o esquema final, com eventos em várias partes, catálogo de tipos e
> modelos, vários acessos por evento e políticas RLS testadas, está em
> [`supabase/`](supabase/LEIA-ME.md). O SQL abaixo é a primeira proposta, mantida como histórico.

```sql
create table eventos (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  tipo          text not null,              -- casamento, batizado, corporativo...
  titulo        text not null,
  subtitulo     text,
  local         text,
  data_inicio   timestamptz not null,
  estado        text not null default 'preparacao',
  capa_id       uuid,
  criado_em     timestamptz default now()
);

create table momentos (                      -- os pontos do programa
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos(id) on delete cascade,
  ordem       int  not null,
  nome        text not null,
  hora        time not null,
  local       text,
  unique (evento_id, ordem)
);

create table ficheiros (
  id           uuid primary key default gen_random_uuid(),
  evento_id    uuid not null references eventos(id) on delete cascade,
  momento_id   uuid references momentos(id) on delete set null,
  missao_id    uuid references missoes(id) on delete set null,
  storage_path text not null,
  tipo         text not null,                -- imagem | video
  autor_nome   text,
  origem       text not null,                -- participante | fotografo | organizacao
  estado       text not null default 'pendente',
  largura      int,
  altura       int,
  criado_em    timestamptz default now()
);

create table missoes (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references eventos(id) on delete cascade,
  momento_id uuid references momentos(id) on delete set null,
  icone      text,
  titulo     text not null
);

create table votos (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references eventos(id) on delete cascade,
  autor_nome text,
  mensagem   text not null,
  estado     text not null default 'pendente',
  criado_em  timestamptz default now()
);

create table acessos (                        -- os tokens por trás de cada QR
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references eventos(id) on delete cascade,
  perfil     text not null,                  -- participante | fotografo | visitante
  token      text unique not null,
  expira_em  timestamptz,
  usos       int default 0,
  criado_em  timestamptz default now()
);
```

**Políticas RLS a definir:** leitura pública apenas de `ficheiros` com
`estado = 'publicada'`; escrita por participante só com token válido em `acessos`;
`storage` com bucket privado e URLs assinados para download.

## 5. Caminho para produção

Ordem sugerida, cada passo entregável por si:

1. **Esquema e Storage** — migrações das tabelas acima, bucket privado, políticas RLS.
2. **Leitura pública** — página do evento e galeria a ler de Supabase em vez de
   `dados.js`. Momento a decorrer calculado da hora, não seleccionado à mão.
3. **Envio real** — upload para Storage com token de `acessos`, miniaturas geradas
   do lado do servidor, limite de tamanho e de ritmo por token.
4. **Moderação** — painel autenticado, mudança de estado, mover entre momentos.
5. **Downloads** — URLs assinados; ZIP por momento gerado por função de servidor.
6. **Multi-evento** — catálogo a ler da tabela `eventos`; criação de evento com
   programa a partir de modelos por tipo (casamento, batizado, corporativo).
7. **Migração de interface** — Vite + React + TS + Tailwind, reaproveitando o CSS
   actual como base do tema.

## 6. Decisões em aberto

- Domínio por evento (`nelia-tomas.memoria.co.mz`) ou caminho
  (`memories-sigma-flax.vercel.app/#evento/nelia-tomas`). O protótipo usa caminho com `#`.
- Prazo de retenção dos ficheiros e quem paga o armazenamento depois do evento.
- Se o mural de votos passa também por moderação. Recomendado: sim, pelo mesmo
  motivo que as fotos.
- Marca: produto próprio do KU_KULADEVZ ou serviço sob a marca MediaCraft.
