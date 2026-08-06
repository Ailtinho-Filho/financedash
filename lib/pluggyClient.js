const axios = require("axios");
const BASE_URL = process.env.PLUGGY_BASE_URL || "https://api.pluggy.ai";

let cachedApiKey = null;
let cachedApiKeyExpiresAt = 0;

async function getApiKey() {
  const now = Date.now();
  if (cachedApiKey && now < cachedApiKeyExpiresAt) return cachedApiKey;
  const { data } = await axios.post(`${BASE_URL}/auth`, {
    clientId: process.env.PLUGGY_CLIENT_ID,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET,
  });
  cachedApiKey = data.apiKey;
  cachedApiKeyExpiresAt = now + 1000 * 60 * 100;
  return cachedApiKey;
}

async function createConnectToken(itemId) {
  const apiKey = await getApiKey();
  const { data } = await axios.post(
    `${BASE_URL}/connect_token`,
    itemId ? { itemId } : {},
    { headers: { "X-API-KEY": apiKey } }
  );
  return data.accessToken;
}

async function getItem(itemId) {
  const apiKey = await getApiKey();
  const { data } = await axios.get(`${BASE_URL}/items/${itemId}`, {
    headers: { "X-API-KEY": apiKey },
  });
  return data;
}

async function listAccounts(itemId) {
  const apiKey = await getApiKey();
  const { data } = await axios.get(`${BASE_URL}/accounts`, {
    headers: { "X-API-KEY": apiKey },
    params: { itemId },
  });
  return data.results;
}

async function deleteItem(itemId) {
  const apiKey = await getApiKey();
  await axios.delete(`${BASE_URL}/items/${itemId}`, {
    headers: { "X-API-KEY": apiKey },
  });
}

module.exports = { createConnectToken, getItem, listAccounts, deleteItem };
