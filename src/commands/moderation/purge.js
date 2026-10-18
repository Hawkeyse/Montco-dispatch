const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { E } = require('../../utils/emojis');
const { fail } = require('../../utils/reply');
const logger = require('../../utils/logger');

const PER_CHANNEL_SCAN = 500;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000 - 60_000;

async function collect(channel, userId) {
  const found = [];
  let before;
  let scanned = 0;
  while (scanned < PER_CHANNEL_SCAN) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    scanned += batch.size;
    for (const m of batch.values()) {
      if (Date.now() - m.createdTimestamp > MAX_AGE_MS) return found;
      if (m.author.id === userId) found.push(m);
    }
    before = batch.last().id;
  }
  return found;
}

module.exports = {
  permission: PermissionFlagsBits.ManageMessages,
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Purges all messages from a specific user across the entire server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('User whose messages to delete').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user', true);
    if (user.id === interaction.client.user.id) return fail(interaction, "I won't purge my own messages.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('purge_confirm').setLabel('Confirm').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('purge_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );
    const res = await interaction.reply({
      content: `Delete messages from <@${user.id}> in every channel I can manage? Only the last 14 days, up to ${PER_CHANNEL_SCAN} recent messages per channel. This can't be undone.`,
      components: [row],
      flags: 64,
      allowedMentions: { parse: [] },
      withResponse: true,
    });

    let click;
    try {
      click = await res.resource.message.awaitMessageComponent({
        filter: (c) => c.user.id === interaction.user.id,
        time: 30_000,
      });
    } catch {
      return interaction.editReply({ content: `${E.error} Timed out. Nothing was deleted.`, components: [] });
    }
    if (click.customId !== 'purge_confirm') {
      return click.update({ content: `${E.error} Cancelled. Nothing was deleted.`, components: [] });
    }

    await click.update({ content: `${E.loading} Purging messages...`, components: [] });

    const me = interaction.guild.members.me;
    const channels = (await interaction.guild.channels.fetch()).filter(
      (c) =>
        c &&
        [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(c.type) &&
        c.permissionsFor(me)?.has([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ])
    );

    let total = 0;
    let touched = 0;
    for (const channel of channels.values()) {
      try {
        const msgs = await collect(channel, user.id);
        for (let i = 0; i < msgs.length; i += 100) {
          const deleted = await channel.bulkDelete(msgs.slice(i, i + 100), true);
          total += deleted.size;
        }
        if (msgs.length) touched++;
      } catch (err) {
        logger.warn(`[purge] channel ${channel.id}: ${err.message}`);
      }
    }

    return interaction.editReply({
      content: `${E.success} Deleted ${total} message(s) from <@${user.id}> in ${touched} channel(s).`,
      allowedMentions: { parse: [] },
    });
  },
};
