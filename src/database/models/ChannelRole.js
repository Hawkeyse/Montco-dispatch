const { Schema, model } = require('mongoose');

const channelRoleSchema = new Schema(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    roleId: { type: String, required: true },
  },
  { timestamps: true }
);

channelRoleSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = model('ChannelRole', channelRoleSchema);
