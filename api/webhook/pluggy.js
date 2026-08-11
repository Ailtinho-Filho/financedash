const crypto = require("crypto");
const {
  getItemRecord,
  updateItemStatus,
  touchItemSync,
  removeItemFromUser,
  deleteItemRecord,
} = require("../../lib/kv");

// Eventos de status do item (ver docs.pluggy.ai/docs/webhooks). Guardamos o
// nome do evento sem o prefixo "item/" como valor de status — decisão
// consciente de não traduzir pra um enum próprio, pra não ter que manter
// esse mapeamento em dia toda vez que a Pluggy adicionar um evento novo.
const STATUS_EVENTS = new Set([
  "item/created",
  "item/updated",
  "item/error",
  "item/waiting_user_input",
  "item/waiting_user_action",
  "item/login_succeeded",
]);

// O FinanceDash não cacheia transações (busca ao vivo na Pluggy a cada
// request), então esses eventos não têm dado nenhum pra atualizar — só
// registram quando o item sincronizou pela última vez.
const SYNC_EVENTS = new Set(["transactions/created", "transactions/updated", "transactions/deleted"]);

// Compara o segredo recebido com o esperado sem vazar tempo de execução
// (proteção contra timing attack). Comparamos hashes de tamanho fixo em vez
// dos textos crus porque crypto.timingSafeEqual exige buffers do mesmo
// tamanho — e o valor recebido na query string pode ter qualquer tamanho.
function secretMatches(received) {
  const expected = process.env.PLUGGY_WEBHOOK_SECRET;
  if (!expected || !received) return false;

  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  const receivedHash = crypto.createHash("sha256").update(String(received)).digest();
  return crypto.timingSafeEqual(expectedHash, receivedHash);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const { secret } = req.query || {};
  if (!secretMatches(secret)) {
    // 404, não 401/403: esconde que a rota existe de quem não tem o segredo.
    return res.status(404).end();
  }

  // Responde antes de processar o evento, pra Pluggy não reenviar por timeout.
  res.status(200).end();

  try {
    const event = req.body || {};
    const eventName = event.event;
    const itemId = event.itemId || event.item_id;

    console.log("[webhook/pluggy] evento recebido:", eventName, "item:", itemId);

    // Eventos de pagamento (payment_intent/*, scheduled_payment/*, etc.) não
    // têm itemId e o FinanceDash não tem funcionalidade de pagamento — só
    // ficam no log acima, sem processar nada.
    if (!itemId) return;

    if (eventName === "item/deleted") {
      const record = await getItemRecord(itemId);
      if (!record) {
        console.log("[webhook/pluggy] item sem dono conhecido, ignorando:", itemId);
        return;
      }
      await removeItemFromUser(record.email, itemId);
      await deleteItemRecord(itemId);
      return;
    }

    if (STATUS_EVENTS.has(eventName)) {
      const status = eventName.replace("item/", "");
      const updated = await updateItemStatus(itemId, { status, error: event.error || null });
      if (!updated) console.log("[webhook/pluggy] item sem dono conhecido, ignorando:", itemId);
      return;
    }

    if (SYNC_EVENTS.has(eventName)) {
      const touched = await touchItemSync(itemId);
      if (!touched) console.log("[webhook/pluggy] item sem dono conhecido, ignorando:", itemId);
    }
  } catch (err) {
    console.error("[webhook/pluggy] erro ao processar evento:", err.message);
  }
};
