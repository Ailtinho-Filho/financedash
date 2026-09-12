# FinanceDash

**FinanceDash** é uma aplicação web de organização e acompanhamento financeiro pessoal.  
O projeto possui autenticação de usuários, armazenamento de dados, integração com a **Pluggy** para conexão de contas bancárias e análise financeira com **IA (Groq)**.

## ✨ Funcionalidades

- 🔐 Cadastro e login com e-mail e senha
- 🔑 Autenticação por JWT
- 💾 Persistência dos dados do usuário no Vercel KV
- 🏦 Integração com a Pluggy para conexão de contas bancárias
- 💳 Consulta de contas e transações bancárias
- 🔄 Webhook da Pluggy para acompanhar alterações nos itens conectados
- 🤖 Análise de lançamentos financeiros com IA
- 📊 Dashboard financeiro
- 🎯 Armazenamento de metas e carteira financeira
- ☁️ Deploy preparado para Vercel

## 🧰 Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML, CSS e JavaScript | Interface do dashboard |
| Node.js | Backend / funções da API |
| Vercel Serverless Functions | Execução das rotas `/api` |
| Vercel KV / Upstash Redis | Persistência dos dados |
| JWT | Autenticação |
| bcryptjs | Hash das senhas |
| Pluggy | Integração com instituições financeiras |
| Groq | Análise financeira com IA |
| Axios | Requisições HTTP |

## 📁 Estrutura do projeto

```text
financedash-main/
├── api/
│   ├── auth/
│   │   ├── login.js
│   │   └── register.js
│   ├── finance/
│   │   └── analyze.js
│   ├── pluggy/
│   │   ├── accounts/
│   │   │   └── [accountId]/
│   │   │       └── transactions.js
│   │   ├── connect-token.js
│   │   ├── items.js
│   │   ├── items/
│   │   │   └── [itemId]/
│   │   │       └── accounts.js
│   │   └── items/[itemId].js
│   ├── webhook/
│   │   └── pluggy.js
│   └── data.js
├── lib/
│   ├── authHelper.js
│   ├── kv.js
│   └── pluggyClient.js
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── api.js
│   ├── index.html
│   └── login.html
├── specs/
│   └── sincronizar-webhook-pluggy.md
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## 🚀 Como executar localmente

### 1. Instalar as dependências

```bash
npm install
```

### 2. Configurar as variáveis de ambiente

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Depois preencha as credenciais necessárias.

> **Nunca envie o `.env` para o GitHub.** O arquivo `.env` já deve permanecer protegido pelo `.gitignore`.

### 3. Executar com a Vercel CLI

Como as rotas estão no formato de Serverless Functions da Vercel, a forma recomendada de testar localmente é:

```bash
npm install -g vercel
vercel dev
```

A aplicação ficará disponível no endereço informado pela Vercel CLI.

## 🔐 Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `JWT_SECRET` | Chave utilizada para assinar os tokens JWT |
| `PLUGGY_CLIENT_ID` | Client ID da integração com a Pluggy |
| `PLUGGY_CLIENT_SECRET` | Client Secret da Pluggy |
| `PLUGGY_BASE_URL` | URL base da API da Pluggy |
| `PLUGGY_WEBHOOK_SECRET` | Segredo utilizado para proteger o webhook |
| `GROQ_API_KEY` | Chave da API da Groq usada pela análise financeira com IA |
| `KV_REST_API_URL` | URL do armazenamento KV/Redis |
| `KV_REST_API_TOKEN` | Token de acesso ao armazenamento KV/Redis |

As credenciais privadas devem existir apenas no ambiente do servidor/Vercel e no `.env` local.

## 🤖 Análise financeira com IA

A rota:

```text
POST /api/finance/analyze
```

recebe uma descrição e um valor e utiliza a IA da Groq para retornar uma análise estruturada.

Exemplo de entrada:

```json
{
  "description": "Compra no supermercado",
  "amount": 150.5
}
```

A análise retorna informações como:

```json
{
  "category": "Alimentação",
  "type": "EXPENSE",
  "is_anomaly": false,
  "insight": "..."
}
```

A IA é orientada a retornar:

- `category` — categoria financeira
- `type` — `EXPENSE` ou `INCOME`
- `is_anomaly` — indica possível anomalia
- `insight` — resumo/insight financeiro

## 🏦 Integração com Pluggy

O FinanceDash utiliza a Pluggy para conectar instituições financeiras e consultar informações de contas e transações.

Principais operações:

```text
/api/pluggy/connect-token
/api/pluggy/items
/api/pluggy/items/:itemId
/api/pluggy/items/:itemId/accounts
/api/pluggy/accounts/:accountId/transactions
```

As transações são consultadas diretamente na API da Pluggy; o projeto não utiliza um cache próprio de transações.

## 🔄 Webhook da Pluggy

O endpoint:

```text
/api/webhook/pluggy
```

recebe eventos enviados pela Pluggy.

O projeto acompanha eventos relacionados ao estado dos itens conectados, como:

```text
item/created
item/updated
item/error
item/waiting_user_input
item/waiting_user_action
item/login_succeeded
item/deleted
```

Eventos de transações atualizam o horário de sincronização:

```text
transactions/created
transactions/updated
transactions/deleted
```

Eventos que não são utilizados pelo FinanceDash são apenas registrados e ignorados.

### Configuração do webhook

Gere um segredo seguro:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Cadastre o resultado como `PLUGGY_WEBHOOK_SECRET` no ambiente da Vercel.

Depois, no painel da Pluggy, configure uma URL semelhante a:

```text
https://SEU-APP.vercel.app/api/webhook/pluggy?secret=SEU_SEGREDO
```

Para testar, envie um evento pelo painel da Pluggy e confira os logs da função na Vercel.

## 💾 Dados do usuário

Os dados financeiros do usuário são armazenados em um documento no KV.

A API:

```text
GET /api/data
PUT /api/data
```

é protegida por JWT.

O documento pode conter:

- lançamentos financeiros (`db`)
- configurações (`cfg`)
- metas (`goals`)
- carteira financeira (`pf`)

O backend também registra `updatedAt` para controle da última atualização.

## 🔒 Segurança

- Senhas são armazenadas usando `bcryptjs`.
- Sessões utilizam JWT com validade de 7 dias.
- Credenciais da Pluggy e Groq ficam no backend.
- O webhook é protegido por segredo.
- O `.env` não deve ser versionado.
- Rotas de dados e operações privadas exigem autenticação.

## ☁️ Deploy na Vercel

1. Acesse a Vercel e importe o repositório do FinanceDash.
2. Configure as variáveis de ambiente do projeto.
3. Confirme as variáveis do KV/Redis.
4. Faça o deploy.
5. Configure o webhook da Pluggy apontando para a URL de produção.

Depois do deploy, verifique os logs das funções em:

```text
Vercel → Deployments → Functions
```

## 📌 Estado atual

O projeto está estruturado para:

- frontend estático em `public/`;
- APIs serverless em `api/`;
- funções auxiliares em `lib/`;
- especificações técnicas em `specs/`;
- integração bancária via Pluggy;
- persistência via KV/Redis;
- análise financeira utilizando IA.

## 📄 Especificações

A pasta `specs/` contém documentos técnicos relacionados ao desenvolvimento do projeto, incluindo a especificação da sincronização do webhook da Pluggy:

```text
specs/sincronizar-webhook-pluggy.md
```

---

**FinanceDash** — organização financeira pessoal com integração bancária e inteligência artificial.
