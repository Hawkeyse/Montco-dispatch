const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const ChannelRole = require('../../database/models/ChannelRole');
const { ok, fail } = require('../../utils/reply');

module.exports = {
  permission: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('delete_channel_role')
    .setDescription('Removes the assigned role from a text channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((o) => o.setName('channel').setDescription('Text channel').addChannelTypes(ChannelType.GuildText).setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    const { deletedCount } = await ChannelRole.deleteOne({ guildId: interaction.guildId, channelId: channel.id });
    return deletedCount ? ok(interaction, `Removed the role from ${channel}.`) : fail(interaction, `${channel} has no role assigned.`);
  },
};
