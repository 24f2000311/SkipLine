import AppError from "../shared/errors/AppError.js";
import { queueEntryRepository } from "../modules/queue-entries/queue-entry.repository.js";
import { hashAccessToken } from "../modules/queue-entries/queue-entry.utils.js";

/**
 * Middleware to authenticate an anonymous customer for operations on a QueueEntry.
 * Expects header 'x-queue-access-token' or 'Authorization: Bearer <token>'.
 */
export const authenticateQueueCustomer = async (req, res, next) => {
  try {
    const entryId = req.params.entryId || req.params.id;

    if (!entryId) {
      throw new AppError("Queue entry ID is required in route params", 400, "MISSING_ENTRY_ID");
    }

    let rawToken = req.headers["x-queue-access-token"];

    if (!rawToken && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        rawToken = authHeader.slice(7).trim();
      }
    }

    if (!rawToken) {
      throw new AppError(
        "Unauthorized: Missing queue access token header ('x-queue-access-token' or 'Authorization: Bearer')",
        401,
        "UNAUTHORIZED"
      );
    }

    const tokenHash = hashAccessToken(rawToken);
    const entry = await queueEntryRepository.findById(entryId);

    if (!entry || entry.accessTokenHash !== tokenHash) {
      throw new AppError(
        "Unauthorized: Invalid queue entry ID or access credential",
        401,
        "UNAUTHORIZED"
      );
    }

    // Attach authenticated queue entry to request
    req.queueEntry = entry;
    next();
  } catch (error) {
    next(error);
  }
};
