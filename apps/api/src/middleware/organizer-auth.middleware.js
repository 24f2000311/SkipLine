import AppError from "../shared/errors/AppError.js";
import { verifyAccessToken } from "../modules/auth/auth.utils.js";
import { authRepository } from "../modules/auth/auth.repository.js";

/**
 * Middleware to authenticate an organizer User using a JWT Access Token.
 * Expects header 'Authorization: Bearer <accessToken>'.
 */
export const authenticateOrganizer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Unauthorized: Missing or malformed Bearer authorization token",
        401,
        "UNAUTHORIZED"
      );
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new AppError("Unauthorized: Token string is empty", 401, "UNAUTHORIZED");
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new AppError("Access token expired", 401, "TOKEN_EXPIRED");
      }
      throw new AppError("Invalid access token", 401, "INVALID_TOKEN");
    }

    const user = await authRepository.findUserById(decoded.id);

    if (!user || user.status !== "ACTIVE") {
      throw new AppError(
        "Unauthorized: User account is inactive or no longer exists",
        401,
        "UNAUTHORIZED"
      );
    }

    // Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
