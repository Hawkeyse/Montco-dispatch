const { SlashCommandBuilder } = require('discord.js');
const { E } = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with the bot ping!'),

  async execute(interaction) {
    const roundTrip = Date.now() - interaction.createdTimestamp;
    return interaction.reply(`${E.success} Pong! Gateway: ${interaction.client.ws.ping}ms | Round trip: ${roundTrip}ms`);
  },
};
