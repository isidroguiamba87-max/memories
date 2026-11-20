# Segurança

## Reportar uma vulnerabilidade

Se encontrar uma falha de segurança na Memória, **não abra uma issue pública**.
Use o separador **Security → Report a vulnerability** deste repositório no GitHub
(relato privado). Indique os passos para reproduzir e o impacto.

Comprometemo-nos a responder em 5 dias úteis e a corrigir as falhas confirmadas
o mais depressa possível, dando crédito a quem as reportou, se o desejar.

## Âmbito
- O site (`index.html`, `assets/`) e as migrações da base de dados (`supabase/`).
- Fora do âmbito: ataques de negação de serviço, engenharia social e
  serviços de terceiros (Supabase, Vercel).

## Chaves
O site usa apenas a chave **pública** (anon) do Supabase; a protecção dos dados
está nas regras RLS da base de dados. A chave `service_role` nunca deve aparecer
no código, no histórico do Git nem no navegador.
