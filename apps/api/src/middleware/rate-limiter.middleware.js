/**
 * In-memory sliding window rate limiter for V1 single-instance deployment.
 * Protects sensitive authentication endpoints (resend verification, forgot password, reset password)
 * against brute-force and request flooding.
 */

const hitRecords = new Map();

/**
 * Creates an Express rate-limiting middleware.
 * @param {object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests allowed in the window
 * @param {string} [options.message] - Error message on limit exceeded
 * @param {string} [options.keyPrefix] - Prefix for cache keys
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 5,
  message = "Too many requests. Please try again later.",
  keyPrefix = "rl",
}) => {
  return (req, res, next) => {
    // In test environment: allow disabling or resetting via header if needed, but still functional
    if (process.env.DISABLE_RATE_LIMITS === "true") {
      return next();
    }

    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
    const identifier = req.body?.email ? String(req.body.email).trim().toLowerCase() : ip;
    const key = `${keyPrefix}:${identifier}`;

    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = hitRecords.get(key) || [];
    // Filter timestamps within current window
    timestamps = timestamps.filter((time) => time > windowStart);

    if (timestamps.length >= max) {
      const oldestInWindow = timestamps[0];
      const retryAfterSec = Math.ceil((oldestInWindow + windowMs - now) / 1000);

      res.set("Retry-After", String(Math.max(retryAfterSec, 1)));
      return res.status(429).json({
        success: false,
        error: {
          message,
          code: "TOO_MANY_REQUESTS",
        },
      });
    }

    timestamps.push(now);
    hitRecords.set(key, timestamps);

    // Periodic sweep: clean keys with no active timestamps
    if (Math.random() < 0.05) {
      for (const [k, v] of hitRecords.entries()) {
        const active = v.filter((t) => t > now - windowMs);
        if (active.length === 0) {
          hitRecords.delete(k);
        } else {
          hitRecords.set(k, active);
        }
      }
    }

    next();
  };
};

/**
 * Clears in-memory rate limiter records (useful in automated tests).
 */
export const resetRateLimits = () => {
  hitRecords.clear();
};
