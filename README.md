# FinanceDash

App de organização financeira com integração [Pluggy](https://pluggy.ai/),
deploy como funções serverless na Vercel.

## Rodar localmente

```bash
npm install
cp .env.example .env
```

Preencha o `.env` com seus valores reais (client ID/secret da Pluggy, um
`JWT_SECRET` forte, e o `PLUGGY_WEBHOOK_SECRET` — veja como gerar cada um
nos comentários do próprio `.env.example`). **Nunca commite o `.env`** —
ele já está no `.gitignore`.

Como o projeto usa funções serverless (`api/*.js` no formato da Vercel),
rodar local com fidelidade exige a Vercel CLI:

```bash
npm i -g vercel
vercel dev
```

## Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `JWT_SECRET` | Assina os tokens de sessão (login com email/senha) |
| `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET` | Credenciais da Pluggy — só usadas no backend, nunca expostas ao navegador |
| `PLUGGY_BASE_URL` | Base da API da Pluggy (normalmente não precisa mudar) |
| `PLUGGY_WEBHOOK_SECRET` | Protege a rota `/api/webhook/pluggy` — sem o valor certo na URL, a rota responde 404 |

## Deploy na Vercel

1. Painel Vercel → **Add New → Project** → importe este repositório
   (`Ailtinho-Filho/financedash`).
2. **Settings → Environment Variables** → cadastrar `JWT_SECRET`,
   `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_BASE_URL` e
   `PLUGGY_WEBHOOK_SECRET` (valores reais, nunca os do `.env.example`).
   Se o projeto já existia antes conectado a outra fonte, confira que as
   variáveis do Vercel KV (`KV_REST_API_URL`, `KV_REST_API_TOKEN` etc.)
   continuam lá — não recrie, só confirme.
3. Redeploy.

## Cadastrar o webhook no painel da Pluggy

1. Gere o segredo (se ainda não tiver um):
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
2. Cadastre esse valor como `PLUGGY_WEBHOOK_SECRET` na Vercel e redeploy.
3. No painel da Pluggy → Webhooks → criar novo:
   - **URL**: `https://SEU-APP.vercel.app/api/webhook/pluggy?secret=SEU_SEGREDO`
   - **Evento**: `all`
4. Teste: dispare um evento de teste no painel da Pluggy e confira os logs
   da função na Vercel (`Deployments → Functions → api/webhook/pluggy`) —
   deve aparecer a linha `[webhook/pluggy] evento recebido: ...`.

> Nota de segurança: o segredo vai na query string da URL, então pode
> aparecer em logs de acesso da Vercel/CDN. É um trade-off aceito pela
> simplicidade (uma função serverless única) — dá pra migrar depois para
> um path dinâmico (`/api/webhook/[secret].js`) sem mudar a validação.

## Status do item (`item:<itemId>` no KV)

Quando um item é vinculado (`POST /api/pluggy/items`), o app guarda um
registro `item:<itemId>` no KV:

```json
{ "email": "dono@exemplo.com", "status": null, "error": null, "lastSyncedAt": null }
```

O webhook (`api/webhook/pluggy.js`) atualiza esse registro conforme os
eventos chegam da Pluggy:

- `item/created`, `item/updated`, `item/error`, `item/waiting_user_input`,
  `item/waiting_user_action`, `item/login_succeeded` → `status` vira o nome
  do evento sem o prefixo `item/` (ex: `"error"`), e `error` guarda
  `{ code, message }` quando a Pluggy manda.
- `transactions/created`, `transactions/updated`, `transactions/deleted` →
  só atualiza `lastSyncedAt` (o app não cacheia transações, busca sempre
  ao vivo na Pluggy — não há dado pra invalidar).
- `item/deleted` → remove o item do usuário e apaga o registro.
- Qualquer outro evento (pagamentos, etc.) → só é logado, ignorado.

Itens vinculados **antes** dessa mudança não têm registro — o webhook trata
isso como caso normal (loga e ignora), não como erro.

Pra consultar o status de um item:

```
GET /api/pluggy/items/:itemId
Authorization: Bearer <token>
```

Retorna `{ status, error, lastSyncedAt }`, ou `404` se o item não existir
ou não pertencer ao usuário autenticado.

## Estrutura

```
api/
  auth/           → login, registro (JWT)
  pluggy/         → connect-token, items, accounts, transactions
  webhook/        → recebe eventos da Pluggy (protegido por segredo)
lib/
  authHelper.js   → valida JWT nas rotas protegidas
  kv.js           → persistência de usuários e status de item (Vercel KV)
  pluggyClient.js → cliente HTTP da API da Pluggy
public/           → frontend estático (login, dashboard)
```
