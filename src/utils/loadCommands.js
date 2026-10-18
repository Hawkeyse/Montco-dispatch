const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');

function loadCommands(dir = path.join(__dirname, '..', 'commands')) {
  const commands = new Map();
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) {
        const cmd = require(full);
        if (cmd?.data && cmd?.execute) commands.set(cmd.data.name, cmd);
        else logger.warn(`[commands] skipped ${full}: missing data/execute`);
      }
    }
  };
  walk(dir);
  return commands;
}

module.exports = { loadCommands };
