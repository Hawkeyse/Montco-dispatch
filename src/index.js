const { Client, GatewayIntentBits, Events, MessageFlags } = require('discord.js');
const { getConfig } = require('./utils/config');
const logger = require('./utils/logger');
const { connectDatabase } = require('./database/connect');
const { loadCommands } = require('./utils/loadCommands');
const { createProvider } = require('./email');
const { startPoller } = require('./email/poller');
const { handleEmail } = require('./dispatch/handler');
const { E } = require('./utils/emojis');

const config = getConfig();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const commands = loadCommands();

const errorReply = { content: `${E.error} Something went wrong running that.`, flags: MessageFlags.Ephemeral };
const safeReply = (i) =>
  (i.deferred || i.replied ? i.followUp(errorReply) : i.reply(errorReply)).catch(() => {});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;
      if (command.permission && !interaction.memberPermissions?.has(command.permission)) {
        return interaction.reply({ content: `${E.error} You don't have permission to use that.`, flags: MessageFlags.Ephemeral });
      }
      return await command.execute(interaction);
    }
  } catch (err) {
    logger.error(`[interaction:${interaction.commandName ?? interaction.customId}]`, err);
    await safeReply(interaction);
  }
});

client.once(Events.ClientReady, (c) => {
  logger.info(`[bot] logged in as ${c.user.tag}`);

  if (!config.email.provider) {
    logger.warn('[email] EMAIL_PROVIDER not set: email forwarding is disabled');
    return;
  }
  const provider = createProvider(config.email);
  startPoller({
    provider,
    intervalMs: config.email.pollIntervalMs,
    onEmail: (email) => handleEmail({ client, guildId: config.guildId, email }),
  });
  logger.info(`[email] polling ${provider.name} every ${config.email.pollIntervalMs / 1000}s`);
});

process.on('unhandledRejection', (err) => logger.error('[unhandledRejection]', err));

(async () => {
  await connectDatabase(config.mongoUri);
  await client.login(config.token);
})().catch((err) => {
  logger.error('[fatal]', err);
  process.exit(1);
});