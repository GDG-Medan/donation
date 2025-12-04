/**
 * Environment variable validation and management
 * @module utils/env
 */

/**
 * Required environment variables configuration
 * @type {Array<{name: string, description: string, required: boolean, default?: string}>}
 */
export const REQUIRED_ENV_VARS = [
  {
    name: "MIDTRANS_SERVER_KEY",
    description: "Midtrans server key for payment processing",
    required: true,
  },
  {
    name: "ADMIN_PASSWORD_HASH",
    description: "Admin password hash for authentication",
    required: true,
  },
  {
    name: "DB",
    description: "D1 database binding",
    required: true,
  },
];

/**
 * Optional environment variables configuration
 * @type {Array<{name: string, description: string, default?: string}>}
 */
export const OPTIONAL_ENV_VARS = [
  {
    name: "MIDTRANS_CLIENT_KEY",
    description: "Midtrans client key (for frontend if needed)",
    default: undefined,
  },
  {
    name: "GRAFANA_OTLP_ENDPOINT",
    description: "Grafana.net OTLP endpoint URL for logging",
    default: undefined,
  },
  {
    name: "GRAFANA_OTLP_AUTH",
    description: "Grafana.net OTLP authentication token (Base64 encoded)",
    default: undefined,
  },
  {
    name: "SERVICE_NAME",
    description: "Service name for logging and monitoring",
    default: "gdg-donation-api",
  },
  {
    name: "SERVICE_VERSION",
    description: "Service version for logging",
    default: "1.0.0",
  },
  {
    name: "ENVIRONMENT",
    description: "Environment name (development, staging, production)",
    default: "production",
  },
  {
    name: "R2_PUBLIC_DOMAIN",
    description: "Custom domain for R2 public files",
    default: undefined,
  },
  {
    name: "SITE_URL",
    description: "Site URL for callbacks and redirects",
    default: undefined,
  },
];

/**
 * Validate required environment variables
 * @param {Object} env - Environment object
 * @returns {{valid: boolean, missing: string[], errors: string[]}} - Validation result
 */
export function validateEnvVars(env) {
  const missing = [];
  const errors = [];

  // Check required variables
  for (const config of REQUIRED_ENV_VARS) {
    if (config.required && !env[config.name]) {
      missing.push(config.name);
    }
  }

  // Validate specific variables
  if (env.MIDTRANS_SERVER_KEY && !env.MIDTRANS_SERVER_KEY.startsWith("Mid-server-")) {
    errors.push(
      "MIDTRANS_SERVER_KEY appears to be invalid (should start with 'Mid-server-')"
    );
  }

  if (env.GRAFANA_OTLP_ENDPOINT && !env.GRAFANA_OTLP_AUTH) {
    errors.push(
      "GRAFANA_OTLP_AUTH is required when GRAFANA_OTLP_ENDPOINT is set"
    );
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}

/**
 * Get environment variable value with fallback
 * @param {Object} env - Environment object
 * @param {string} name - Variable name
 * @param {string} [defaultValue] - Default value
 * @returns {string|undefined} - Variable value or default
 */
export function getEnvVar(env, name, defaultValue) {
  return env[name] || defaultValue;
}

