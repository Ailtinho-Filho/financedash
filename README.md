# Meu Caixa

App de finanças pessoais: lançamentos, orçamento por categoria, controle
semanal de gastos, calculadora de "posso gastar?", carteira de investimentos
e avisos automáticos sobre o mês.

Os dados ficam no navegador (localStorage) e sincronizam com o Vercel KV
quando você entra com uma conta — assim os mesmos números aparecem no
celular e no computador.

## Funcionalidades

**Início**
- Saldo livre do mês, com projeção considerando os fixos que ainda não
  foram lançados
- Avisos automáticos (mês no vermelho, categoria estourada, semana no
  limite, categoria subindo forte, fixos pendentes) — tudo calculado sobre
  os dados locais, sem chamada de API
- Calculadora "Posso gastar?": informa um valor, até quando esse dinheiro
  precisa esticar e de onde ele sai (saldo do mês ou uma meta do tipo
  "consumir"); devolve quantos dias úteis restam e se o gasto cabe
- Gráfico de setores dos gastos por categoria
- Barras de progresso contra o orçamento de cada categoria
- Comparação dos últimos três meses, categoria por categoria

**Lançar**
- Gasto ou entrada, com categorias em grade e atalhos de valor rápido
- Toca em qualquer lançamento da lista para editar ou apagar
- Aviso de duplicata ao lançar algo igual ao que já existe no mesmo dia

**Semana**
- As cinco semanas do mês com barra de progresso contra o teto semanal
- Todos os lançamentos do mês, agrupados por dia

**Carteira**
- Renda passiva projetada por mês, com barra até a meta
- Composição por tipo de ativo (FII, ETF, ação, BDR) em gráfico de setores
- Cada ativo com cotas, preço, provento e meta de acumulação
- Metas de dois tipos: **acumular** (reserva, quitar dívida — barra enche)
  e **consumir** (uma quantia que precisa durar até uma data — barra
  esvazia e fica vermelha abaixo de 25%)

**Ajustes**
- Renda mensal, teto semanal, meta de renda passiva
- Lançamentos fixos: cadastra uma vez (curso, academia, parcela) com o dia
  do mês em que cada um cai; um toque lança todos os pendentes de uma vez
- Orçamento por categoria
- Sincronização de conta (entrar, sincronizar agora, sair)
- Backup: baixar cópia em JSON e restaurar (com opção de somar ou
  substituir os dados existentes)

## Estrutura

```
public/
  index.html      app inteiro (HTML, CSS e JS num arquivo só)
  login.html      entrar / criar conta
  api.js          cliente das rotas
  styles.css      estilos da tela de login
api/
  auth/login.js       entrar (com limite de tentativas)
  auth/register.js    criar conta (com regra de senha)
  data.js             GET e PUT do estado do app
lib/
  kv.js           usuários no Vercel KV
  authHelper.js   assinatura e validação de token (expira em 30 dias)
  rateLimit.js    contador de tentativas de login/registro
  password.js     regras mínimas de senha
_archive/
  pluggy/         integração Open Finance, desativada
  specs/          notas da integração antiga
```

O `_archive/` começa com underscore de propósito: a Vercel ignora essas
pastas ao publicar funções, então o código antigo fica guardado sem virar
rota acessível.

## Segurança

- Login limitado a 8 tentativas a cada 15 minutos por e-mail
- Registro limitado a 5 tentativas por hora
- Senha mínima de 10 caracteres, com letra e número
- Tokens expiram em 30 dias
- Cabeçalhos de segurança (`X-Frame-Options`, `Referrer-Policy`,
  `Strict-Transport-Security`) no `vercel.json`
- `draw()` no frontend é protegido por try/catch: se algum dado salvo
  estiver corrompido, o app mostra uma tela de recuperação em vez de
  ficar em branco, com opção de limpar os dados locais sem perder o que
  está sincronizado no servidor

## Próximos passos (IA)

O app já tem uma camada de inteligência baseada em regras (os avisos
automáticos da tela Início). As próximas evoluções, que exigem uma rota
de backend com a API da Anthropic:

1. Categorizar gastos automaticamente ao lançar
2. Ler extrato ou fatura em PDF direto no app
3. Responder perguntas sobre os próprios gastos em linguagem natural

## Rodar

```bash
npm install
cp .env.example .env    # preencha JWT_SECRET e as chaves do KV
vercel dev
```

## Publicar

Conecte o repositório à Vercel e configure as variáveis de ambiente no
painel do projeto. O `vercel.json` já traz os cabeçalhos de segurança.

## Backup

Em **Ajustes → Baixar cópia dos dados** o app exporta tudo em JSON. Guarde
uma cópia de tempos em tempos; para restaurar, use o botão ao lado — ele
pergunta se você quer somar ao que já existe ou substituir.
