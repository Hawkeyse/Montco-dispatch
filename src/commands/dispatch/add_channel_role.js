const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const ChannelRole = require('../../database/models/ChannelRole');
const { ok } = require('../../utils/reply');

module.exports = {
  permission: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('add_channel_role')
    .setDescription('Assigns a role to a text channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((o) => o.setName('channel').setDescription('Text channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addRoleOption((o) => o.setName('role').setDescription('Role to assign').setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    const role = interaction.options.getRole('role', true);
    await ChannelRole.findOneAndUpdate({ guildId: interaction.guildId, channelId: channel.id }, { roleId: role.id }, { upsert: true });
    return ok(interaction, `Assigned ${role} to ${channel}.`);
  },
};
