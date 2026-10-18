const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Dispatcher = require('../../database/models/Dispatcher');
const { normalizeCode } = require('../../utils/validation');
const { ok, fail } = require('../../utils/reply');

module.exports = {
  permission: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('edit_dispatcher')
    .setDescription('Edit an existing dispatcher code for a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((o) => o.setName('channel').setDescription('Channel the code belongs to').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((o) => o.setName('old_code').setDescription('Current code').setRequired(true).setMaxLength(20))
    .addStringOption((o) => o.setName('new_code').setDescription('New code').setRequired(true).setMaxLength(20)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    const oldCode = normalizeCode(interaction.options.getString('old_code', true));
    const newCode = normalizeCode(interaction.options.getString('new_code', true));
    if (!oldCode || !newCode) return fail(interaction, 'Invalid code. Use letters, numbers and dashes only (max 20).');

    let updated;
    try {
      updated = await Dispatcher.findOneAndUpdate(
        { guildId: interaction.guildId, channelId: channel.id, code: oldCode },
        { code: newCode }
      );
    } catch (err) {
      if (err.code === 11000) return fail(interaction, `\`${newCode}\` is already assigned to ${channel}.`);
      throw err;
    }
    if (!updated) return fail(interaction, `\`${oldCode}\` isn't assigned to ${channel}.`);
    return ok(interaction, `Changed \`${oldCode}\` to \`${newCode}\` for ${channel}.`);
  },
};
