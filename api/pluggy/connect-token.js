const { requireAuth } = require("../../lib/authHelper");
const { createConnectToken } = require("../../lib/pluggyClient");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    const { itemId } = req.body || {};
    const accessToken = await createConnectToken(itemId);
    res.json({ accessToken });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Falha ao gerar connect token." });
  }
};
