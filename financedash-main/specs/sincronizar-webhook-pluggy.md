# Spec: Processar eventos do webhook da Pluggy

## Problema
`api/webhook/pluggy.js` já recebe os eventos da Pluggy com segurança
(segredo validado, 200 rápido, 404 se segredo errado), mas hoje só loga o
evento — não atualiza nada no app. Antes de escrever código, olhei o resto
do projeto pra não assumir uma arquitetura que não existe: **o FinanceDash
não guarda transações em cache** — `api/pluggy/accounts/[accountId]/
transactions.js` busca direto na API da Pluggy a cada request do
dashboard. O KV (`lib/kv.js`) só guarda `{ email, passwordHash, itemIds }`
por usuário — nenhuma associação reversa de `itemId → email`.

Isso muda o que "sincronizar" significa aqui: não é cachear transações
(elas já vêm ao vivo), é manter o **status de cada item** (conectado, com
erro, aguardando ação do usuário, removido) visível pro usuário sem ele
precisar tentar usar o item pra descobrir que quebrou.

## Objetivo
1. O webhook consegue descobrir **de quem** é um `itemId` (hoje é
   impossível — não existe esse índice). Toda vez que um item é vinculado
   (`POST /api/pluggy/items`), o KV passa a guardar também
   `item:<itemId> → { email }`.
2. Eventos de **status do item** (`item/created`, `item/updated`,
   `item/error`, `item/waiting_user_input`, `item/waiting_user_action`,
   `item/login_succeeded`) atualizam um campo `status` dentro do registro
   do item no KV (`item:<itemId>`), incluindo a mensagem de erro quando
   houver (`error.code`/`error.message` do payload).
3. `item/deleted` remove o item do usuário (reaproveita
   `removeItemFromUser`, já existente) e apaga `item:<itemId>` do KV — é o
   mesmo cleanup que já acontece quando o usuário remove o item pela UI
   (`api/pluggy/items/[itemId].js`), só que disparado pela Pluggy em vez
   do usuário.
4. Eventos de `transactions/created`, `transactions/updated`,
   `transactions/deleted` **não alteram dados** (não há cache pra
   invalidar) — só atualizam `lastSyncedAt` no `item:<itemId>`, pra UI
   poder mostrar "atualizado há X minutos".
5. Um novo endpoint `GET /api/pluggy/items/[itemId]` (hoje só existe
   `DELETE`) passa a expor `{ status, error, lastSyncedAt }` pro frontend
   ler — sem isso, guardar o status no KV não tem efeito visível nenhum.
6. Eventos que não conhecemos (payment_intent/*, scheduled_payment/*, etc.
   — o FinanceDash não faz pagamentos) são ignorados silenciosamente (só
   logados), não geram erro.

## Fora de escopo
- Cache de transações (mudar `transactions.js` pra ler do KV em vez da
  Pluggy) — é uma mudança de arquitetura maior, fica pra uma spec própria
  se algum dia a latência da API da Pluggy for um problema real.
- Notificar o usuário em tempo real (push/email) quando um item quebra —
  por ora ele só vê o status quando abre o dashboard.
- Processar qualquer evento de pagamento (`payment_intent/*`,
  `scheduled_payment/*`, `automatic_pix_payment/*`,
  `smart_transfer_*`, `payment_request/*`) — o FinanceDash não tem
  funcionalidade de pagamento hoje.
- Retry automático se o processamento do evento falhar no meio (ex: KV
  fora do ar) — o log de erro é suficiente por enquanto; a Pluggy não
  reenvia porque já respondemos 200 antes.

## Critérios de aceite
- [ ] `POST /api/pluggy/items` grava `item:<itemId> → { email }` no KV
      além do que já faz hoje (`addItemToUser`).
- [ ] `api/webhook/pluggy.js`, ao receber `item/updated`, `item/error`,
      `item/waiting_user_input`, `item/waiting_user_action`,
      `item/login_succeeded`, `item/created`: busca o dono do item no KV
      pelo índice novo e atualiza `status` (e `error`, quando aplicável)
      em `item:<itemId>`.
- [ ] Ao receber `item/deleted`: remove o item do usuário (via
      `removeItemFromUser`) e apaga `item:<itemId>` do KV.
- [ ] Ao receber `transactions/created`, `transactions/updated`,
      `transactions/deleted`: atualiza só `lastSyncedAt` em
      `item:<itemId>`.
- [ ] Eventos de pagamento e quaisquer outros não mapeados: só logados,
      sem erro, sem alterar KV.
- [ ] `GET /api/pluggy/items/[itemId]` (novo, autenticado com
      `requireAuth` igual aos outros) retorna `{ status, error,
      lastSyncedAt }` do item — só se o item pertencer ao usuário
      autenticado (não pode vazar status de item de outro usuário).
- [ ] Se o `itemId` do evento não tiver dono conhecido no KV (ex: item
      criado fora do fluxo do app, ou índice ainda não existia antes desta
      mudança), o webhook loga e ignora — não derruba a função nem tenta
      adivinhar o dono.
- [ ] Nenhum processamento do evento pode impedir a resposta 200 já
      enviada — todo o bloco roda dentro do `try/catch` que já existe.

## Perguntas em aberto
1. **Itens vinculados antes desta mudança não têm `item:<itemId>` no KV**
   (o índice reverso é novo). Está tudo bem esses itens ficarem "órfãos"
   pro webhook até o usuário desvincular/revincular, ou você quer que eu
   escreva um script único de backfill (percorre todos os `user:*`,
   recria o índice reverso)?
2. **Nome do campo de status**: tudo bem usar os nomes de evento da
   Pluggy direto como status (`"updated"`, `"error"`, `"waiting_user_
   input"`, etc. — tirando o prefixo `item/`), ou você prefere que eu
   traduza pra um enum mais amigável pro frontend (ex: `"ok"`, `"erro"`,
   `"aguardando_voce"`)?
3. Confirma que **não temos front-end nenhum hoje** mostrando status de
   item (só a lista de contas) — ou seja, o critério de aceite do `GET
   /api/pluggy/items/[itemId]` fica pronto no backend, mas eu não vou
   mexer no `public/index.html` pra exibir isso, a menos que você peça
   como uma spec separada?

---

Essa spec está de acordo? Posso seguir para o `/plan`?
