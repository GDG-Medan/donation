/**
 * Disbursement-related API routes
 * @module routes/disbursements
 */

import { requireAdminAuth } from "../utils/auth.js";
import { Errors, handleError } from "../utils/errors.js";
import { sanitizeHtml, sanitizeText } from "../utils/validation.js";

/**
 * Get disbursements (public endpoint)
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleGetDisbursementsPublic(request, env, logger) {
  const db = env.DB;
  const url = new URL(request.url);

  try {
    // Get pagination parameters
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return Errors.VALIDATION_ERROR("Invalid pagination parameters", {
        page,
        limit,
      });
    }

    // Get total count for pagination
    const countResult = await db
      .prepare("SELECT COUNT(*) as total FROM disbursements")
      .first();

    const totalCount = countResult?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get paginated disbursements
    const disbursements = await db
      .prepare(
        `SELECT id, amount, description, created_at 
         FROM disbursements 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all();

    // Get activities for each disbursement
    const disbursementsWithActivities = await Promise.all(
      (disbursements.results || []).map(async (disbursement) => {
        const activities = await db
          .prepare(
            `SELECT id, activity_time, description, file_url, file_name, created_at 
             FROM disbursement_activities 
             WHERE disbursement_id = ? 
             ORDER BY activity_time ASC`
          )
          .bind(disbursement.id)
          .all();

        // Get files for each activity
        const activitiesWithFiles = await Promise.all(
          (activities.results || []).map(async (activity) => {
            const files = await db
              .prepare(
                `SELECT id, file_url, file_name, file_type, created_at 
                 FROM activity_files 
                 WHERE activity_id = ? 
                 ORDER BY created_at ASC`
              )
              .bind(activity.id)
              .all();

            return {
              ...activity,
              files: files.results || [],
            };
          })
        );

        return {
          ...disbursement,
          activities: activitiesWithFiles,
        };
      })
    );

    return new Response(
      JSON.stringify({
        disbursements: disbursementsWithActivities,
        pagination: {
          page: page,
          limit: limit,
          total_count: totalCount,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    if (logger) {
      await logger.error("Failed to get disbursements (public)", error);
    }
    return handleError(error, logger);
  }
}

/**
 * Get disbursements (admin only)
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleGetDisbursements(request, env, logger) {
  const db = env.DB;

  // Check authentication
  const auth = await requireAdminAuth(request, db);
  if (!auth.authorized) {
    return Errors.UNAUTHORIZED();
  }

  try {
    const disbursements = await db
      .prepare("SELECT * FROM disbursements ORDER BY created_at DESC")
      .all();

    // Get activities for each disbursement
    const disbursementsWithActivities = await Promise.all(
      (disbursements.results || []).map(async (disbursement) => {
        const activities = await db
          .prepare(
            `SELECT id, activity_time, description, file_url, file_name, created_at 
             FROM disbursement_activities 
             WHERE disbursement_id = ? 
             ORDER BY activity_time ASC`
          )
          .bind(disbursement.id)
          .all();

        // Get files for each activity
        const activitiesWithFiles = await Promise.all(
          (activities.results || []).map(async (activity) => {
            const files = await db
              .prepare(
                `SELECT id, file_url, file_name, file_type, created_at 
                 FROM activity_files 
                 WHERE activity_id = ? 
                 ORDER BY created_at ASC`
              )
              .bind(activity.id)
              .all();

            return {
              ...activity,
              files: files.results || [],
            };
          })
        );

        return {
          ...disbursement,
          activities: activitiesWithFiles,
        };
      })
    );

    return new Response(JSON.stringify(disbursementsWithActivities), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    if (logger) {
      await logger.error("Failed to get disbursements (admin)", error);
    }
    return handleError(error, logger);
  }
}

/**
 * Create disbursement (admin only)
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleCreateDisbursement(request, env, logger) {
  const db = env.DB;

  // Check authentication
  const auth = await requireAdminAuth(request, db);
  if (!auth.authorized) {
    return Errors.UNAUTHORIZED();
  }

  try {
    const { amount, description } = await request.json();

    if (!amount || !description || amount <= 0) {
      return Errors.VALIDATION_ERROR("Invalid disbursement data", {
        amount,
        description: !!description,
      });
    }

    // Sanitize description to prevent XSS
    const sanitizedDescription = sanitizeHtml(description);

    await db
      .prepare("INSERT INTO disbursements (amount, description) VALUES (?, ?)")
      .bind(amount, sanitizedDescription)
      .run();

    if (logger) {
      await logger.info("Disbursement created", { amount });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    if (logger) {
      await logger.error("Failed to create disbursement", error);
    }
    return handleError(error, logger);
  }
}

/**
 * Get disbursement activities (admin only)
 * @param {number} disbursementId - Disbursement ID
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleGetDisbursementActivities(
  disbursementId,
  request,
  env,
  logger
) {
  const db = env.DB;

  // Check authentication
  const auth = await requireAdminAuth(request, db);
  if (!auth.authorized) {
    return Errors.UNAUTHORIZED();
  }

  try {
    // Verify disbursement exists
    const disbursement = await db
      .prepare("SELECT id FROM disbursements WHERE id = ?")
      .bind(disbursementId)
      .first();

    if (!disbursement) {
      return Errors.NOT_FOUND("Disbursement");
    }

    const activities = await db
      .prepare(
        `SELECT id, activity_time, description, file_url, file_name, created_at 
         FROM disbursement_activities 
         WHERE disbursement_id = ? 
         ORDER BY activity_time ASC`
      )
      .bind(disbursementId)
      .all();

    // Get files for each activity
    const activitiesWithFiles = await Promise.all(
      (activities.results || []).map(async (activity) => {
        const files = await db
          .prepare(
            `SELECT id, file_url, file_name, file_type, created_at 
             FROM activity_files 
             WHERE activity_id = ? 
             ORDER BY created_at ASC`
          )
          .bind(activity.id)
          .all();

        return {
          ...activity,
          files: files.results || [],
        };
      })
    );

    return new Response(JSON.stringify(activitiesWithFiles), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    if (logger) {
      await logger.error("Failed to get disbursement activities", error, {
        disbursementId,
      });
    }
    return handleError(error, logger);
  }
}

/**
 * Create disbursement activity (admin only)
 * @param {number} disbursementId - Disbursement ID
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleCreateDisbursementActivity(
  disbursementId,
  request,
  env,
  logger
) {
  const db = env.DB;

  // Check authentication
  const auth = await requireAdminAuth(request, db);
  if (!auth.authorized) {
    return Errors.UNAUTHORIZED();
  }

  try {
    // Verify disbursement exists
    const disbursement = await db
      .prepare("SELECT id FROM disbursements WHERE id = ?")
      .bind(disbursementId)
      .first();

    if (!disbursement) {
      return Errors.NOT_FOUND("Disbursement");
    }

    const { activity_time, description, files } = await request.json();

    if (!activity_time || !description) {
      return Errors.MISSING_REQUIRED_FIELD("activity_time or description");
    }

    // Sanitize description to prevent XSS
    const sanitizedDescription = sanitizeHtml(description);

    // Create activity
    const result = await db
      .prepare(
        "INSERT INTO disbursement_activities (disbursement_id, activity_time, description) VALUES (?, ?, ?)"
      )
      .bind(disbursementId, activity_time, sanitizedDescription)
      .run();

    const activityId = result.meta.last_row_id;

    // Insert files if provided
    if (files && Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        if (file.file_url && file.file_name) {
          // Sanitize file name and validate URL format
          const sanitizedFileName = sanitizeText(file.file_name, 255);
          const sanitizedFileUrl = sanitizeText(file.file_url, 500);
          const sanitizedFileType = file.file_type
            ? sanitizeText(file.file_type, 50)
            : null;

          await db
            .prepare(
              "INSERT INTO activity_files (activity_id, file_url, file_name, file_type) VALUES (?, ?, ?, ?)"
            )
            .bind(
              activityId,
              sanitizedFileUrl,
              sanitizedFileName,
              sanitizedFileType
            )
            .run();
        }
      }
    }

    if (logger) {
      await logger.info("Disbursement activity created", {
        disbursementId,
        activityId,
      });
    }

    return new Response(
      JSON.stringify({ success: true, activity_id: activityId }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    if (logger) {
      await logger.error("Failed to create disbursement activity", error, {
        disbursementId,
      });
    }
    return handleError(error, logger);
  }
}

