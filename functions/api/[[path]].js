/**
 * Main API router for Cloudflare Pages Functions
 * @module api/router
 */

import { createLogger } from "../utils/logger.js";
import { Errors, handleError } from "../utils/errors.js";
import { validateEnvVars } from "../utils/env.js";
import { requireAdminAuth } from "../utils/auth.js";
import * as donationRoutes from "../routes/donations.js";
import * as adminRoutes from "../routes/admin.js";
import * as disbursementRoutes from "../routes/disbursements.js";

/**
 * CORS headers
 * @type {Object<string, string>}
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Main request handler
 * @param {Object} context - Cloudflare Pages context
 * @param {Request} context.request - HTTP request
 * @param {Object} context.env - Environment variables
 * @returns {Promise<Response>} - HTTP response
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Initialize logger with execution context for waitUntil support
  const logger = createLogger(env, env.SERVICE_NAME || "gdg-donation-api", context);

  // Validate environment variables on first request (in production, this could be cached)
  const envValidation = validateEnvVars(env);
  if (!envValidation.valid) {
    await logger.error("Environment validation failed", null, {
      missing: envValidation.missing,
      errors: envValidation.errors,
    });
    // Don't fail the request, but log the issue
  }

  // Handle OPTIONS requests
  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Generate request ID for tracking
  const requestId = crypto.randomUUID();

  try {
    // Route handling
    let response;

    // Client-side log endpoint (public, for forwarding logs to Grafana)
    if (path === "/api/logs" && method === "POST") {
      response = await handleClientLog(request, env, logger);
    }
    // Grafana config endpoint (public, for client-side logging)
    else if (path === "/api/config/grafana" && method === "GET") {
      response = await handlePublicGrafanaConfig(env, logger);
    }
    // Stats endpoint
    else if (path === "/api/stats" && method === "GET") {
      response = await donationRoutes.handleStats(env, logger);
    }
    // Recent donations endpoint
    else if (path === "/api/donations" && method === "GET") {
      response = await donationRoutes.handleGetDonations(request, env, logger);
    }
    // Create donation endpoint
    else if (path === "/api/donations" && method === "POST") {
      response = await donationRoutes.handleCreateDonation(
        request,
        env,
        logger
      );
    }
    // Get disbursements endpoint (public)
    else if (path === "/api/disbursements" && method === "GET") {
      response = await disbursementRoutes.handleGetDisbursementsPublic(
        request,
        env,
        logger
      );
    }
    // Midtrans webhook endpoint
    else if (path === "/api/midtrans/notification" && method === "POST") {
      response = await donationRoutes.handleMidtransWebhook(
        request,
        env,
        logger
      );
    }
    // Admin login endpoint
    else if (path === "/api/admin/login" && method === "POST") {
      response = await adminRoutes.handleAdminLogin(request, env, logger);
    }
    // Get disbursements endpoint (admin)
    else if (path === "/api/admin/disbursements" && method === "GET") {
      response = await disbursementRoutes.handleGetDisbursements(
        request,
        env,
        logger
      );
    }
    // Create disbursement endpoint (admin)
    else if (path === "/api/admin/disbursements" && method === "POST") {
      response = await disbursementRoutes.handleCreateDisbursement(
        request,
        env,
        logger
      );
    }
    // Get or create disbursement activities endpoint (admin)
    else {
      const activitiesMatch = path.match(
        /^\/api\/admin\/disbursements\/(\d+)\/activities$/
      );
      if (activitiesMatch) {
        const disbursementId = parseInt(activitiesMatch[1]);
        if (method === "GET") {
          response =
            await disbursementRoutes.handleGetDisbursementActivities(
              disbursementId,
              request,
              env,
              logger
            );
        } else if (method === "POST") {
          response =
            await disbursementRoutes.handleCreateDisbursementActivity(
              disbursementId,
              request,
              env,
              logger
            );
        } else {
          response = Errors.NOT_FOUND("Endpoint");
        }
      }
      // File upload endpoint (admin)
      else if (path === "/api/admin/upload" && method === "POST") {
        response = await adminRoutes.handleFileUpload(request, env, logger);
      }
      // Grafana config endpoint (admin only, for client-side logging)
      else if (path === "/api/admin/grafana-config" && method === "GET") {
        response = await handleGrafanaConfig(request, env, logger);
      } else {
        response = Errors.NOT_FOUND("Endpoint");
      }
    }

    // Add request ID to response headers
    if (response) {
      const headers = new Headers(response.headers);
      headers.set("X-Request-ID", requestId);
      
      // For JSON responses, add request_id to body
      if (response.headers.get("Content-Type")?.includes("json")) {
        try {
          const clonedResponse = response.clone();
          const body = await clonedResponse.json();
          
          // Handle arrays - don't spread arrays, return as-is with header only
          if (Array.isArray(body)) {
            return new Response(JSON.stringify(body), {
              status: response.status,
              headers: headers,
            });
          }
          
          // For objects, add request_id
          return new Response(
            JSON.stringify({ ...body, request_id: requestId }),
            {
              status: response.status,
              headers: headers,
            }
          );
        } catch (e) {
          // If JSON parsing fails, just add header
          return new Response(response.body, {
            status: response.status,
            headers: headers,
          });
        }
      }
      
      // For non-JSON responses, just add header
      return new Response(response.body, {
        status: response.status,
        headers: headers,
      });
    }

    return Errors.NOT_FOUND("Endpoint");
  } catch (error) {
    await logger.error("Unhandled API error", error, {
      path,
      method,
      request_id: requestId,
    });
    return handleError(error, logger, requestId);
  }
}

/**
 * Get Grafana config for client-side logging (admin only)
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
async function handleGrafanaConfig(request, env, logger) {
  const db = env.DB;

  // Check authentication
  const auth = await requireAdminAuth(request, db);
  if (!auth.authorized) {
    return Errors.UNAUTHORIZED();
  }

  // Return whether logging is enabled (no credentials needed, logs go through backend)
  const config = {
    enabled: !!(env.GRAFANA_OTLP_ENDPOINT && env.GRAFANA_OTLP_AUTH),
  };

  return new Response(JSON.stringify(config), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Get Grafana config for public client-side logging
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
async function handlePublicGrafanaConfig(env, logger) {
  // Return whether logging is enabled (no credentials needed, logs go through backend)
  const config = {
    enabled: !!(env.GRAFANA_OTLP_ENDPOINT && env.GRAFANA_OTLP_AUTH),
  };

  return new Response(JSON.stringify(config), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Handle client-side log entries and forward to Grafana
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
async function handleClientLog(request, env, logger) {
  try {
    const body = await request.json();
    const { level, message, context = {}, error = null, serviceName = "gdg-donation-frontend", source = "public-frontend" } = body;

    if (!level || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: level, message" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Forward log to Grafana using backend logger
    // The backend logger handles the actual Grafana communication
    const logContext = {
      ...context,
      source,
      clientServiceName: serviceName,
    };

    // Use the appropriate logger method based on level
    switch (level.toLowerCase()) {
      case "debug":
        await logger.debug(message, logContext);
        break;
      case "info":
        await logger.info(message, logContext);
        break;
      case "warn":
        await logger.warn(message, logContext);
        break;
      case "error":
      case "fatal":
        // Create error object if error details provided
        const errorObj = error ? new Error(error.message || message) : null;
        if (errorObj && error.stack) {
          errorObj.stack = error.stack;
        }
        if (level.toLowerCase() === "fatal") {
          await logger.fatal(message, errorObj, logContext);
        } else {
          await logger.error(message, errorObj, logContext);
        }
        break;
      default:
        await logger.info(message, logContext);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    // Silently fail - don't break the app if logging fails
    return new Response(JSON.stringify({ success: false, error: "Failed to process log" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
