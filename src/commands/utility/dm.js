const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { ok, fail, loading } = require('../../utils/reply');

module.exports = {
  permission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Sends a direct message to a specific user with a beautiful embed.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('Who to message').setRequired(true))
    .addStringOption((o) => o.setName('message').setDescription('Message').setRequired(true).setMaxLength(2000))
    .addStringOption((o) => o.setName('title').setDescription('Embed title').setMaxLength(100)),

  async execute(interaction) {
    const user = interaction.options.getUser('user', true);
    if (user.bot) return fail(interaction, "I can't DM bots.");

    await interaction.deferReply({ flags: 64 });
    await loading(interaction, 'Sending...');

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(interaction.options.getString('title') || `Message from ${interaction.guild.name}`)
      .setDescription(interaction.options.getString('message', true))
      .setFooter({ text: interaction.guild.name });

    try {
      await user.send({ embeds: [embed] });
    } catch (err) {
      if (err.code === 50007) return fail(interaction, "That user's DMs are closed.");
      throw err;
    }
    return ok(interaction, `Sent a DM to **${user.tag}**.`);
  },
};
