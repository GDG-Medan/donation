/**
 * Consistent error response format utility
 * @module utils/errors
 */

/**
 * Standard error response structure
 * @typedef {Object} ErrorResponse
 * @property {string} error - Error code/type
 * @property {string} message - Human-readable error message
 * @property {Object} [details] - Additional error details
 * @property {string} [request_id] - Request ID for tracking
 */

/**
 * Create a standardized error response
 * @param {string} error - Error code/type
 * @param {string} message - Human-readable error message
 * @param {Object} [details] - Additional error details
 * @param {number} [statusCode=500] - HTTP status code
 * @param {string} [requestId] - Request ID for tracking
 * @returns {Response} - HTTP response with error
 */
export function createErrorResponse(
  error,
  message,
  details = null,
  statusCode = 500,
  requestId = null
) {
  const response = {
    error,
    message,
  };

  if (details) {
    response.details = details;
  }

  if (requestId) {
    response.request_id = requestId;
  }

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Common error responses
 */
export const Errors = {
  // 400 Bad Request
  INVALID_INPUT: (message, details) =>
    createErrorResponse("INVALID_INPUT", message, details, 400),
  VALIDATION_ERROR: (message, details) =>
    createErrorResponse("VALIDATION_ERROR", message, details, 400),
  MISSING_REQUIRED_FIELD: (field) =>
    createErrorResponse(
      "MISSING_REQUIRED_FIELD",
      `Missing required field: ${field}`,
      { field },
      400
    ),

  // 401 Unauthorized
  UNAUTHORIZED: (message = "Unauthorized access") =>
    createErrorResponse("UNAUTHORIZED", message, null, 401),
  INVALID_CREDENTIALS: () =>
    createErrorResponse("INVALID_CREDENTIALS", "Invalid credentials", null, 401),
  INVALID_TOKEN: () =>
    createErrorResponse("INVALID_TOKEN", "Invalid or expired token", null, 401),

  // 404 Not Found
  NOT_FOUND: (resource) =>
    createErrorResponse(
      "NOT_FOUND",
      `${resource || "Resource"} not found`,
      { resource },
      404
    ),

  // 500 Internal Server Error
  INTERNAL_ERROR: (message = "Internal server error", details) =>
    createErrorResponse("INTERNAL_ERROR", message, details, 500),
  DATABASE_ERROR: (message, details) =>
    createErrorResponse("DATABASE_ERROR", message, details, 500),
  EXTERNAL_SERVICE_ERROR: (service, message, details) =>
    createErrorResponse(
      "EXTERNAL_SERVICE_ERROR",
      `${service} error: ${message}`,
      { service, ...details },
      500
    ),

  // 503 Service Unavailable
  SERVICE_UNAVAILABLE: (message = "Service temporarily unavailable") =>
    createErrorResponse("SERVICE_UNAVAILABLE", message, null, 503),
};

/**
 * Handle and format errors consistently
 * @param {Error} error - Error object
 * @param {Object} logger - Logger instance
 * @param {string} [requestId] - Request ID
 * @returns {Response} - Formatted error response
 */
export function handleError(error, logger, requestId = null) {
  // Log the error
  if (logger) {
    logger.error("Request failed", error, { request_id: requestId });
  }

  // Return appropriate error response
  if (error.name === "ValidationError") {
    return Errors.VALIDATION_ERROR(error.message, error.details);
  }

  if (error.name === "UnauthorizedError") {
    return Errors.UNAUTHORIZED(error.message);
  }

  if (error.name === "NotFoundError") {
    return Errors.NOT_FOUND(error.message);
  }

  // Default to internal error
  return Errors.INTERNAL_ERROR(
    process.env.ENVIRONMENT === "production"
      ? "An unexpected error occurred"
      : error.message,
    process.env.ENVIRONMENT === "production" ? null : { stack: error.stack }
  );
}

