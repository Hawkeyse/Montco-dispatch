const { REST, Routes } = require('discord.js');
const { need } = require('./utils/config');
const { loadCommands } = require('./utils/loadCommands');

const body = [...loadCommands().values()].map((c) => c.data.toJSON());
const rest = new REST().setToken(need('DISCORD_TOKEN'));

rest
  .put(Routes.applicationGuildCommands(need('DISCORD_CLIENT_ID'), need('DISCORD_GUILD_ID')), { body })
  .then((r) => console.log(`Registered ${r.length} commands`))
  .catch((err) => { console.error(err); process.exit(1); });
