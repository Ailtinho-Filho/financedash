const { requireAuth } = require("../../../../lib/authHelper");
const { listTransactions } = require("../../../../lib/pluggyClient");

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).end();

  try {
    const { from, to, page, pageSize } = req.query;
    const data = await listTransactions(req.query.accountId, { from, to, page, pageSize });
    res.json(data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Falha ao buscar transações." });
  }
};
