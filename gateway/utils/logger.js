// Small, dependency-free structured logging wrapper. Wraps console output
// into a consistent { timestamp, level, message, ...context } shape rather
// than pulling in pino/winston -- this project's current scale (no
// confirmed log-aggregation infrastructure yet) doesn't justify a real
// logging library, but a consistent shape costs nothing now and pays off
// the moment one exists.
//
// Error instances in context are serialized to { message, stack } -- plain
// JSON.stringify(new Error()) produces '{}' since Error's own enumerable
// properties don't include message/stack, which would silently throw away
// the most useful part of an error log.
function serializeContext(context) {
  const out = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] = value instanceof Error
      ? { message: value.message, stack: value.stack }
      : value;
  }
  return out;
}

function write(level, message, context) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...serializeContext(context),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

function logInfo(message, context = {}) {
  write('info', message, context);
}

function logError(message, context = {}) {
  write('error', message, context);
}

module.exports = { logInfo, logError };
