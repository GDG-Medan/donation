/**
 * Validation and sanitization utilities for security
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }

  // RFC 5322 compliant email regex (simplified but effective)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Check length (max 254 characters per RFC 5321)
  if (email.length > 254) {
    return false;
  }

  return emailRegex.test(email);
}

/**
 * Validate Indonesian phone number format
 * Supports formats:
 * - 08xx-xxxx-xxxx
 * - 08xx xxxx xxxx
 * - +628xxxxxxxxxx
 * - 628xxxxxxxxxx
 * - 08xxxxxxxxxx
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== "string") {
    return false;
  }

  // Remove spaces, dashes, and plus signs for validation
  const cleaned = phone.replace(/[\s\-+]/g, "");

  // Indonesian phone number patterns:
  // - Starts with 08 (mobile) or 62 (country code)
  // - Total length: 10-13 digits (08xx = 10, 62xx = 12-13)
  // - Mobile numbers: 08xx (10 digits) or 628xx (12 digits)
  const phoneRegex = /^(62|0)[0-9]{9,12}$/;

  if (!phoneRegex.test(cleaned)) {
    return false;
  }

  // Additional check: if starts with 62, should be followed by 8 (mobile)
  if (cleaned.startsWith("62") && cleaned.length >= 3) {
    if (cleaned[2] !== "8") {
      return false;
    }
  }

  // If starts with 0, should be followed by 8 (mobile)
  if (cleaned.startsWith("0") && cleaned.length >= 2) {
    if (cleaned[1] !== "8") {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all HTML tags and escapes special characters
 * @param {string} input - String that may contain HTML
 * @returns {string} - Sanitized string safe for display
 */
export function sanitizeHtml(input) {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Remove all HTML tags
  let sanitized = input.replace(/<[^>]*>/g, "");

  // Escape HTML special characters
  const htmlEscapes = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  sanitized = sanitized.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);

  // Limit length to prevent DoS (max 5000 characters)
  if (sanitized.length > 5000) {
    sanitized = sanitized.substring(0, 5000);
  }

  return sanitized.trim();
}

/**
 * Sanitize text input (remove control characters and limit length)
 * @param {string} input - Text input to sanitize
 * @param {number} maxLength - Maximum length (default: 255)
 * @returns {string} - Sanitized string
 */
export function sanitizeText(input, maxLength = 255) {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Remove control characters except newlines, tabs, and carriage returns
  let sanitized = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized.trim();
}

/**
 * Validate donation amount
 * @param {number} amount - Donation amount
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidDonationAmount(amount) {
  if (typeof amount !== "number" || isNaN(amount)) {
    return false;
  }

  // Minimum 10,000 (as per business rule)
  if (amount < 10000) {
    return false;
  }

  // Maximum 1 billion to prevent overflow
  if (amount > 1000000000) {
    return false;
  }

  return true;
}

