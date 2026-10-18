const { EmbedBuilder } = require('discord.js');
const { withRetry } = require('../utils/retry');
const { E } = require('../utils/emojis');

const MAX_RAW = 3900;

const field = (name, value) => (value ? { name, value: String(value).slice(0, 1024) } : null);

const EMS_RE = /\b(EMS|MEDIC|MEDICAL|ALS|BLS|QRS|CARDIAC|ARREST|OVERDOSE|BREATHING|CHEST|SEIZURE|STROKE|UNCONSCIOUS|DIABETIC|FALL|SICK|INJURY|TRAUMA)\b/i;

function buildEmbed(parsed, isUpdate) {
  const unix = Math.floor((parsed.receivedAt || Date.now()) / 1000);
  const isEms = EMS_RE.test(`${parsed.callType || ''} ${parsed.group || ''}`);
  let raw = parsed.raw.replace(/```/g, "'''");
  if (raw.length > MAX_RAW) raw = raw.slice(0, MAX_RAW - 1) + '…';

  const fields = [
    field(`${E.incident} Incident`, parsed.incidentId),
    field(`${isEms ? E.staroflife : E.fire} Type`, parsed.callType),
    field(`${E.pin} Address`, parsed.address),
    field(`${E.building} Apt`, parsed.apt),
    field(`${E.info} Place`, parsed.place),
    field(`${E.crossroads} Cross Streets`, parsed.crossStreets),
    field(`${E.map} Municipality`, parsed.municipality),
    field(`${E.clock} Time`, `<t:${unix}:F> (<t:${unix}:R>)`),
    field(`${E.radio} Map/Box`, parsed.mapBox),
    field(`${E.hazmat} Pre-Plan`, parsed.prePlan),
    field(`${isEms ? E.ambulance : E.firetruck} Units`, parsed.units),
    field(`${E.note} Notes`, parsed.notes),
    field(`${E.megaphone} Group`, parsed.group),
  ].filter(Boolean);

  return new EmbedBuilder()
    .setTitle(isUpdate ? `${E.update} Dispatch Update` : `${E.siren} Dispatch Alert`)
    .setColor(isUpdate ? 0xf59e0b : 0xdc2626)
    .setDescription('```\n' + raw + '\n```')
    .addFields(fields);
}

async function sendDispatch(client, { channelId, parsed, roleId, previous }) {
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased() || !('send' in channel)) throw new Error(`Channel ${channelId} is not a sendable text channel`);

  const payload = {
    content: roleId ? `<@&${roleId}>` : undefined,
    embeds: [buildEmbed(parsed, Boolean(previous))],
    allowedMentions: { roles: roleId ? [roleId] : [] },
  };
  if (previous?.messageId) payload.reply = { messageReference: previous.messageId, failIfNotExists: false };

  return withRetry(() => channel.send(payload));
}

module.exports = { sendDispatch, buildEmbed };