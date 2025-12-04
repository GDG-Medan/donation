/**
 * Structured logging utility for Cloudflare Workers with Grafana.net OTLP integration
 * @module utils/logger
 */

/**
 * Log levels
 * @enum {string}
 */
export const LogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  FATAL: "fatal",
};

/**
 * Send logs to Grafana.net OTLP endpoint
 * @param {Object} options - Logging options
 * @param {string} options.level - Log level
 * @param {string} options.message - Log message
 * @param {Object} [options.context] - Additional context/metadata
 * @param {Error} [options.error] - Error object if logging an error
 * @param {Object} [options.env] - Cloudflare environment object
 * @param {Object} [options.ctx] - Cloudflare execution context (for waitUntil)
 */
async function sendToGrafana({ level, message, context = {}, error, env, ctx }) {
  // Only send to Grafana if credentials are configured
  if (!env?.GRAFANA_OTLP_ENDPOINT || !env?.GRAFANA_OTLP_AUTH) {
    return;
  }

  try {
    const timestamp = Date.now() * 1000000; // Convert to nanoseconds

    const logRecord = {
      timeUnixNano: timestamp.toString(),
      severityNumber: getSeverityNumber(level),
      severityText: level.toUpperCase(),
      body: {
        stringValue: message,
      },
      attributes: [
        {
          key: "log.level",
          value: { stringValue: level },
        },
        {
          key: "service.name",
          value: { stringValue: env.SERVICE_NAME || "gdg-donation-api" },
        },
        {
          key: "environment",
          value: { stringValue: env.ENVIRONMENT || "production" },
        },
      ],
    };

    // Add error details if present
    if (error) {
      logRecord.attributes.push(
        {
          key: "error.type",
          value: { stringValue: error.name || "Error" },
        },
        {
          key: "error.message",
          value: { stringValue: error.message || "" },
        },
        {
          key: "error.stack",
          value: { stringValue: error.stack || "" },
        }
      );
    }

    // Add custom context attributes
    Object.entries(context).forEach(([key, value]) => {
      logRecord.attributes.push({
        key: `context.${key}`,
        value: {
          stringValue: typeof value === "object" ? JSON.stringify(value) : String(value),
        },
      });
    });

    const payload = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              {
                key: "service.name",
                value: { stringValue: env.SERVICE_NAME || "gdg-donation-api" },
              },
              {
                key: "service.version",
                value: { stringValue: env.SERVICE_VERSION || "1.0.0" },
              },
            ],
          },
          scopeLogs: [
            {
              logRecords: [logRecord],
            },
          ],
        },
      ],
    };

    // Send to Grafana.net
    // Use ctx.waitUntil() if available to ensure fetch completes even after response is sent
    const fetchPromise = fetch(env.GRAFANA_OTLP_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${env.GRAFANA_OTLP_AUTH}`,
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      // Silently fail - we don't want logging failures to break the app
      console.error("Failed to send log to Grafana:", err);
    });

    // If we have access to execution context, use waitUntil to keep worker alive
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(fetchPromise);
    }
  } catch (err) {
    // Silently fail - we don't want logging failures to break the app
    console.error("Error in Grafana logger:", err);
  }
}

/**
 * Convert log level to OTLP severity number
 * @param {string} level - Log level
 * @returns {number} - OTLP severity number
 */
function getSeverityNumber(level) {
  const severityMap = {
    debug: 5,
    info: 9,
    warn: 13,
    error: 17,
    fatal: 21,
  };
  return severityMap[level.toLowerCase()] || 9;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  /**
   * Create a new logger instance
   * @param {Object} env - Cloudflare environment object
   * @param {string} [serviceName] - Service name for logging
   * @param {Object} [ctx] - Cloudflare execution context (for waitUntil)
   */
  constructor(env, serviceName = "gdg-donation-api", ctx = null) {
    this.env = env;
    this.serviceName = serviceName;
    this.ctx = ctx;
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  async debug(message, context = {}) {
    console.debug(`[DEBUG] ${message}`, context);
    await sendToGrafana({
      level: LogLevel.DEBUG,
      message,
      context,
      env: this.env,
      ctx: this.ctx,
    });
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  async info(message, context = {}) {
    console.info(`[INFO] ${message}`, context);
    await sendToGrafana({
      level: LogLevel.INFO,
      message,
      context,
      env: this.env,
      ctx: this.ctx,
    });
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  async warn(message, context = {}) {
    console.warn(`[WARN] ${message}`, context);
    await sendToGrafana({
      level: LogLevel.WARN,
      message,
      context,
      env: this.env,
      ctx: this.ctx,
    });
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Error} [error] - Error object
   * @param {Object} [context] - Additional context
   */
  async error(message, error = null, context = {}) {
    console.error(`[ERROR] ${message}`, error, context);
    await sendToGrafana({
      level: LogLevel.ERROR,
      message,
      error: error || new Error(message),
      context,
      env: this.env,
      ctx: this.ctx,
    });
  }

  /**
   * Log a fatal error message
   * @param {string} message - Log message
   * @param {Error} [error] - Error object
   * @param {Object} [context] - Additional context
   */
  async fatal(message, error = null, context = {}) {
    console.error(`[FATAL] ${message}`, error, context);
    await sendToGrafana({
      level: LogLevel.FATAL,
      message,
      error: error || new Error(message),
      context,
      env: this.env,
      ctx: this.ctx,
    });
  }
}

/**
 * Create a logger instance
 * @param {Object} env - Cloudflare environment object
 * @param {string} [serviceName] - Service name
 * @param {Object} [ctx] - Cloudflare execution context (for waitUntil)
 * @returns {Logger} - Logger instance
 */
export function createLogger(env, serviceName, ctx = null) {
  return new Logger(env, serviceName, ctx);
}

