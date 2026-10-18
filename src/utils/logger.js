const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const current = levels[process.env.LOG_LEVEL] ?? levels.info;

const make = (level, fn) => (...args) => {
  if (levels[level] <= current) fn(`[${new Date().toISOString()}] [${level}]`, ...args);
};

module.exports = {
  error: make('error', console.error),
  warn: make('warn', console.warn),
  info: make('info', console.log),
  debug: make('debug', console.log),
};
