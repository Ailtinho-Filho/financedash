const { Router } = require("express");
const { requireAuth } = require("../authMiddleware");
const { findUserByEmail, addItemToUser, removeItemFromUser } = require("../store");
const { createConnectToken, getItem, listAccounts, listTransactions, deleteItem } = require("../pluggyClient");

const router = Router();
router.use(requireAuth);

router.post("/connect-token", async (req, res) => {
  try {
    const { itemId } = req.body;
    const accessToken = await createConnectToken(itemId);
    res.json({ accessToken });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Falha ao gerar connect token." });
  }
});

router.post("/items", async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: "itemId é obrigatório." });
    const item = await getItem(itemId);
    addItemToUser(req.user.email, itemId);
    res.status(201).json({ item });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Falha ao vincular item." });
  }
});

router.get("/items", (req, res) => {
  const user = findUserByEmail(req.user.email);
  res.json({ itemIds: user?.itemIds || [] });
});

router.delete("/items/:itemId", async (req, res) => {
  try {
    await deleteItem(req.params.itemId);
    removeItemFromUser(req.user.email, req.params.itemId);
    res.status(204).end();
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Falha ao remover item." });
  }
});

router.get("/items/:itemId/accounts", async (req, res) => {
  try {
    const accounts = await listAccounts(req.params.itemId);
    res.json({ accounts });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Falha ao buscar contas." });
  }
});

router.get("/accounts/:accountId/transactions", async (req, res) => {
  try {
    const { from, to, page, pageSize } = req.query;
    const data = await listTransactions(req.params.accountId, { from, to, page, pageSize });
    res.json(data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Falha ao buscar transações." });
  }
});

module.exports = router;
