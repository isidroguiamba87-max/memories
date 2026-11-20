# Base de dados — Supabase

## Como instalar (5 minutos)

1. Em [supabase.com](https://supabase.com), cria um projecto novo (região mais próxima:
   África do Sul ou Europa).
2. Abre **SQL Editor → New query**, cola todo o conteúdo de
   [`tudo_para_sql_editor.sql`](tudo_para_sql_editor.sql) e carrega em **Run**.
   Cria as tabelas, as regras de segurança, as permissões da API, o bucket de ficheiros e o
   catálogo de tipos de evento. No fim mostra uma linha de verificação: 4 · 8 · 12 · 17 · 94 · 36 · 1.

   > Se já tinhas corrido a versão anterior, corre só [`CORRER_AGORA.sql`](CORRER_AGORA.sql)
   > (passo 6 — limites anti-abuso e campo-armadilha nos pedidos).
3. Cria o teu utilizador de organização: **Authentication → Users → Add user**
   (email + palavra-passe, com "Auto Confirm User").
4. Torna-o administrador. No SQL Editor:
   ```sql
   insert into public.administradores (user_id, nome)
   select id, 'Organização' from auth.users where email = 'O-TEU-EMAIL';
   ```
5. Em **Project Settings → API**, copia o **Project URL** e a chave **anon public**.
   Guarda-as num ficheiro `.env.local` na raiz do projecto (já está no `.gitignore`):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   A chave **service_role** nunca vai para o site nem para o Git.

Alternativa com a CLI (já instalada): `supabase link --project-ref <ref>` e depois
`supabase db push` aplica as três migrações de [`migrations/`](migrations/).

## Organização das tabelas

```
CATÁLOGO (igual para todos os eventos)
  categorias ─┬─ tipos_evento ── modelos ─┬─ modelo_momentos
  temas ──────┘                           └─ modelo_missoes

EVENTOS
  eventos ─┬─ partes (lobolo, casamento…) ─┬─ momentos   (programa)
           │                               ├─ missoes    (missões de foto)
           │                               ├─ votos      (mural, com moderação)
           │                               └─ ficheiros  (fotos e vídeos)
           └─ acessos (links/QR) ── acesso_partes (a que partes dá entrada)

ORGANIZAÇÃO
  administradores (utilizadores do Supabase Auth com acesso ao painel)
```

| Tabela | Para quê |
|---|---|
| `categorias`, `temas`, `tipos_evento` | Os tipos de evento que cobrimos, por categoria, e as cores de cada um |
| `modelos`, `modelo_momentos`, `modelo_missoes` | Modelos de programa (ex.: lobolo completo, casamento na praia) |
| `eventos` | O evento principal (ex.: André & Lúcia), com `slug` para o link |
| `partes` | Cada parte do evento, criada a partir de um modelo, com data e tema |
| `momentos` | O programa de cada parte — é o que organiza a galeria |
| `missoes` | Desafios de foto ligados a um momento |
| `acessos` | Cada link/QR: `perfil` convidado ou fotógrafo, `token`, activo, nº de usos |
| `acesso_partes` | Limita um link a certas partes. Sem linhas = todas as partes |
| `ficheiros` | Cada foto/vídeo: parte, momento, por que link chegou, estado de moderação |
| `votos` | Mensagens do mural (entram pendentes) |
| `administradores` | Quem pode entrar no painel |

## Segurança

- **Público (sem login):** lê eventos públicos, programa, e só os ficheiros e mensagens
  **publicados**. Pode escrever no mural (fica pendente).
- **Convidados e fotógrafos:** não fazem login. Entram pelo token do link e só usam duas funções:
  - `acesso_info(token)` → evento, partes permitidas, momentos e missões;
  - `registar_envio(token, parte, momento, missão, autor, ficheiros)` → regista os ficheiros.
    Convidado fica **pendente**, fotógrafo fica **publicado**. Recusa partes não permitidas,
    links desactivados ou expirados e caminhos de outro token. Máximo 20 ficheiros por envio.
- **Storage:** bucket privado `ficheiros`. Só aceita uploads em `<token>/<parte_id>/…` com token
  válido. O público só consegue URLs assinados de ficheiros publicados.
- **Organização:** tudo, desde que o utilizador esteja em `administradores`.
  `criar_parte_de_modelo(evento, modelo, título, data)` cria a parte com o programa e missões do modelo.

## Fluxo de um envio (convidado ou fotógrafo)

```js
const info = await supabase.rpc('acesso_info', { p_token: token });
const path = `${token}/${parteId}/${crypto.randomUUID()}.jpg`;
await supabase.storage.from('ficheiros').upload(path, ficheiro);
await supabase.rpc('registar_envio', {
  p_token: token, p_parte_id: parteId, p_momento_id: momentoId, p_missao_id: null,
  p_autor: 'Zica', p_ficheiros: [{ path, tipo: 'imagem', mime: ficheiro.type, tamanho: ficheiro.size }]
});
```

## Manter o catálogo

O catálogo é gerado a partir de `assets/js/dados.js`. Depois de mudar tipos ou modelos lá:

```bash
node supabase/gerar_catalogo.js > supabase/migrations/20261119120100_catalogo.sql
```

O ficheiro pode ser corrido de novo sem duplicar nada.
