const { Schema, model } = require('mongoose');

const dispatcherSchema = new Schema(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
  },
  { timestamps: true }
);

dispatcherSchema.index({ guildId: 1, channelId: 1, code: 1 }, { unique: true });
dispatcherSchema.index({ guildId: 1, code: 1 });

module.exports = model('Dispatcher', dispatcherSchema);
