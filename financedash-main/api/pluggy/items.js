const { requireAuth } = require("../../lib/authHelper");
const { addItemToUser, findUserByEmail, createItemRecord } = require("../../lib/kv");
const { getItem } = require("../../lib/pluggyClient");

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const record = await findUserByEmail(user.email);
    return res.json({ itemIds: record?.itemIds || [] });
  }

  if (req.method === "POST") {
    try {
      const { itemId } = req.body || {};
      if (!itemId) return res.status(400).json({ error: "itemId é obrigatório." });
      const item = await getItem(itemId);
      await addItemToUser(user.email, itemId);
      await createItemRecord(itemId, user.email);
      return res.status(201).json({ item });
    } catch (err) {
      console.error(err.response?.data || err.message);
      return res.status(500).json({ error: "Falha ao vincular item." });
    }
  }

  res.status(405).end();
};
