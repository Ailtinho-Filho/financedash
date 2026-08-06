const { requireAuth } = require("../../../lib/authHelper");
const { removeItemFromUser } = require("../../../lib/kv");
const { deleteItem } = require("../../../lib/pluggyClient");

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== "DELETE") return res.status(405).end();

  try {
    await deleteItem(req.query.itemId);
    await removeItemFromUser(user.email, req.query.itemId);
    res.status(204).end();
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Falha ao remover item." });
  }
};
