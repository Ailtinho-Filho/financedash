const { requireAuth } = require("../lib/authHelper");
const { hit } = require("../lib/rateLimit");

// Categorias que o app usa hoje — mantidas em sincronia manual com as
// definidas em public/index.html (array CATS). Se adicionar uma categoria
// nova no app, adicione aqui também.
const CATS_OUT = ["mercado","transp","lazer","compras","curso","academia",
  "assin","saude","casa","parcela","invest","outros"];
const CATS_IN = ["salario","retorno","proventos","extra"];

const SYSTEM = `Você categoriza um único lançamento financeiro em português do Brasil.

Categorias de gasto válidas: ${CATS_OUT.join(", ")}
Categorias de entrada válidas: ${CATS_IN.join(", ")}

Responda apenas com JSON, nada mais, neste formato exato:
{"cat":"id_da_categoria","confidence":0.0}

Regras:
- "confidence" vai de 0 a 1, sua certeza na escolha.
- Se a descrição for ambígua ou não bater com nada específico, use "outros" (gasto) ou "extra" (entrada) com confidence baixo.
- Restaurante, mercado, ifood, padaria → mercado
- Uber, 99, combustível, ônibus → transp
- Curso, faculdade, livro de estudo → curso
- Academia, personal → academia
- Netflix, Spotify, assinatura de app → assin
- Farmácia, consulta, remédio → saude
- Aluguel, condomínio, luz, água, internet de casa → casa
- Parcela de cartão, financiamento → parcela
- Compra de ação, FII, aporte → invest
- Roupa, eletrônico, presente → compras
- Cinema, bar, jogo, viagem → lazer`;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const auth = requireAuth(req, res);
  if (!auth) return;

  // Limite por usuário: barato por chamada, mas sem teto um bug no
  // frontend (ex.: loop chamando a cada tecla) pode gerar custo real.
  const rl = await hit("categorize", auth.email, { max: 200, windowSec: 3600 });
  if (rl.blocked) {
    return res.status(429).json({ error: "Muitas categorizações nesta hora. Tente mais tarde." });
  }

  const { desc, kind } = req.body || {};
  if (!desc || typeof desc !== "string" || desc.length > 200) {
    return res.status(400).json({ error: "Descrição inválida." });
  }
  if (kind !== "in" && kind !== "out") {
    return res.status(400).json({ error: "Tipo inválido." });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022", // categorização é uma tarefa simples — Haiku é ~10x mais barato que Sonnet e sobra para isso
        max_tokens: 60,
        system: SYSTEM,
        messages: [{ role: "user", content: `Tipo: ${kind === "in" ? "entrada" : "gasto"}\nDescrição: "${desc}"` }],
      }),
    });

    if (!r.ok) {
      const errBody = await r.text();
      console.error("Anthropic API error:", r.status, errBody);
      return res.status(502).json({ error: "Não foi possível categorizar agora." });
    }

    const data = await r.json();
    const text = (data.content || []).map((b) => b.text || "").join("").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(200).json({ cat: null, confidence: 0 }); // falha graciosa: usuário escolhe manualmente
    }

    const validCats = kind === "in" ? CATS_IN : CATS_OUT;
    if (!validCats.includes(parsed.cat)) {
      return res.status(200).json({ cat: null, confidence: 0 });
    }

    return res.status(200).json({
      cat: parsed.cat,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    });
  } catch (err) {
    console.error("categorize error:", err);
    return res.status(500).json({ error: "Erro ao categorizar." });
  }
};
