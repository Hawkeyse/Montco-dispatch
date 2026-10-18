const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkTarget, auditReason } = require('../../utils/moderation');
const { ok, fail } = require('../../utils/reply');

module.exports = {
  permission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('Member to time out').setRequired(true))
    .addIntegerOption((o) => o.setName('minutes').setDescription('Duration in minutes (max 28 days)').setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400)),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    if (!member) return fail(interaction, "That user isn't in this server.");
    const problem = checkTarget(interaction, member);
    if (problem) return fail(interaction, problem);
    if (!member.moderatable) return fail(interaction, "I can't time out that member.");

    const minutes = interaction.options.getInteger('minutes', true);
    await member.timeout(minutes * 60_000, auditReason(interaction, interaction.options.getString('reason')));
    return ok(interaction, `Timed out **${member.user.tag}** for ${minutes} minute(s).`);
  },
};
