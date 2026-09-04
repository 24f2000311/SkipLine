import crypto from "crypto";

/**
 * Generates a high-entropy secret access token for an anonymous queue entry.
 * @returns {string} Raw access token (e.g. sk_live_...)
 */
export const generateAccessToken = () => {
  const randomHex = crypto.randomBytes(32).toString("hex");
  return `sk_live_${randomHex}`;
};

/**
 * Computes a SHA-256 hash of a raw access token for database storage and verification.
 * @param {string} rawToken
 * @returns {string} SHA-256 hex string
 */
export const hashAccessToken = (rawToken) => {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid raw token provided for hashing");
  }
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

/**
 * Formats a human-readable queue token (e.g. A-042 or V-007).
 * @param {'NORMAL' | 'VIP'} priority
 * @param {number | bigint} sequenceNumber
 * @returns {string}
 */
export const generateHumanToken = (priority, sequenceNumber) => {
  const prefix = priority === "VIP" ? "V" : "A";
  const numStr = String(sequenceNumber).padStart(3, "0");
  return `${prefix}-${numStr}`;
};

/**
 * Builds the verification payload string encoded into the customer's QR credential.
 * @param {string} entryId
 * @param {string} rawToken
 * @param {string} [baseUrl='https://skipline.app']
 * @returns {string}
 */
export const buildQrPayload = (entryId, rawToken, baseUrl = "https://skipline.app") => {
  const params = new URLSearchParams({
    id: entryId,
    key: rawToken,
  });
  return `${baseUrl}/verify?${params.toString()}`;
};
