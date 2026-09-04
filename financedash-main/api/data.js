const { kv } = require("@vercel/kv");
const { requireAuth } = require("../lib/authHelper");

// Documento único por usuário. O app manda o estado inteiro (é pequeno:
// lançamentos, config, metas e carteira), então não vale a pena fatiar em
// várias chaves. `updatedAt` é o que resolve conflito entre aparelhos.
const MAX_BYTES = 1024 * 1024; // 1 MB — folga grande pro volume esperado

function key(email) {
  return `data:${email}`;
}

function isValidDoc(doc) {
  if (!doc || typeof doc !== "object") return false;
  if (!Array.isArray(doc.db)) return false;
  if (doc.cfg && typeof doc.cfg !== "object") return false;
  if (doc.goals && !Array.isArray(doc.goals)) return false;
  if (doc.pf && !Array.isArray(doc.pf)) return false;
  return true;
}

module.exports = async function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const { email } = auth;

  if (req.method === "GET") {
    try {
      const doc = await kv.get(key(email));
      return res.status(200).json(doc || null);
    } catch (err) {
      console.error("data:get", err);
      return res.status(500).json({ error: "Não foi possível carregar os dados." });
    }
  }

  if (req.method === "PUT") {
    const doc = req.body;

    if (!isValidDoc(doc)) {
      return res.status(400).json({ error: "Formato de dados inválido." });
    }
    if (JSON.stringify(doc).length > MAX_BYTES) {
      return res.status(413).json({ error: "Dados grandes demais." });
    }

    const payload = {
      db: doc.db,
      cfg: doc.cfg || {},
      goals: doc.goals || [],
      pf: doc.pf || [],
      v: 2,
      updatedAt: new Date().toISOString(),
    };

    try {
      await kv.set(key(email), payload);
      return res.status(200).json({ updatedAt: payload.updatedAt });
    } catch (err) {
      console.error("data:put", err);
      return res.status(500).json({ error: "Não foi possível salvar os dados." });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Método não permitido." });
};
