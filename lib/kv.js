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

module.exports = { findUserByEmail, createUser, addItemToUser, removeItemFromUser };
