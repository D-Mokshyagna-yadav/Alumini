/**
 * Logger utility – only emits log / info / warn / debug in development.
 * console.error and startup are ALWAYS printed regardless of environment.
 */
const isDev = process.env.NODE_ENV !== 'production';

/* eslint-disable no-console */
const logger = {
  log:   (...args: unknown[]) => { if (isDev) console.log(...args); },
  info:  (...args: unknown[]) => { if (isDev) console.info(...args); },
  debug: (...args: unknown[]) => { if (isDev) console.debug(...args); },
  warn:  (...args: unknown[]) => { if (isDev) console.warn(...args); },
  /** Errors are always printed */
  error: (...args: unknown[]) => { console.error(...args); },
  /** Critical startup / lifecycle messages — always printed even in production */
  startup: (...args: unknown[]) => { console.log(...args); },
};
/* eslint-enable no-console */

export default logger;
