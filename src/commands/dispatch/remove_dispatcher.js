const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Dispatcher = require('../../database/models/Dispatcher');
const { normalizeCode } = require('../../utils/validation');
const { ok, fail } = require('../../utils/reply');

module.exports = {
  permission: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('remove_dispatcher')
    .setDescription('Removes an existing dispatcher code from a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((o) => o.setName('channel').setDescription('Channel the code belongs to').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((o) => o.setName('code').setDescription('Dispatcher code').setRequired(true).setMaxLength(20)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    const code = normalizeCode(interaction.options.getString('code', true));
    if (!code) return fail(interaction, 'Invalid code.');

    const { deletedCount } = await Dispatcher.deleteOne({ guildId: interaction.guildId, channelId: channel.id, code });
    return deletedCount ? ok(interaction, `Removed \`${code}\` from ${channel}.`) : fail(interaction, `\`${code}\` isn't assigned to ${channel}.`);
  },
};
