const { kv } = require("@vercel/kv");

async function findUserByEmail(email) {
  return kv.get(`user:${email}`);
}

async function createUser({ email, passwordHash }) {
  const user = { email, passwordHash, itemIds: [] };
  await kv.set(`user:${email}`, user);
  return user;
}

async function addItemToUser(email, itemId) {
  const user = await findUserByEmail(email);
  if (!user) return;
  if (!user.itemIds.includes(itemId)) user.itemIds.push(itemId);
  await kv.set(`user:${email}`, user);
}

async function removeItemFromUser(email, itemId) {
  const user = await findUserByEmail(email);
  if (!user) return;
  user.itemIds = user.itemIds.filter((id) => id !== itemId);
  await kv.set(`user:${email}`, user);
}

// --- Registro de item (item:<itemId>) ---
// Guarda o dono do item (pra o webhook, que só recebe itemId, saber a quem
// avisar) e o status mais recente reportado pela Pluggy. Itens vinculados
// antes desta mudança não têm registro — as funções abaixo tratam isso como
// caso normal (retornam null), não como erro, de propósito.

async function createItemRecord(itemId, email) {
  const record = { email, status: null, error: null, lastSyncedAt: null };
  await kv.set(`item:${itemId}`, record);
  return record;
}

async function getItemRecord(itemId) {
  return kv.get(`item:${itemId}`);
}

async function updateItemStatus(itemId, { status, error = null }) {
  const record = await getItemRecord(itemId);
  if (!record) return null; // item órfão (vinculado antes deste recurso existir)
  record.status = status;
  record.error = error;
  await kv.set(`item:${itemId}`, record);
  return record;
}

async function touchItemSync(itemId) {
  const record = await getItemRecord(itemId);
  if (!record) return null;
  record.lastSyncedAt = new Date().toISOString();
  await kv.set(`item:${itemId}`, record);
  return record;
}

async function deleteItemRecord(itemId) {
  await kv.del(`item:${itemId}`);
}

module.exports = {
  findUserByEmail,
  createUser,
  addItemToUser,
  removeItemFromUser,
  createItemRecord,
  getItemRecord,
  updateItemStatus,
  touchItemSync,
  deleteItemRecord,
};
