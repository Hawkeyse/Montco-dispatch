const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes, ChannelType } = require('discord.js');
const { need } = require('./utils/config');
const { connectDatabase } = require('./database/connect');
const Dispatcher = require('./database/models/Dispatcher');
const ChannelRole = require('./database/models/ChannelRole');
const { normalizeCode } = require('./utils/validation');

const TEXT_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const slug = (s) => String(s).replace(/^[#@]/, '').trim().toLowerCase().replace(/\s+/g, '-');
const loose = (s) => slug(s).replace(/[-_]/g, '');
const baseName = (s) => slug(s).replace(/^\d+-?/, '');

function parseCodes(text) {
  const rows = [];
  const problems = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const l = line.trim();
    if (!l || /^keyword\b/i.test(l) || l.startsWith('//')) return;
    const m = l.match(/^(.+?)[\s,;\t]+(#?\S+)$/);
    const code = m && normalizeCode(m[1]);
    if (!code) return problems.push(`line ${i + 1}: can't read "${l}"`);
    rows.push({ code, channelName: slug(m[2]) });
  });
  return { rows, problems };
}

function findChannel(channels, name) {
  // codes.txt may name a channel (#345-vmsc) or give its raw id
  if (/^[0-9]{15,}$/.test(name)) return channels.find((c) => c.id === name) || null;
  return (
    channels.find((c) => slug(c.name) === name) ||
    channels.find((c) => loose(c.name) === loose(name)) ||
    null
  );
}

function matchRoles(entries, roles) {
  const usable = roles.filter((r) => !r.managed && r.name !== '@everyone');
  const matches = [];
  const ambiguous = [];
  const used = new Set();
  const left = [];

  for (const e of entries) {
    const cands = usable.filter((r) => slug(r.name) === e.name || loose(r.name) === loose(e.name));
    if (cands.length === 1 && !used.has(cands[0].id)) {
      used.add(cands[0].id);
      matches.push({ ...e, roleId: cands[0].id, roleName: cands[0].name, how: 'same name' });
    } else if (cands.length > 1) ambiguous.push(`#${e.name} -> ${cands.map((c) => c.name).join(' | ')}`);
    else left.push(e);
  }

  for (const e of left) {
    const base = baseName(e.name);
    if (!base) continue;
    const sameBase = entries.filter((x) => baseName(x.name) === base);
    const cands = usable.filter((r) => loose(r.name) === loose(base) && !used.has(r.id));
    if (sameBase.length === 1 && cands.length === 1) {
      used.add(cands[0].id);
      matches.push({ ...e, roleId: cands[0].id, roleName: cands[0].name, how: 'town name' });
    } else if (cands.length >= 1) ambiguous.push(`#${e.name} -> ${cands.map((c) => c.name).join(' | ')} (not unique)`);
  }

  const matched = new Set(matches.map((m) => m.id));
  const unmatched = entries.filter((e) => !matched.has(e.id)).map((e) => `#${e.name}`);
  return { matches, ambiguous, unmatched };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const create = process.argv.includes('--create');
  const withRoles = process.argv.includes('--roles');
  const file = path.join(__dirname, '..', 'codes.txt');
  const guildId = need('DISCORD_GUILD_ID');

  const { rows, problems } = parseCodes(fs.readFileSync(file, 'utf8'));
  const seen = new Map();
  for (const r of rows) {
    if (seen.has(r.code)) problems.push(`duplicate code ${r.code} (${seen.get(r.code)} and ${r.channelName})`);
    else seen.set(r.code, r.channelName);
  }

  const rest = new REST().setToken(need('DISCORD_TOKEN'));
  const all = await rest.get(Routes.guildChannels(guildId));
  const channels = all.filter((c) => TEXT_TYPES.includes(c.type));

  const resolved = new Map();
  const missing = [];
  for (const name of new Set(rows.map((r) => r.channelName))) {
    const found = findChannel(channels, name);
    if (found) resolved.set(name, found.id);
    else if (create && apply) {
      const made = await rest.post(Routes.guildChannels(guildId), { body: { name, type: ChannelType.GuildText } });
      channels.push(made);
      resolved.set(name, made.id);
      console.log(`created #${name}`);
    } else missing.push(name);
  }

  const ops = rows
    .filter((r) => resolved.has(r.channelName))
    .map((r) => ({
      updateOne: {
        filter: { guildId, channelId: resolved.get(r.channelName), code: r.code },
        update: { $setOnInsert: { guildId, channelId: resolved.get(r.channelName), code: r.code } },
        upsert: true,
      },
    }));

  console.log(`codes read: ${rows.length} | channels found: ${resolved.size} | missing: ${missing.length}`);
  if (missing.length) console.log('missing channels:\n  #' + missing.join('\n  #'));
  if (problems.length) console.log('problems:\n  ' + problems.join('\n  '));

  let roleOps = [];
  if (withRoles) {
    const guildRoles = await rest.get(Routes.guildRoles(guildId));
    const entries = [...resolved].map(([name, id]) => ({ name, id }));
    const { matches, ambiguous, unmatched } = matchRoles(entries, guildRoles);
    console.log(`\nroles matched: ${matches.length} | unclear: ${ambiguous.length} | no role found: ${unmatched.length}`);
    matches.forEach((m) => console.log(`  #${m.name} -> @${m.roleName} (${m.how})`));
    if (ambiguous.length) console.log('unclear (set by hand with /add_channel_role):\n  ' + ambiguous.join('\n  '));
    if (unmatched.length) console.log('no role found for: ' + unmatched.join(', '));
    roleOps = matches.map((m) => ({
      updateOne: {
        filter: { guildId, channelId: m.id },
        update: { $setOnInsert: { guildId, channelId: m.id, roleId: m.roleId } },
        upsert: true,
      },
    }));
  }

  if (!apply) {
    console.log(`\nDRY RUN: nothing written. ${ops.length} mappings${withRoles ? ` and ${roleOps.length} roles` : ''} would be added. Re-run with --apply.`);
    return;
  }
  await connectDatabase(need('MONGODB_URI'));
  const res = await Dispatcher.bulkWrite(ops);
  console.log(`\ndone: ${res.upsertedCount} added, ${ops.length - res.upsertedCount} already existed.`);
  if (roleOps.length) {
    const r = await ChannelRole.bulkWrite(roleOps);
    console.log(`roles: ${r.upsertedCount} assigned, ${roleOps.length - r.upsertedCount} channels already had a role.`);
  }
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { parseCodes, findChannel, matchRoles };