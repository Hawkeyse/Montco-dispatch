const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const Dispatcher = require('../../database/models/Dispatcher');
const ChannelRole = require('../../database/models/ChannelRole');
const { fail } = require('../../utils/reply');
const { EMOJI, E } = require('../../utils/emojis');

const PAGE_LIMIT = 3800;
const IDLE_MS = 5 * 60 * 1000;

module.exports = {
  permission: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('view_dispatcher')
    .setDescription('View all channels and their associated dispatcher codes')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const [rows, roles] = await Promise.all([
      Dispatcher.find({ guildId }).sort({ code: 1 }).lean(),
      ChannelRole.find({ guildId }).lean(),
    ]);

    const byChannel = new Map();
    const entry = (id) => {
      if (!byChannel.has(id)) byChannel.set(id, { codes: [], roleId: null });
      return byChannel.get(id);
    };
    rows.forEach((r) => entry(r.channelId).codes.push(r.code));
    roles.forEach((r) => (entry(r.channelId).roleId = r.roleId));

    if (!byChannel.size) return fail(interaction, 'No dispatcher codes configured.');

    const nameOf = (id) => interaction.guild.channels.cache.get(id)?.name ?? id;
    const blocks = [...byChannel]
      .sort(([a], [b]) => nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true }))
      .map(([id, { codes, roleId }]) =>
        [
          `${E.pin} **Channel:** <#${id}>`,
          `${E.info} **ID:** ${id}`,
          `${E.note} **Codes:** ${codes.length ? codes.map((c) => `\`${c}\``).join(', ') : 'None'}`,
          `${E.bell} **Role:** ${roleId ? `<@&${roleId}>` : 'None'}`,
        ].join('\n')
      );

    const pages = [];
    let current = '';
    for (const block of blocks) {
      if (current && current.length + block.length + 2 > PAGE_LIMIT) {
        pages.push(current);
        current = '';
      }
      current += (current ? '\n\n' : '') + block;
    }
    if (current) pages.push(current);

    let index = 0;
    const render = () => {
      const embed = new EmbedBuilder()
        .setTitle(`${E.radio} Dispatcher Codes & Channels`)
        .setDescription(pages[index])
        .setFooter({ text: `Page ${index + 1} of ${pages.length}` });

      const payload = { embeds: [embed], components: [] };
      if (pages.length > 1) {
        payload.components = [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('dispatcher_prev')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji({ id: EMOJI.prev.id, name: EMOJI.prev.name })
              .setDisabled(index === 0),
            new ButtonBuilder()
              .setCustomId('dispatcher_next')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji({ id: EMOJI.next.id, name: EMOJI.next.name })
              .setDisabled(index === pages.length - 1)
          ),
        ];
      }
      return payload;
    };

    await interaction.reply({ ...render(), allowedMentions: { parse: [] } });
    if (pages.length < 2) return;

    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      idle: IDLE_MS,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'Only the person who ran this command can use these buttons.', flags: MessageFlags.Ephemeral });
      }
      if (i.customId === 'dispatcher_next') index = Math.min(index + 1, pages.length - 1);
      else if (i.customId === 'dispatcher_prev') index = Math.max(index - 1, 0);
      return i.update(render());
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};