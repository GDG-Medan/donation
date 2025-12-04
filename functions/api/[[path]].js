/**
 * Main API router for Cloudflare Pages Functions
 * @module api/router
 */

import { createLogger } from "../utils/logger.js";
import { Errors, handleError } from "../utils/errors.js";
import { validateEnvVars } from "../utils/env.js";
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

  // Initialize logger
  const logger = createLogger(env, env.SERVICE_NAME || "gdg-donation-api");

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

    // Stats endpoint
    if (path === "/api/stats" && method === "GET") {
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
