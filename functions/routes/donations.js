/**
 * Donation-related API routes
 * @module routes/donations
 */

import {
  isValidEmail,
  isValidPhone,
  sanitizeHtml,
  sanitizeText,
  isValidDonationAmount,
} from "../utils/validation.js";
import { Errors, handleError } from "../utils/errors.js";
import { createLogger } from "../utils/logger.js";

/**
 * Get donation statistics
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleStats(env, logger) {
  const db = env.DB;

  try {
    // Get total raised (only successful donations)
    const totalRaisedResult = await db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE status = ?"
      )
      .bind("success")
      .first();

    // Get total disbursed
    const totalDisbursedResult = await db
      .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM disbursements")
      .first();

    // Get donor count (only successful donations)
    const donorCountResult = await db
      .prepare("SELECT COUNT(*) as count FROM donations WHERE status = ?")
      .bind("success")
      .first();

    if (logger) {
      await logger.info("Stats retrieved successfully", {
        totalRaised: totalRaisedResult?.total || 0,
        totalDisbursed: totalDisbursedResult?.total || 0,
        donorCount: donorCountResult?.count || 0,
      });
    }

    return new Response(
      JSON.stringify({
        total_raised: totalRaisedResult?.total || 0,
        total_disbursed: totalDisbursedResult?.total || 0,
        donor_count: donorCountResult?.count || 0,
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
      await logger.error("Failed to get stats", error);
    }
    return handleError(error, logger);
  }
}

/**
 * Get recent donations with pagination
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleGetDonations(request, env, logger) {
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
      .prepare("SELECT COUNT(*) as total FROM donations WHERE status = ?")
      .bind("success")
      .first();

    const totalCount = countResult?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get paginated donations
    const donations = await db
      .prepare(
        `SELECT name, email, phone, amount, message, anonymous, created_at 
         FROM donations 
         WHERE status = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`
      )
      .bind("success", limit, offset)
      .all();

    // Hide sensitive user data
    const sanitizedDonations = (donations.results || []).map((donation) => {
      const sanitized = {
        amount: donation.amount,
        created_at: donation.created_at,
      };

      // Show name only if not anonymous
      if (donation.anonymous) {
        sanitized.name = "Donatur Anonim";
      } else {
        sanitized.name = donation.name;
      }

      // Include message if provided
      if (donation.message) {
        sanitized.message = donation.message;
      }

      return sanitized;
    });

    return new Response(
      JSON.stringify({
        donations: sanitizedDonations,
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
      await logger.error("Failed to get donations", error, {
        url: request.url,
      });
    }
    return handleError(error, logger);
  }
}

/**
 * Create Midtrans transaction
 * @param {string} orderId - Order ID
 * @param {number} amount - Transaction amount
 * @param {string} customerName - Customer name
 * @param {string} customerEmail - Customer email
 * @param {string} origin - Origin URL
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object|null>} - Midtrans response or null on error
 */
async function createMidtransTransaction(
  orderId,
  amount,
  customerName,
  customerEmail,
  origin,
  env,
  logger
) {
  const serverKey = env.MIDTRANS_SERVER_KEY;
  const isProduction = serverKey && !serverKey.includes("SB-My");

  const midtransUrl = isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const transactionDetails = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: {
      first_name: customerName,
      email: customerEmail,
    },
    callbacks: {
      finish: `${origin}/`,
      error: `${origin}/`,
    },
  };

  try {
    const response = await fetch(midtransUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${btoa(serverKey + ":")}`,
      },
      body: JSON.stringify(transactionDetails),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (logger) {
        await logger.error("Midtrans API error", null, {
          orderId,
          status: response.status,
          error: errorText,
        });
      }
      return null;
    }

    const result = await response.json();
    if (logger) {
      await logger.info("Midtrans transaction created", {
        orderId,
        amount,
      });
    }
    return result;
  } catch (error) {
    if (logger) {
      await logger.error("Midtrans request failed", error, { orderId });
    }
    return null;
  }
}

/**
 * Create donation and initiate Midtrans payment
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleCreateDonation(request, env, logger) {
  const db = env.DB;

  try {
    // Donations are closed
    return Errors.VALIDATION_ERROR(
      "Donasi saat ini ditutup. Terima kasih atas dukungan Anda."
    );

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.email || !data.amount) {
      return Errors.MISSING_REQUIRED_FIELD("name, email, or amount");
    }

    // Validate email format
    if (!isValidEmail(data.email)) {
      return Errors.VALIDATION_ERROR("Invalid email format");
    }

    // Validate phone number if provided
    if (data.phone && !isValidPhone(data.phone)) {
      return Errors.VALIDATION_ERROR("Invalid phone number format");
    }

    // Validate donation amount
    if (!isValidDonationAmount(data.amount)) {
      return Errors.VALIDATION_ERROR(
        "Amount must be between Rp 10,000 and Rp 1,000,000,000"
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeText(data.name, 255);
    const sanitizedEmail = data.email.trim().toLowerCase();
    const sanitizedPhone = data.phone ? sanitizeText(data.phone, 20) : null;
    const sanitizedMessage = data.message ? sanitizeHtml(data.message) : null;

    // Calculate fee (0.7%) and total amount
    const donationAmount = parseInt(data.amount);
    const fee = Math.ceil(donationAmount * 0.007);
    const totalAmount = donationAmount + fee;

    // Insert donation record
    const result = await db
      .prepare(
        `INSERT INTO donations (name, email, phone, amount, message, anonymous, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        sanitizedName,
        sanitizedEmail,
        sanitizedPhone,
        donationAmount,
        sanitizedMessage,
        data.anonymous ? 1 : 0,
        "pending"
      )
      .run();

    const donationId = result.meta.last_row_id;
    const orderId = `DONATION-${donationId}-${Date.now()}`;

    // Update with order ID
    await db
      .prepare("UPDATE donations SET midtrans_order_id = ? WHERE id = ?")
      .bind(orderId, donationId)
      .run();

    // Create Midtrans transaction
    const origin = new URL(request.url).origin;
    const midtransResponse = await createMidtransTransaction(
      orderId,
      totalAmount,
      sanitizedName,
      sanitizedEmail,
      origin,
      env,
      logger
    );

    if (!midtransResponse || !midtransResponse.token) {
      // Update donation status to failed
      await db
        .prepare("UPDATE donations SET status = ? WHERE id = ?")
        .bind("failed", donationId)
        .run();

      if (logger) {
        await logger.error("Payment initialization failed", null, {
          donationId,
          orderId,
        });
      }

      return Errors.EXTERNAL_SERVICE_ERROR(
        "Midtrans",
        "Payment initialization failed"
      );
    }

    if (logger) {
      await logger.info("Donation created successfully", {
        donationId,
        orderId,
        amount: donationAmount,
      });
    }

    return new Response(
      JSON.stringify({
        donation_id: donationId,
        order_id: orderId,
        payment_url:
          midtransResponse.redirect_url ||
          `https://app.sandbox.midtrans.com/snap/v2/vtweb/${midtransResponse.token}`,
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
      await logger.error("Failed to create donation", error);
    }
    return handleError(error, logger);
  }
}

/**
 * Handle Midtrans webhook notification
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleMidtransWebhook(request, env, logger) {
  const db = env.DB;

  try {
    const notification = await request.json();

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    // Verify the notification (in production, verify signature)
    if (fraudStatus === "accept") {
      if (
        transactionStatus === "capture" ||
        transactionStatus === "settlement"
      ) {
        // Payment successful
        await db
          .prepare("UPDATE donations SET status = ? WHERE midtrans_order_id = ?")
          .bind("success", orderId)
          .run();

        if (logger) {
          await logger.info("Payment successful", {
            orderId,
            transactionStatus,
          });
        }
      } else if (
        transactionStatus === "cancel" ||
        transactionStatus === "deny" ||
        transactionStatus === "expire"
      ) {
        // Payment failed
        await db
          .prepare("UPDATE donations SET status = ? WHERE midtrans_order_id = ?")
          .bind("failed", orderId)
          .run();

        if (logger) {
          await logger.warn("Payment failed", {
            orderId,
            transactionStatus,
          });
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    if (logger) {
      await logger.error("Midtrans webhook processing failed", error);
    }
    // Still return OK to prevent Midtrans from retrying
    return new Response("OK", { status: 200 });
  }
}

