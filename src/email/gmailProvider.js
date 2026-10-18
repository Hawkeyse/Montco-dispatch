const { google } = require('googleapis');

const decode = (data) => Buffer.from(data, 'base64url').toString('utf8');

function htmlToText(html) {
  return html
    .replace(/<(br|\/p|\/div|\/tr)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractBody(payload) {
  let plain = '';
  let html = '';
  (function walk(part) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data && !plain) plain = decode(part.body.data);
    else if (part.mimeType === 'text/html' && part.body?.data && !html) html = decode(part.body.data);
    (part.parts || []).forEach(walk);
  })(payload);
  return plain.trim() || htmlToText(html);
}

class GmailProvider {
  constructor({ clientId, clientSecret, refreshToken, query, lookback = '2d' }) {
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Gmail provider needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN');
    }
    if (!query) throw new Error('EMAIL_FILTER_RULE is required (refusing to forward the whole mailbox)');
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    this.gmail = google.gmail({ version: 'v1', auth });
    this.query = query;
    this.lookback = lookback;
    this.name = 'gmail';
  }

  async listRecentMessageIds() {
    const res = await this.gmail.users.messages.list({
      userId: 'me',
      q: `${this.query} newer_than:${this.lookback}`,
      maxResults: 50,
    });
    return (res.data.messages ?? []).map((m) => m.id).reverse();
  }

  async getMessage(id) {
    const res = await this.gmail.users.messages.get({ userId: 'me', id, format: 'full' });
    const headers = res.data.payload?.headers ?? [];
    const header = (n) => headers.find((h) => h.name.toLowerCase() === n)?.value ?? '';
    return {
      provider: this.name,
      id: res.data.id,
      subject: header('subject'),
      from: header('from'),
      body: extractBody(res.data.payload),
      receivedAt: Number(res.data.internalDate) || Date.now(),
    };
  }
}

module.exports = { GmailProvider, extractBody };
