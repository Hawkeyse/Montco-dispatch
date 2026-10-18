const Dispatcher = require('../database/models/Dispatcher');
const ChannelRole = require('../database/models/ChannelRole');
const ProcessedEmail = require('../database/models/ProcessedEmail');
const Incident = require('../database/models/Incident');
const { parseDispatch } = require('./parser');
const { matchChannels } = require('./router');
const { claim } = require('./dedupe');
const { sendDispatch } = require('./sender');
const logger = require('../utils/logger');

async function deliver(client, guildId, channelId, parsed) {
  const { incidentId } = parsed;
  const previous = incidentId ? await Incident.findOne({ guildId, channelId, incidentId }).lean() : null;
  const roleDoc = await ChannelRole.findOne({ guildId, channelId }).lean();

  const message = await sendDispatch(client, { channelId, parsed, roleId: roleDoc?.roleId, previous });

  if (incidentId && !previous) {
    await Incident.create({ guildId, channelId, incidentId, messageId: message.id }).catch((err) => {
      if (err?.code !== 11000) throw err;
    });
  }
}

const allDispatchesChannelId = () => (process.env.ALL_DISPATCHES_CHANNEL_ID || '').trim();

async function handleEmail({ client, guildId, email }) {
  const doc = await claim(ProcessedEmail, email.provider, email.id);
  if (!doc) return 'skipped';

  try {
    const parsed = { ...parseDispatch(email), receivedAt: email.receivedAt };
    const mappings = await Dispatcher.find({ guildId }).lean();
    const routes = matchChannels(mappings, `${email.subject}\n${email.body}`, { callType: parsed.callType });

    const allId = allDispatchesChannelId();
    const targets = routes.map((r) => r.channelId);
    if (allId && !targets.includes(allId)) targets.push(allId);

    if (!routes.length) {
      logger.warn(`[dispatch] no route for email ${email.id}${parsed.incidentId ? ` (incident ${parsed.incidentId})` : ''}`);
      if (!targets.length) {
        await ProcessedEmail.updateOne({ _id: doc._id }, { status: 'ignored' });
        return 'ignored';
      }
    }

    const delivered = new Set(doc.deliveredChannels);
    const errors = [];
    for (const channelId of targets) {
      if (delivered.has(channelId)) continue;
      try {
        await deliver(client, guildId, channelId, parsed);
        await ProcessedEmail.updateOne({ _id: doc._id }, { $addToSet: { deliveredChannels: channelId } });
      } catch (err) {
        errors.push(err);
        logger.error(`[dispatch] delivery to ${channelId} failed: ${err.message}`);
      }
    }
    if (errors.length) throw errors[0];

    await ProcessedEmail.updateOne({ _id: doc._id }, { status: 'sent' });
    logger.info(`[dispatch] sent email ${email.id} to ${targets.length} channel(s)`);
    return 'sent';
  } catch (err) {
    await ProcessedEmail.updateOne(
      { _id: doc._id },
      { status: 'failed', lastError: String(err.message).slice(0, 500) }
    ).catch(() => {});
    throw err;
  }
}

module.exports = { handleEmail };