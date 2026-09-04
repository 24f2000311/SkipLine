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

export const registerOrganizer = async ({ name, email, password, phone }) => {
  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", 400, "MISSING_REQUIRED_FIELDS");
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters long", 400, "WEAK_PASSWORD");
  }

  const existingUser = await authRepository.findUserByEmail(email);
  if (existingUser) {
    throw new AppError("User with this email already exists", 409, "EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(password);

  const user = await authRepository.createUser({
    name,
    email,
    passwordHash,
    phone,
  });

  const tokens = await issueTokenPair(user);

  return {
    user,
    tokens,
  };
};

export const loginOrganizer = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError("Email and password are required", 400, "MISSING_REQUIRED_FIELDS");
  }

  const user = await authRepository.findUserByEmail(email);
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
