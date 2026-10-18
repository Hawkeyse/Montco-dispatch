const STALE_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function isReclaimable(doc, now = Date.now(), { staleMs = STALE_MS, maxAttempts = MAX_ATTEMPTS } = {}) {
  if (doc.attempts >= maxAttempts) return false;
  if (doc.status === 'failed') return true;
  if (doc.status === 'processing') return now - new Date(doc.updatedAt).getTime() > staleMs;
  return false;
}

async function claim(Model, provider, messageId, opts = {}) {
  try {
    return await Model.create({ provider, messageId });
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }
  const existing = await Model.findOne({ provider, messageId });
  if (!existing || !isReclaimable(existing, Date.now(), opts)) return null;
  return Model.findOneAndUpdate(
    { _id: existing._id, status: existing.status, attempts: existing.attempts },
    { $set: { status: 'processing' }, $inc: { attempts: 1 } },
    { new: true }
  );
}

module.exports = { claim, isReclaimable, STALE_MS, MAX_ATTEMPTS };
