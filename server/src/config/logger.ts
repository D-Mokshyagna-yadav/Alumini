/**
 * Logger utility for the server.
 * All levels always print so logs are visible in Coolify / Docker.
 * Client-side console logs are stripped separately by Vite esbuild in production builds.
 */

/* eslint-disable no-console */
const logger = {
  log:     (...args: unknown[]) => { console.log(...args); },
  info:    (...args: unknown[]) => { console.info(...args); },
  debug:   (...args: unknown[]) => { console.debug(...args); },
  warn:    (...args: unknown[]) => { console.warn(...args); },
  error:   (...args: unknown[]) => { console.error(...args); },
  /** Alias kept for backward compat — identical to log */
  startup: (...args: unknown[]) => { console.log(...args); },
};
/* eslint-enable no-console */

export default logger;
