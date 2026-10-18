const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Dispatcher = require('../../database/models/Dispatcher');
const { normalizeCode } = require('../../utils/validation');
const { ok, fail } = require('../../utils/reply');

module.exports = {
  permission: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('add_dispatcher')
    .setDescription('Adds a new dispatcher code to a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((o) => o.setName('channel').setDescription('Channel to receive this code').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((o) => o.setName('code').setDescription('Dispatcher code').setRequired(true).setMaxLength(20)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    const code = normalizeCode(interaction.options.getString('code', true));
    if (!code) return fail(interaction, 'Invalid code. Use letters, numbers and dashes only (max 20).');

    try {
      await Dispatcher.create({ guildId: interaction.guildId, channelId: channel.id, code });
    } catch (err) {
      if (err.code === 11000) return fail(interaction, `\`${code}\` is already assigned to ${channel}.`);
      throw err;
    }
    return ok(interaction, `Added \`${code}\` to ${channel}.`);
  },
};
