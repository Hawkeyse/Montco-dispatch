const { REST, Routes } = require('discord.js');
const { need } = require('./utils/config');

const terms = process.argv.slice(2).map((t) => t.toLowerCase());

(async () => {
  const rest = new REST().setToken(need('DISCORD_TOKEN'));
  const all = await rest.get(Routes.guildChannels(need('DISCORD_GUILD_ID')));
  const hits = all.filter((c) => !terms.length || terms.some((t) => c.name.toLowerCase().includes(t)));
  for (const c of hits) console.log(`type ${c.type}`, JSON.stringify(c.name), c.id);
  if (!hits.length) console.log('no matches');
})();