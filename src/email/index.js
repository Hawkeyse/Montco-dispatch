const { GmailProvider } = require('./gmailProvider');

function createProvider({ provider, filterRule }) {
  switch (provider) {
    case 'gmail':
      return new GmailProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        query: filterRule,
      });
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER "${provider}"`);
  }
}

module.exports = { createProvider };
