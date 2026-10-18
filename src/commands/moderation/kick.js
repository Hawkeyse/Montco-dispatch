const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkTarget, auditReason } = require('../../utils/moderation');
const { ok, fail } = require('../../utils/reply');

module.exports = {
  permission: PermissionFlagsBits.KickMembers,
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a member from this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400)),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    if (!member) return fail(interaction, "That user isn't in this server.");
    const problem = checkTarget(interaction, member);
    if (problem) return fail(interaction, problem);

    await member.kick(auditReason(interaction, interaction.options.getString('reason')));
    return ok(interaction, `Kicked **${member.user.tag}**.`);
  },
};
