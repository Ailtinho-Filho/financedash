const crypto = require("crypto");
const users = new Map();

function findUserByEmail(email) {
  return users.get(email);
}
function createUser({ email, passwordHash }) {
  const user = { id: crypto.randomUUID(), email, passwordHash, itemIds: [] };
  users.set(email, user);
  return user;
}
function addItemToUser(email, itemId) {
  const user = users.get(email);
  if (!user) return;
  if (!user.itemIds.includes(itemId)) user.itemIds.push(itemId);
}
function removeItemFromUser(email, itemId) {
  const user = users.get(email);
  if (!user) return;
  user.itemIds = user.itemIds.filter((id) => id !== itemId);
}

module.exports = { findUserByEmail, createUser, addItemToUser, removeItemFromUser };
