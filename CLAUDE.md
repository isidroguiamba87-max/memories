# Contexto do projecto — Memória

## O que é

Plataforma de memórias de evento. Cada evento tem página pública com programa,
galeria filtrada por momento do programa, envio de fotos por QR Code e painel de
administração. Estado actual: protótipo estático navegável, sem backend.

## Língua

Todo o código, comentários, documentação e interface em **português (variante
europeia/moçambicana)**. Nomes de variáveis e funções em português —
`fases`, `proxSrc`, `renderGaleria`, `aprovar`. Manter essa convenção.

## Stack actual vs. pretendida

- **Agora:** HTML + CSS + JavaScript sem dependências de build. Scripts clássicos
  (sem módulos ES) para funcionar em `file://`.
- **Pretendida:** Vite + React + TypeScript + Tailwind, Supabase (Postgres +
  Storage + Auth), alojamento na Vercel.

## Regras ao mexer

1. **Não introduzir build sem pedido.** O protótipo tem de continuar a abrir com
   duplo clique enquanto não houver migração decidida.
2. **`dados.js` é só dados de demonstração.** Categorias, tipos de evento com modelos
   de programa, temas, pool de fotos, `instanciar()` e `semear()`. Lógica vai para `app.js`.
3. **Nomes e testemunhos são fictícios de propósito** (Nélia & Tomás, Studio Lume,
   convidados). Não transformar em dados reais de clientes.
4. **As fotos são do nível gratuito do Adobe Stock.** São de demonstração.
   Substituir por fotos reais ou licenciadas antes de uso comercial.
5. **Nada de inventar funcionalidades na interface** que o protótipo não executa.
   Se um botão é simulado, tem de dizer que é simulado. Os downloads (foto, ZIP por
   momento/álbum, QR em PNG) são reais.

## Servidor

- `config.js` (URL + chave anon), `nuvem.js` (carrega do Supabase para `EVENTOS`/`fotos`, envia
  ficheiros, `naNuvem(op,msg)` grava, recarrega e redesenha). No `app.js`, cada acção começa com
  `if(NUVEM) return emNuvem.<acção>(...)`; a versão local fica para o modo `?demo`.
- Em modo servidor, ids de evento/parte continuam a ser os slugs; `uid` é o uuid da base de dados.
- SQL em `supabase/migrations/`; testar alterações de SQL antes de as entregar.

## Convenções de código

- Indentação de 2 espaços.
- Funções de renderização chamam-se `renderX` e redesenham a partir do estado.
- `renderTudo()` redesenha a vista actual; depois de mutar `EVENTOS`/`fotos`, chamar `guardar()`.
- Três áreas separadas, cada uma com o seu topo (`renderTopo`): público (`#eventos`, `#evento/<ev>/<parte>`),
  convidados (`#c/<token>`), fotógrafo (`#f/<token>`) e organização (`#admin…`). Nunca ligar
  as áreas de convidado/fotógrafo ao painel. Navegação por `location.hash`,
  resolvida em `ir(rota)`. `ev()` e `sub()` devolvem o evento e a parte seleccionados.
- Texto vindo do utilizador passa sempre por `esc()` antes de ir para `innerHTML`.
- As imagens passam sempre por `imgTag(url, alt)`, que tenta a rendição de 500px
  e cai para 240px em caso de erro. Não escrever `<img>` directo.

## Modelo de dados em memória (actual)

```js
evento = { id, titulo, cat, local, estado: 'auto'|'preparacao'|'decorrer'|'encerrado', capa, subs: [parte], acessos: [acesso] }
acesso = { id, perfil: 'convidado'|'fotografo', nome, token, partes: [idParte] /* vazio = todas */, ativo, usos }
parte  = { id, tipo, modelo, titulo, data, tema, momento, momentos:[{id,h,n,l}], missoes:[{id,ic,t,f}], votos:[{q,a}] }
foto   = { id, ev, sub, fase, autor, origem: 'fotografo'|'participante',
           estado: 'publicada'|'pendente', vid, src, hora, missao, acesso }
```

Um evento (ex.: André & Lúcia) tem várias partes (lobolo, casamento), cada uma criada
a partir de um tipo (`TIPOS`) e de um dos seus modelos de programa. Tudo é guardado em
`localStorage` (`memoria.v2`); "Repor demonstração" no painel volta ao `semear()`.

## Onde continuar

`ESPECIFICACAO.md` tem a especificação funcional, o esquema Postgres proposto e a
ordem de trabalhos sugerida para produção.
