const { Schema, model } = require('mongoose');

const processedEmailSchema = new Schema(
  {
    provider: { type: String, required: true },
    messageId: { type: String, required: true },
    status: { type: String, enum: ['processing', 'sent', 'failed', 'ignored'], default: 'processing' },
    attempts: { type: Number, default: 1 },
    deliveredChannels: { type: [String], default: [] },
    lastError: String,
  },
  { timestamps: true }
);

processedEmailSchema.index({ provider: 1, messageId: 1 }, { unique: true });
processedEmailSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = model('ProcessedEmail', processedEmailSchema);
