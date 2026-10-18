const { Schema, model } = require('mongoose');

const incidentSchema = new Schema(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    incidentId: { type: String, required: true },
    messageId: { type: String, required: true },
  },
  { timestamps: true }
);

incidentSchema.index({ guildId: 1, channelId: 1, incidentId: 1 }, { unique: true });
incidentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = model('Incident', incidentSchema);
