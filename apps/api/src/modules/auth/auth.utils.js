import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "../../config/env.js";
import { AUTH_CONSTANTS } from "./auth.constants.js";

/**
 * Hashes a plain password using bcrypt.
 * @param {string} password
 * @returns {Promise<string>}
 */
export const hashPassword = async (password) => {
  return bcrypt.hash(password, AUTH_CONSTANTS.SALT_ROUNDS);
};

/**
 * Compares a plain password with a stored hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Generates a short-lived JWT access token for an authenticated organizer.
 * @param {object} user - User object containing id and email.
 * @returns {string} Signed JWT.
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    env.jwtSecret,
    {
      expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY,
    }
  );
};

/**
 * Verifies and decodes a JWT access token.
 * @param {string} token
 * @returns {object} Decoded JWT payload.
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};

/**
 * Generates a high-entropy random refresh token string.
 * @returns {string} Raw refresh token.
 */
export const generateRefreshToken = () => {
  return `sk_ref_${crypto.randomBytes(32).toString("hex")}`;
};

/**
 * Computes a SHA-256 hash of a raw refresh token for database storage.
 * @param {string} rawToken
 * @returns {string} SHA-256 hash string.
 */
export const hashRefreshToken = (rawToken) => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};
