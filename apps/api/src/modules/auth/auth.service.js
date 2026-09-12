import AppError from "../../shared/errors/AppError.js";
import { authRepository } from "./auth.repository.js";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "./auth.utils.js";
import { AUTH_CONSTANTS } from "./auth.constants.js";

/**
 * Helper to issue access and refresh tokens for a user.
 */
const issueTokenPair = async (user) => {
  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_DAYS);

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
  };
};

import prisma from "../../infrastructure/database/prisma.js";
import { emailService } from "../../infrastructure/email/email.service.js";
import { emailConfig } from "../../infrastructure/email/email.config.js";
import {
  generateAuthToken,
  hashAuthToken,
} from "./auth.utils.js";

export const registerOrganizer = async ({ name, email, password, phone }) => {
  const cleanEmail = email ? String(email).trim().toLowerCase() : "";
  const cleanName = name ? String(name).trim() : "";

  if (!cleanName || !cleanEmail || !password) {
    throw new AppError("Name, email, and password are required", 400, "MISSING_REQUIRED_FIELDS");
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters long", 400, "WEAK_PASSWORD");
  }

  const existingUser = await authRepository.findUserByEmail(cleanEmail);
  if (existingUser) {
    throw new AppError("User with this email already exists", 409, "EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(password);

  // Generate verification token
  const rawVerificationToken = generateAuthToken("sk_verify");
  const tokenHash = hashAuthToken(rawVerificationToken);

  const verificationExpiresAt = new Date();
  verificationExpiresAt.setMinutes(
    verificationExpiresAt.getMinutes() + emailConfig.verificationTokenTtlMinutes
  );

  // Transaction: Create user, store hashed verification token
  const { user, authToken } = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        phone: phone ? String(phone).trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    const tokenRecord = await authRepository.createAuthToken(
      {
        userId: createdUser.id,
        type: "EMAIL_VERIFICATION",
        tokenHash,
        expiresAt: verificationExpiresAt,
      },
      tx
    );

    return { user: createdUser, authToken: tokenRecord };
  });

  // Issue session token pair (preserves existing login-on-register contract)
  const tokens = await issueTokenPair(user);

  // AFTER DB COMMIT: Dispatch verification email (fault-tolerant, never rolls back registration)
  await emailService.sendVerificationEmail(user, rawVerificationToken, authToken.id);

  return {
    user,
    tokens,
  };
};

/**
 * Validates an email verification token and marks emailVerifiedAt.
 * @param {string} rawToken
 * @returns {Promise<{ message: string }>}
 */
export const verifyEmail = async (rawToken) => {
  if (!rawToken || typeof rawToken !== "string") {
    throw new AppError("Verification token is required", 400, "MISSING_VERIFICATION_TOKEN");
  }

  const tokenHash = hashAuthToken(rawToken.trim());
  const tokenRecord = await authRepository.findAuthTokenByHash(tokenHash, "EMAIL_VERIFICATION");

  if (!tokenRecord || tokenRecord.usedAt !== null) {
    throw new AppError(
      "Invalid or already used verification token",
      400,
      "INVALID_VERIFICATION_TOKEN"
    );
  }

  if (new Date() > tokenRecord.expiresAt) {
    throw new AppError(
      "Verification token has expired. Please request a new verification email.",
      400,
      "EXPIRED_VERIFICATION_TOKEN"
    );
  }

  // Atomically mark token as used and user email as verified
  let updatedUser;
  await prisma.$transaction(async (tx) => {
    await authRepository.markAuthTokenUsed(tokenRecord.id, tx);
    updatedUser = await authRepository.markUserEmailVerified(tokenRecord.userId, tx);
  });

  // AFTER COMMIT: Send welcome email
  await emailService.sendWelcomeEmail(tokenRecord.user);

  return {
    message: "Email verified successfully",
    user: updatedUser,
  };
};


/**
 * Re-issues a verification token and dispatches a fresh verification email.
 * @param {string} email
 * @returns {Promise<{ message: string }>}
 */
export const resendVerification = async (email) => {
  const genericMessage =
    "If an account with that email exists and is unverified, a verification link has been sent.";

  const cleanEmail = email ? String(email).trim().toLowerCase() : "";
  if (!cleanEmail) {
    throw new AppError("Email is required", 400, "MISSING_EMAIL");
  }

  const user = await authRepository.findUserByEmail(cleanEmail);
  if (!user || user.emailVerifiedAt !== null || user.status !== "ACTIVE") {
    // Return generic message to prevent account enumeration
    return { message: genericMessage };
  }

  const rawVerificationToken = generateAuthToken("sk_verify");
  const tokenHash = hashAuthToken(rawVerificationToken);

  const verificationExpiresAt = new Date();
  verificationExpiresAt.setMinutes(
    verificationExpiresAt.getMinutes() + emailConfig.verificationTokenTtlMinutes
  );

  let newAuthToken;
  await prisma.$transaction(async (tx) => {
    // Invalidate previous verification tokens
    await authRepository.invalidateActiveAuthTokens(user.id, "EMAIL_VERIFICATION", tx);

    newAuthToken = await authRepository.createAuthToken(
      {
        userId: user.id,
        type: "EMAIL_VERIFICATION",
        tokenHash,
        expiresAt: verificationExpiresAt,
      },
      tx
    );
  });

  // AFTER COMMIT: Dispatch verification email
  if (newAuthToken) {
    await emailService.sendVerificationEmail(user, rawVerificationToken, newAuthToken.id);
  }

  return { message: genericMessage };
};

/**
 * Initiates forgot password flow with anti-enumeration response.
 * @param {string} email
 * @returns {Promise<{ message: string }>}
 */
export const forgotPassword = async (email) => {
  const genericMessage =
    "If an account with that email exists, a password reset link has been sent.";

  const cleanEmail = email ? String(email).trim().toLowerCase() : "";
  if (!cleanEmail) {
    throw new AppError("Email is required", 400, "MISSING_EMAIL");
  }

  const user = await authRepository.findUserByEmail(cleanEmail);
  if (!user || user.status !== "ACTIVE") {
    // Prevent account enumeration
    return { message: genericMessage };
  }

  const rawResetToken = generateAuthToken("sk_reset");
  const tokenHash = hashAuthToken(rawResetToken);

  const resetExpiresAt = new Date();
  resetExpiresAt.setMinutes(
    resetExpiresAt.getMinutes() + emailConfig.resetTokenTtlMinutes
  );

  let newAuthToken;
  await prisma.$transaction(async (tx) => {
    // Invalidate any previously active password reset tokens
    await authRepository.invalidateActiveAuthTokens(user.id, "PASSWORD_RESET", tx);

    newAuthToken = await authRepository.createAuthToken(
      {
        userId: user.id,
        type: "PASSWORD_RESET",
        tokenHash,
        expiresAt: resetExpiresAt,
      },
      tx
    );
  });

  // AFTER COMMIT: Dispatch reset email
  if (newAuthToken) {
    await emailService.sendPasswordResetEmail(user, rawResetToken, newAuthToken.id);
  }

  return { message: genericMessage };
};

/**
 * Resets user password using a single-use reset token and revokes all refresh tokens.
 * @param {object} params
 * @param {string} params.token
 * @param {string} params.password
 * @returns {Promise<{ message: string }>}
 */
export const resetPassword = async ({ token, password }) => {
  if (!token || !password) {
    throw new AppError("Token and password are required", 400, "MISSING_REQUIRED_FIELDS");
  }

  if (String(password).length < 8) {
    throw new AppError("Password must be at least 8 characters long", 400, "WEAK_PASSWORD");
  }

  const tokenHash = hashAuthToken(token.trim());
  const tokenRecord = await authRepository.findAuthTokenByHash(tokenHash, "PASSWORD_RESET");

  if (!tokenRecord || tokenRecord.usedAt !== null) {
    throw new AppError(
      "Invalid or already used password reset token",
      400,
      "INVALID_RESET_TOKEN"
    );
  }

  if (new Date() > tokenRecord.expiresAt) {
    throw new AppError(
      "Password reset token has expired. Please request a new reset link.",
      400,
      "EXPIRED_RESET_TOKEN"
    );
  }

  const newPasswordHash = await hashPassword(password);
  const passwordChangeEventId = Date.now().toString();

  await prisma.$transaction(async (tx) => {
    // 1. Update password
    await authRepository.updateUserPassword(tokenRecord.userId, newPasswordHash, tx);

    // 2. Mark this token as used
    await authRepository.markAuthTokenUsed(tokenRecord.id, tx);

    // 3. Invalidate ALL remaining active PASSWORD_RESET tokens for this user
    await authRepository.invalidateActiveAuthTokens(tokenRecord.userId, "PASSWORD_RESET", tx);

    // 4. Revoke all refresh tokens for this user to enforce fresh login
    await authRepository.deleteAllUserRefreshTokens(tokenRecord.userId, tx);
  });

  // AFTER COMMIT: Send security alert email
  await emailService.sendPasswordChangedEmail(tokenRecord.user, passwordChangeEventId);

  return {
    message: "Password reset successful. Please sign in with your new password.",
  };
};

export const loginOrganizer = async ({ email, password }) => {
  const cleanEmail = email ? String(email).trim().toLowerCase() : "";

  if (!cleanEmail || !password) {
    throw new AppError("Email and password are required", 400, "MISSING_REQUIRED_FIELDS");
  }

  const user = await authRepository.findUserByEmail(cleanEmail);
  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(`Account is currently '${user.status}'`, 403, "ACCOUNT_DISABLED");
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  await authRepository.updateLastLogin(user.id);
  const tokens = await issueTokenPair(user);

  const { passwordHash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    tokens,
  };
};

export const refreshTokens = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    throw new AppError("Refresh token is required", 400, "MISSING_REFRESH_TOKEN");
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const storedToken = await authRepository.findRefreshToken(tokenHash);

  if (!storedToken) {
    throw new AppError("Invalid or revoked refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  if (new Date() > storedToken.expiresAt) {
    await authRepository.deleteRefreshToken(tokenHash);
    throw new AppError("Refresh token has expired", 401, "EXPIRED_REFRESH_TOKEN");
  }

  if (storedToken.user.status !== "ACTIVE") {
    throw new AppError("Associated user account is disabled", 403, "ACCOUNT_DISABLED");
  }

  // Revoke old refresh token (token rotation) and issue new token pair
  await authRepository.deleteRefreshToken(tokenHash);
  const tokens = await issueTokenPair(storedToken.user);

  return tokens;
};

export const logoutOrganizer = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    return;
  }
  const tokenHash = hashRefreshToken(rawRefreshToken);
  await authRepository.deleteRefreshToken(tokenHash);
};

export const getOrganizerProfile = async (userId) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }
  return user;
};

import logger from "../../infrastructure/logger/logger.js";
import { cleanupOrganizerWebSockets } from "../../infrastructure/websocket/websocket.server.js";

/**
 * Permanently deletes an organizer account and all owned resources:
 * Events, Queues, QueueEntries, RefreshTokens, AuthTokens, User.
 * Requires recent-password confirmation to guard against unauthorized or accidental deletion.
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.password
 * @param {string} [params.requestId]
 * @returns {Promise<{ success: boolean }>}
 */
export const deleteAccount = async ({ userId, password, requestId }) => {
  const startTime = Date.now();

  if (!userId) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }

  // 1. Fetch user to verify identity and retrieve password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  // 2. Validate password presence
  if (!password || typeof password !== "string") {
    throw new AppError("Password is required to confirm account deletion", 400, "PASSWORD_REQUIRED");
  }

  // 3. Re-authenticate password
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError("Incorrect password", 401, "INVALID_CREDENTIALS");
  }

  // 4. Atomically delete account and all owned data in database transaction
  const { deletedQueueIds } = await authRepository.deleteAccountTransaction(userId);

  // 5. Clean up any active WebSocket connections and queue subscriptions
  try {
    cleanupOrganizerWebSockets(userId, deletedQueueIds);
  } catch (wsErr) {
    logger.warn({ requestId, userId, error: wsErr.message }, "Non-fatal error cleaning up WebSockets during account deletion");
  }

  const durationMs = Date.now() - startTime;
  logger.info(
    {
      requestId,
      userId,
      operation: "ACCOUNT_DELETION",
      status: "SUCCESS",
      durationMs,
    },
    "Organizer account and all owned data permanently deleted"
  );

  return { success: true };
};

