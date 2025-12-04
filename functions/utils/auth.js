/**
 * Authentication utilities
 * @module utils/auth
 */

/**
 * Verify admin token from database
 * @param {string} token - Admin session token
 * @param {Object} db - D1 database instance
 * @returns {Promise<boolean>} - True if token is valid, false otherwise
 */
export async function verifyAdminToken(token, db) {
  if (!token || !db) {
    return false;
  }

  try {
    const session = await db
      .prepare(
        'SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime("now")'
      )
      .bind(token)
      .first();

    return !!session;
  } catch (error) {
    console.error("Error verifying admin token:", error);
    return false;
  }
}

/**
 * Extract bearer token from Authorization header
 * @param {Request} request - HTTP request object
 * @returns {string|null} - Token if present, null otherwise
 */
export function extractBearerToken(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.replace("Bearer ", "");
}

/**
 * Middleware to require admin authentication
 * @param {Request} request - HTTP request object
 * @param {Object} db - D1 database instance
 * @returns {Promise<{authorized: boolean, token: string|null}>} - Auth result
 */
export async function requireAdminAuth(request, db) {
  const token = extractBearerToken(request);

  if (!token) {
    return { authorized: false, token: null };
  }

  const isValid = await verifyAdminToken(token, db);
  return { authorized: isValid, token: isValid ? token : null };
}

