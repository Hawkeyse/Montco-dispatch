require('dotenv').config();

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

function getConfig() {
  return {
    token: need('DISCORD_TOKEN'),
    clientId: need('DISCORD_CLIENT_ID'),
    guildId: need('DISCORD_GUILD_ID'),
    mongoUri: need('MONGODB_URI'),
    email: {
      provider: (process.env.EMAIL_PROVIDER || '').trim().toLowerCase(),
      pollIntervalMs: Math.max(15, Number(process.env.EMAIL_POLL_INTERVAL_SECONDS) || 60) * 1000,
      filterRule: (process.env.EMAIL_FILTER_RULE || '').trim(),
    },
  };
}

module.exports = { getConfig, need };
