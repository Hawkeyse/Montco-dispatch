const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkTarget, auditReason } = require('../../utils/moderation');
const { ok, fail } = require('../../utils/reply');

module.exports = {
  permission: PermissionFlagsBits.BanMembers,
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member from this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400)),

  async execute(interaction) {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason');
    const member = interaction.options.getMember('user');

    if (member) {
      const problem = checkTarget(interaction, member);
      if (problem) return fail(interaction, problem);
    } else if (user.id === interaction.user.id || user.id === interaction.client.user.id) {
      return fail(interaction, "You can't ban that user.");
    }

    await interaction.guild.members.ban(user, { reason: auditReason(interaction, reason) });
    return ok(interaction, `Banned **${user.tag}**.`);
  },
};
