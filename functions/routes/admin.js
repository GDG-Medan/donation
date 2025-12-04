/**
 * Admin-related API routes
 * @module routes/admin
 */

import { requireAdminAuth } from "../utils/auth.js";
import { Errors, handleError } from "../utils/errors.js";
import { sanitizeText } from "../utils/validation.js";

/**
 * Admin login endpoint
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleAdminLogin(request, env, logger) {
  const db = env.DB;

  try {
    const { password } = await request.json();

    if (!password) {
      return Errors.MISSING_REQUIRED_FIELD("password");
    }

    // Simple password check (in production, use proper password hashing like bcrypt)
    const adminPassword = env.ADMIN_PASSWORD_HASH;

    if (password !== adminPassword) {
      if (logger) {
        await logger.warn("Failed admin login attempt");
      }
      return Errors.INVALID_CREDENTIALS();
    }

    // Generate session token
    const token = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString(); // 24 hours

    await db
      .prepare("INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)")
      .bind(token, expiresAt)
      .run();

    if (logger) {
      await logger.info("Admin login successful", { token });
    }

    return new Response(
      JSON.stringify({ token, expires_at: expiresAt }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    if (logger) {
      await logger.error("Admin login failed", error);
    }
    return handleError(error, logger);
  }
}

/**
 * Handle file upload to R2 (admin only)
 * @param {Request} request - HTTP request
 * @param {Object} env - Cloudflare environment
 * @param {Object} logger - Logger instance
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleFileUpload(request, env, logger) {
  const db = env.DB;

  // Check authentication
  const auth = await requireAdminAuth(request, db);
  if (!auth.authorized) {
    return Errors.UNAUTHORIZED();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Errors.VALIDATION_ERROR("No file provided");
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return Errors.VALIDATION_ERROR("File size exceeds 10MB limit", {
        maxSize: maxSize,
        fileSize: file.size,
      });
    }

    // Validate file type (images and common document types)
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "video/mp4",
      "video/quicktime",
    ];
    if (!allowedTypes.includes(file.type)) {
      return Errors.VALIDATION_ERROR("File type not allowed", {
        allowedTypes,
        fileType: file.type,
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedOriginalName = sanitizeText(file.name, 255);
    const fileExtension = sanitizedOriginalName.split(".").pop() || "bin";
    // Validate extension is safe (alphanumeric only, max 10 chars)
    const safeExtension = fileExtension
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 10) || "bin";
    const fileName = `activity_${timestamp}_${Math.random()
      .toString(36)
      .substring(7)}.${safeExtension}`;

    // Upload to R2
    const r2Bucket = env.ACTIVITY_FILES;
    if (!r2Bucket) {
      return Errors.INTERNAL_ERROR("R2 bucket not configured");
    }

    const fileBuffer = await file.arrayBuffer();
    await r2Bucket.put(fileName, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000",
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate public URL
    const customDomain = env.R2_PUBLIC_DOMAIN || "files-donasi.gdgmedan.com";
    const fileUrl = `https://${customDomain}/${fileName}`;

    if (logger) {
      await logger.info("File uploaded successfully", {
        fileName,
        fileSize: file.size,
        fileType: file.type,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        file_url: fileUrl,
        file_key: fileName,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
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
      await logger.error("File upload failed", error);
    }
    return handleError(error, logger);
  }
}

