const ProcessedEmail = require('../database/models/ProcessedEmail');
const { MAX_ATTEMPTS } = require('../dispatch/dedupe');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

function startPoller({ provider, intervalMs, onEmail }) {
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      const ids = await withRetry(() => provider.listRecentMessageIds(), {
        onRetry: (e, n) => logger.warn(`[email] list retry ${n}: ${e.message}`),
      });
      if (!ids.length) return;

      const done = await ProcessedEmail.find({
        provider: provider.name,
        messageId: { $in: ids },
        $or: [{ status: { $in: ['sent', 'ignored'] } }, { attempts: { $gte: MAX_ATTEMPTS } }],
      }).select('messageId').lean();
      const skip = new Set(done.map((d) => d.messageId));

      for (const id of ids) {
        if (skip.has(id)) continue;
        try {
          const email = await withRetry(() => provider.getMessage(id), {
            onRetry: (e, n) => logger.warn(`[email] fetch retry ${n}: ${e.message}`),
          });
          await onEmail(email);
        } catch (err) {
          logger.error(`[email] message ${id} failed: ${err.message}`);
        }
      }
    } catch (err) {
      logger.error(`[email] poll failed: ${err.message}`);
    } finally {
      running = false;
    }
  }

  tick();
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}

module.exports = { startPoller };
