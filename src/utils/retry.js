const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isTransient(err) {
  let status = err?.status ?? err?.response?.status;
  if (status === undefined && typeof err?.code === 'number' && err.code < 600) status = err.code;
  if (status === 429 || status >= 500) return true;
  const code = String(err?.code ?? '');
  if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND', 'UND_ERR_CONNECT_TIMEOUT'].includes(code)) return true;
  return /fetch failed|socket hang up|network/i.test(String(err?.message ?? ''));
}

async function withRetry(fn, { retries = 3, baseMs = 1000, shouldRetry = isTransient, onRetry } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err;
      onRetry?.(err, attempt + 1);
      await sleep(baseMs * 2 ** attempt + Math.random() * 250);
    }
  }
}

module.exports = { withRetry, isTransient };
