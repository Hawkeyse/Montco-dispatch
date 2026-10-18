function checkTarget(interaction, target) {
  const { guild, member, client } = interaction;
  if (target.id === interaction.user.id) return "You can't do that to yourself.";
  if (target.id === client.user.id) return "I can't do that to myself.";
  if (target.id === guild.ownerId) return "You can't do that to the server owner.";

  const isOwner = guild.ownerId === interaction.user.id;
  if (!isOwner && member.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    return "Your highest role isn't above that member's highest role.";
  }
  if (guild.members.me.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    return "My highest role isn't above that member's highest role.";
  }
  return null;
}

const auditReason = (interaction, reason) =>
  `${reason || 'No reason provided'} (by ${interaction.user.tag})`.slice(0, 512);

module.exports = { checkTarget, auditReason };
