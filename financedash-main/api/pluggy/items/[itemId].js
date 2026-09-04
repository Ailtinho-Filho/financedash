const { requireAuth } = require("../../../lib/authHelper");
const { removeItemFromUser, getItemRecord, deleteItemRecord } = require("../../../lib/kv");
const { deleteItem } = require("../../../lib/pluggyClient");

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const record = await getItemRecord(req.query.itemId);
    // 404 tanto se o item não existe quanto se pertence a outro usuário —
    // não dá pra diferenciar os dois casos na resposta, senão um usuário
    // autenticado poderia descobrir itemIds válidos de outras pessoas.
    if (!record || record.email !== user.email) return res.status(404).end();
    const { status, error, lastSyncedAt } = record;
    return res.json({ status, error, lastSyncedAt });
  }

  if (req.method === "DELETE") {
    try {
      const itemId = req.query.itemId;
      const record = await getItemRecord(itemId);
      if (!record || record.email !== user.email) return res.status(404).end();

      await deleteItem(itemId);
      await removeItemFromUser(user.email, itemId);
      await deleteItemRecord(itemId);
      return res.status(204).end();
    } catch (err) {
      console.error(err.response?.data || err.message);
      return res.status(500).json({ error: "Falha ao remover item." });
    }
  }

  res.status(405).end();
};
