const { requireAuth } = require("../../../../lib/authHelper");
const { listAccounts } = require("../../../../lib/pluggyClient");

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).end();

  try {
    const accounts = await listAccounts(req.query.itemId);
    res.json({ accounts });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Falha ao buscar contas." });
  }
};
