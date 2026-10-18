const { MessageFlags } = require('discord.js');
const { E } = require('./emojis');

function send(interaction, content, extra = {}) {
  const payload = { content, allowedMentions: { parse: [] }, ...extra };
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

module.exports = {
  ok: (i, msg) => send(i, `${E.success} ${msg}`),
  fail: (i, msg) => send(i, `${E.error} ${msg}`),
  loading: (i, msg) => send(i, `${E.loading} ${msg}`),
};
