import prisma from "../../infrastructure/database/prisma.js";
import AppError from "../../shared/errors/AppError.js";
import crypto from "crypto";
import { queueEntryRepository } from "./queue-entry.repository.js";
import {
  QUEUE_ENTRY_STATUS,
  ALLOWED_QUEUE_ENTRY_TRANSITIONS,
  MAX_NO_SHOW_ATTEMPTS,
  NO_SHOW_REQUEUE_PENALTIES,
} from "./queue-entry.constants.js";
import {
  generateAccessToken,
  hashAccessToken,
  generateHumanToken,
  buildQrPayload,
} from "./queue-entry.utils.js";
import { broadcastToQueue } from "../../infrastructure/websocket/websocket.server.js";

/**
 * Checks if a status transition from currentStatus to nextStatus is allowed.
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 */
export const isValidStatusTransition = (currentStatus, nextStatus) => {
  const allowed = ALLOWED_QUEUE_ENTRY_TRANSITIONS[currentStatus];
  if (!allowed) {
    return false;
  }
  return allowed.includes(nextStatus);
};

/**
 * Validates a status transition. Throws an AppError if the transition is illegal or invalid.
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @throws {AppError} 400 - If transition is forbidden.
 */
export const validateStatusTransition = (currentStatus, nextStatus) => {
  const validStatuses = Object.values(QUEUE_ENTRY_STATUS);

  if (!validStatuses.includes(currentStatus)) {
    throw new AppError(
      `Invalid current status: '${currentStatus}'`,
      400,
      "INVALID_QUEUE_ENTRY_STATUS"
    );
  }

  if (!validStatuses.includes(nextStatus)) {
    throw new AppError(
      `Invalid target status: '${nextStatus}'`,
      400,
      "INVALID_QUEUE_ENTRY_STATUS"
    );
  }

  if (currentStatus === nextStatus) {
    throw new AppError(
      `Queue entry is already in status '${currentStatus}'`,
      400,
      "NO_OP_STATUS_TRANSITION"
    );
  }

  if (!isValidStatusTransition(currentStatus, nextStatus)) {
    const allowedTargets = ALLOWED_QUEUE_ENTRY_TRANSITIONS[currentStatus] || [];
    const allowedMsg =
      allowedTargets.length > 0
        ? `Allowed transitions from '${currentStatus}' are: [${allowedTargets.join(", ")}]`
        : `'${currentStatus}' is a terminal state and cannot transition to any other status.`;

    throw new AppError(
      `Cannot transition queue entry status from '${currentStatus}' to '${nextStatus}'. ${allowedMsg}`,
      400,
      "INVALID_STATE_TRANSITION"
    );
  }
};

/**
 * Fetches active entries for an organizer.
 * @param {string} queueId
 * @param {string} organizerId
 */
export const getActiveEntriesForQueue = async (queueId, organizerId) => {
  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
    include: { event: true },
  });
  if (!queue || queue.event.organizerId !== organizerId) {
    throw new AppError("Queue not found or unauthorized", 404, "QUEUE_NOT_FOUND");
  }
  return queueEntryRepository.findActiveEntriesByQueueId(queueId);
};

export const getAllEntriesForQueue = async (queueId, organizerId) => {
  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
    include: { event: true },
  });
  if (!queue || queue.event.organizerId !== organizerId) {
    throw new AppError("Queue not found or unauthorized", 404, "QUEUE_NOT_FOUND");
  }
  return queueEntryRepository.findAllEntriesByQueueId(queueId);
};

/**
 * Joins a queue based on Priority Policies (FIFO vs WEIGHTED_PRIORITY vs AGING).
 * @param {object} params
 * @returns {Promise<object>} Entry details, raw access token, QR payload, dynamic position & wait time.
 */
export const joinQueue = async ({
  queueId,
  sessionId,
  customerName,
  customerPhone,
  priority = "NORMAL",
  baseUrl = "https://skipline.app",
}) => {
  if (!queueId) {
    throw new AppError("queueId is required", 400, "MISSING_QUEUE_ID");
  }
  if (!sessionId) {
    throw new AppError("sessionId is required", 400, "MISSING_SESSION_ID");
  }

  // All reads and writes inside a single transaction with a row lock on the Queue
  // to serialize concurrent joins to the same queue.
  const result = await prisma.$transaction(async (tx) => {
    // Lock the Queue row to serialize concurrent joins
    const lockedQueues = await tx.$queryRaw`
      SELECT q.*, e.status AS "eventStatus", e."endAt" AS "eventEndAt"
      FROM "Queue" q
      JOIN "Event" e ON q."eventId" = e.id
      WHERE q.id = ${queueId}
      FOR UPDATE OF q
    `;

    if (!lockedQueues || lockedQueues.length === 0) {
      throw new AppError("Queue not found", 404, "QUEUE_NOT_FOUND");
    }

    const queue = lockedQueues[0];

    const now = new Date();
    if (queue.eventStatus !== "LIVE" || new Date(queue.eventEndAt) <= now) {
      throw new AppError(
        "Cannot join queue. The event is not live or has ended.",
        403,
        "EVENT_UNAVAILABLE"
      );
    }

    if (queue.status !== "OPEN") {
      throw new AppError(
        `Cannot join queue. Current queue status is '${queue.status}'.`,
        400,
        "QUEUE_NOT_OPEN"
      );
    }

    if (queue.maxCapacity !== null && queue.maxCapacity !== undefined) {
      const currentActiveCount = await tx.queueEntry.count({
        where: {
          queueId,
          status: { in: ["WAITING", "CALLED", "SERVING"] },
        },
      });
      if (currentActiveCount >= queue.maxCapacity) {
        throw new AppError("Queue is currently at maximum capacity", 400, "QUEUE_FULL");
      }
    }

    // Ensure user is not already in THIS queue (via sessionId)
    const existingSessionEntry = await tx.queueEntry.findFirst({
      where: {
        queueId,
        sessionId,
        status: { in: ["WAITING", "CALLED", "SERVING"] },
      }
    });

    if (existingSessionEntry) {
      throw new AppError("You are already in this queue.", 400, "ALREADY_IN_QUEUE");
    }

    // Ensure phone number is unique in THIS queue
    if (customerPhone) {
      const existingPhoneEntry = await tx.queueEntry.findFirst({
        where: {
          queueId,
          customerPhone,
          status: { in: ["WAITING", "CALLED", "SERVING"] },
        }
      });

      if (existingPhoneEntry) {
        throw new AppError("A customer with this phone number is already waiting in this queue.", 400, "PHONE_ALREADY_IN_QUEUE");
      }
    }

    const rawAccessToken = generateAccessToken();
    const accessTokenHash = hashAccessToken(rawAccessToken);

    const sequenceNumber = await queueEntryRepository.getNextSequenceNumber(queueId, tx);
    const token = generateHumanToken(priority, sequenceNumber);

    const entry = await queueEntryRepository.create({
      queueId,
      sessionId,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      priority: priority === "VIP" ? "VIP" : "NORMAL",
      status: QUEUE_ENTRY_STATUS.WAITING,
      sequenceNumber,
      token,
      accessTokenHash,
      origin: "QR",
    }, tx);

    const waitingAhead = await queueEntryRepository.countWaitingAhead(queueId, sequenceNumber, tx);
    const position = waitingAhead + 1;
    const estimatedWaitTimeMinutes = position * (queue.estimatedServiceTime || 5);

    return {
      entry,
      accessToken: rawAccessToken,
      qrPayload: buildQrPayload(entry.id, rawAccessToken, baseUrl),
      position,
      estimatedWaitTimeMinutes,
    };
  });

  broadcastToQueue(queueId, "QUEUE_ENTRY_UPDATED", {
    entryId: result.entry.id,
    status: result.entry.status,
  });

  return result;
};

/**
 * Creates a walk-in queue entry directly by the organizer.
 */
export const addWalkInEntry = async ({
  queueId,
  organizerId,
  customerName,
  customerPhone,
  priority = "NORMAL",
}) => {
  if (!queueId) {
    throw new AppError("queueId is required", 400, "MISSING_QUEUE_ID");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Lock the Queue row
    const lockedQueues = await tx.$queryRaw`
      SELECT q.*, e.status AS "eventStatus", e."endAt" AS "eventEndAt", e."organizerId" AS "organizerId"
      FROM "Queue" q
      JOIN "Event" e ON q."eventId" = e.id
      WHERE q.id = ${queueId}
      FOR UPDATE OF q
    `;

    if (!lockedQueues || lockedQueues.length === 0) {
      throw new AppError("Queue not found", 404, "QUEUE_NOT_FOUND");
    }

    const queue = lockedQueues[0];

    // Authorization
    if (queue.organizerId !== organizerId) {
      throw new AppError("Queue not found or unauthorized", 404, "QUEUE_NOT_FOUND");
    }

    const now = new Date();
    if (queue.eventStatus !== "LIVE" || new Date(queue.eventEndAt) <= now) {
      throw new AppError(
        "Cannot add walk-in. The event is not live or has ended.",
        403,
        "EVENT_UNAVAILABLE"
      );
    }

    if (queue.status !== "OPEN") {
      throw new AppError(
        `Cannot add walk-in. Current queue status is '${queue.status}'.`,
        400,
        "QUEUE_NOT_OPEN"
      );
    }

    if (queue.maxCapacity !== null && queue.maxCapacity !== undefined) {
      const currentActiveCount = await tx.queueEntry.count({
        where: {
          queueId,
          status: { in: ["WAITING", "CALLED", "SERVING"] },
        },
      });
      if (currentActiveCount >= queue.maxCapacity) {
        throw new AppError("Queue is currently at maximum capacity", 400, "QUEUE_FULL");
      }
    }

    // Phone uniqueness check
    if (customerPhone) {
      const existingPhoneEntry = await tx.queueEntry.findFirst({
        where: {
          queueId,
          customerPhone,
          status: { in: ["WAITING", "CALLED", "SERVING"] },
        }
      });

      if (existingPhoneEntry) {
        throw new AppError("A customer with this phone number is already waiting in this queue.", 400, "PHONE_ALREADY_IN_QUEUE");
      }
    }

    const rawAccessToken = generateAccessToken();
    const accessTokenHash = hashAccessToken(rawAccessToken);
    const sequenceNumber = await queueEntryRepository.getNextSequenceNumber(queueId, tx);
    const token = generateHumanToken(priority, sequenceNumber);
    const sessionId = `walkin-${crypto.randomUUID()}`;

    const entry = await queueEntryRepository.create({
      queueId,
      sessionId,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      priority: priority === "VIP" ? "VIP" : "NORMAL",
      status: QUEUE_ENTRY_STATUS.WAITING,
      sequenceNumber,
      token,
      accessTokenHash,
      origin: "WALK_IN",
    }, tx);

    return { entry };
  });

  broadcastToQueue(queueId, "QUEUE_ENTRY_UPDATED", {
    entryId: result.entry.id,
    status: result.entry.status,
  });

  return result;
};

/**
 * Calculates the dynamic virtual score for a queue entry based on base priority weight and waiting time aging.
 * @param {object} entry
 * @param {object} queue
 * @param {Date} [now=new Date()]
 * @returns {number} Dynamic effective score.
 */
export const calculateEffectiveScore = (entry, queue, now = new Date()) => {
  const isVip = entry.priority === "VIP";
  const baseWeight = isVip
    ? (queue.vipWeight ?? 2) * 10
    : (queue.normalWeight ?? 1) * 10;

  const joinedAtMs = new Date(entry.joinedAt).getTime();
  const nowMs = now.getTime();
  const waitingSeconds = Math.max(0, (nowMs - joinedAtMs) / 1000);

  const agingIntervalSec = queue.agingIntervalSec ?? 300;
  const agingScoreStep = queue.agingScoreStep ?? 10;

  const agingScore =
    Math.floor(waitingSeconds / agingIntervalSec) * agingScoreStep;

  return baseWeight + agingScore;
};

/**
 * Checks if a waiting queue entry is eligible for selection after a previous no-show requeue penalty.
 * @param {object} entry
 * @param {number} totalCallsCount
 * @returns {boolean}
 */
export const isEntryRequeueEligible = (entry, totalCallsCount) => {
  if (entry.requeueAfterCallCount == null) {
    return true;
  }
  return totalCallsCount >= entry.requeueAfterCallCount;
};

/**
 * Core scheduling algorithm selecting the next eligible queue entry.
 * @param {object} queue
 * @param {Array<object>} waitingEntries
 * @param {Date} [now=new Date()]
 * @returns {{ selectedEntry: object, nextConsecutiveVipCount: number } | null}
 */
export const selectNextQueueEntry = (queue, waitingEntries, now = new Date()) => {
  let eligibleEntries = waitingEntries.filter((entry) =>
    isEntryRequeueEligible(entry, queue.totalCallsCount)
  );

  if (eligibleEntries.length === 0) {
    if (waitingEntries.length > 0) {
      // If everyone is serving a penalty, just ignore the penalty and call the best one
      eligibleEntries = waitingEntries;
    } else {
      return null;
    }
  }

  const scoredEntries = eligibleEntries.map((entry) => ({
    entry,
    score: calculateEffectiveScore(entry, queue, now),
  }));

  scoredEntries.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const seqA = BigInt(a.entry.sequenceNumber);
    const seqB = BigInt(b.entry.sequenceNumber);
    if (seqA < seqB) return -1;
    if (seqA > seqB) return 1;
    return 0;
  });

  const topCandidate = scoredEntries[0].entry;
  const maxVipStreak = queue.maxVipStreak ?? 2;
  const consecutiveVipCount = queue.consecutiveVipCount ?? 0;

  if (
    topCandidate.priority === "VIP" &&
    consecutiveVipCount >= maxVipStreak
  ) {
    const normalCandidateObj = scoredEntries.find(
      (item) => item.entry.priority === "NORMAL"
    );

    if (normalCandidateObj) {
      return {
        selectedEntry: normalCandidateObj.entry,
        nextConsecutiveVipCount: 0,
      };
    }
  }

  const isSelectedVip = topCandidate.priority === "VIP";
  const nextConsecutiveVipCount = isSelectedVip ? consecutiveVipCount + 1 : 0;

  return {
    selectedEntry: topCandidate,
    nextConsecutiveVipCount,
  };
};

/**
 * Calls the next eligible customer in the queue.
 * @param {string} queueId
 * @returns {Promise<object|null>} The called QueueEntry, or null if no eligible waiting entries.
 */
export const callNext = async (queueId, organizerId) => {
  const result = await prisma.$transaction(async (tx) => {
    // Lock the Queue row to serialize concurrent callNext calls
    const lockedQueues = await tx.$queryRaw`
      SELECT q.*, e."organizerId" AS "eventOrganizerId" 
      FROM "Queue" q
      JOIN "Event" e ON q."eventId" = e.id
      WHERE q.id = ${queueId}
      FOR UPDATE OF q
    `;

    if (!lockedQueues || lockedQueues.length === 0) {
      throw new AppError("Queue not found", 404, "QUEUE_NOT_FOUND");
    }

    const queueRow = lockedQueues[0];

    if (queueRow.eventOrganizerId !== organizerId) {
      throw new AppError("Unauthorized access to queue", 404, "QUEUE_NOT_FOUND");
    }

    if (queueRow.status === "CLOSED") {
      throw new AppError(
        "Cannot call next customer from a CLOSED queue",
        400,
        "QUEUE_CLOSED"
      );
    }

    // Read waiting entries inside the same transaction (after lock acquired)
    const queueData = await queueEntryRepository.findQueueWithWaitingEntries(queueId, tx);

    // Merge the locked row's metrics onto queueData for selectNextQueueEntry
    queueData.totalCallsCount = queueRow.totalCallsCount;
    queueData.consecutiveVipCount = queueRow.consecutiveVipCount;

    const selectionResult = selectNextQueueEntry(queueData, queueData.entries);

    if (!selectionResult) {
      return null;
    }

    const { selectedEntry, nextConsecutiveVipCount } = selectionResult;

    validateStatusTransition(selectedEntry.status, QUEUE_ENTRY_STATUS.CALLED);

    const now = new Date();

    const updatedEntry = await tx.queueEntry.update({
      where: { id: selectedEntry.id },
      data: {
        status: QUEUE_ENTRY_STATUS.CALLED,
        callCount: (selectedEntry.callCount || 0) + 1,
        calledAt: now,
      },
      include: { queue: true },
    });

    await tx.queue.update({
      where: { id: queueId },
      data: {
        totalCallsCount: queueRow.totalCallsCount + 1,
        consecutiveVipCount: nextConsecutiveVipCount,
      },
    });

    return updatedEntry;
  });

  if (result) {
    broadcastToQueue(queueId, "QUEUE_ENTRY_UPDATED", {
      entryId: result.id,
      status: "CALLED",
      callCount: result.callCount,
      calledAt: result.calledAt,
    });
  }

  return result;
};

/**
 * Gets real-time status, dynamic position, and wait estimate for a QueueEntry.
 * @param {string} entryId
 * @returns {Promise<object>}
 */
export const getQueueEntryStatus = async (entryId) => {
  const entry = await queueEntryRepository.findById(entryId);
  if (!entry) {
    throw new AppError("Queue entry not found", 404, "ENTRY_NOT_FOUND");
  }

  let position = 0;
  let estimatedWaitTimeMinutes = 0;

  if (entry.status === QUEUE_ENTRY_STATUS.WAITING) {
    const waitingAhead = await queueEntryRepository.countWaitingAhead(
      entry.queueId,
      entry.sequenceNumber
    );
    position = waitingAhead + 1;
    estimatedWaitTimeMinutes = position * (entry.queue.estimatedServiceTime || 5);
  }

  return {
    entry,
    position,
    estimatedWaitTimeMinutes,
  };
};

/**
 * Cancels/leaves a queue entry (WAITING or CALLED status).
 * @param {string} entryId
 * @returns {Promise<object>} The updated QueueEntry.
 */
export const leaveQueue = async (entryId) => {
  const entry = await queueEntryRepository.findById(entryId);
  if (!entry) {
    throw new AppError("Queue entry not found", 404, "ENTRY_NOT_FOUND");
  }

  validateStatusTransition(entry.status, QUEUE_ENTRY_STATUS.CANCELLED);

  const updated = await queueEntryRepository.update(entryId, {
    status: QUEUE_ENTRY_STATUS.CANCELLED,
    cancelledAt: new Date(),
  });

  broadcastToQueue(entry.queueId, "QUEUE_ENTRY_UPDATED", {
    entryId: entry.id,
    status: "CANCELLED",
  });

  return updated;
};

/**
 * Marks a CALLED queue entry as SERVING when customer arrives at counter.
 * @param {string} entryId
 * @returns {Promise<object>} The updated QueueEntry.
 */
export const startServing = async (entryId, organizerId) => {
  const entry = await queueEntryRepository.findById(entryId);
  if (!entry || (organizerId && entry.queue.event.organizerId !== organizerId)) {
    throw new AppError("Queue entry not found or unauthorized", 404, "ENTRY_NOT_FOUND");
  }

  validateStatusTransition(entry.status, QUEUE_ENTRY_STATUS.SERVING);

  const updated = await queueEntryRepository.update(entryId, {
    status: QUEUE_ENTRY_STATUS.SERVING,
    servingAt: new Date(),
  });

  broadcastToQueue(entry.queueId, "QUEUE_ENTRY_UPDATED", {
    entryId: entry.id,
    status: "SERVING",
  });

  return updated;
};

/**
 * Marks a SERVING queue entry as COMPLETED when service is finished.
 * @param {string} entryId
 * @returns {Promise<object>} The updated QueueEntry.
 */
export const completeService = async (entryId, organizerId) => {
  const entry = await queueEntryRepository.findById(entryId);
  if (!entry || (organizerId && entry.queue.event.organizerId !== organizerId)) {
    throw new AppError("Queue entry not found or unauthorized", 404, "ENTRY_NOT_FOUND");
  }

  validateStatusTransition(entry.status, QUEUE_ENTRY_STATUS.COMPLETED);

  const updated = await queueEntryRepository.update(entryId, {
    status: QUEUE_ENTRY_STATUS.COMPLETED,
    completedAt: new Date(),
  });

  broadcastToQueue(entry.queueId, "QUEUE_ENTRY_UPDATED", {
    entryId: entry.id,
    status: "COMPLETED",
  });

  return updated;
};

/**
 * Handles a customer no-show for a CALLED queue entry.
 * @param {string} queueEntryId
 * @returns {Promise<object>} The updated QueueEntry.
 */
export const handleNoShow = async (queueEntryId, organizerId) => {
  const entry = await queueEntryRepository.findById(queueEntryId);

  if (!entry || (organizerId && entry.queue.event.organizerId !== organizerId)) {
    throw new AppError("Queue entry not found or unauthorized", 404, "ENTRY_NOT_FOUND");
  }

  if (entry.status !== QUEUE_ENTRY_STATUS.CALLED) {
    throw new AppError(
      `Cannot mark no-show for entry in status '${entry.status}'. Entry must be CALLED.`,
      400,
      "INVALID_NO_SHOW_STATUS"
    );
  }

  const newNoShowCount = entry.noShowCount + 1;
  const now = new Date();

  let updated;
  if (newNoShowCount >= MAX_NO_SHOW_ATTEMPTS) {
    validateStatusTransition(entry.status, QUEUE_ENTRY_STATUS.SKIPPED);

    updated = await queueEntryRepository.update(queueEntryId, {
      status: QUEUE_ENTRY_STATUS.SKIPPED,
      noShowCount: newNoShowCount,
      lastNoShowAt: now,
    });
  } else {
    validateStatusTransition(entry.status, QUEUE_ENTRY_STATUS.WAITING);

    const penalties = NO_SHOW_REQUEUE_PENALTIES[entry.priority] || {};
    const offset = penalties[newNoShowCount] ?? 5;
    const requeueAfterCallCount = entry.queue.totalCallsCount + offset;

    updated = await queueEntryRepository.update(queueEntryId, {
      status: QUEUE_ENTRY_STATUS.WAITING,
      noShowCount: newNoShowCount,
      lastNoShowAt: now,
      requeueAfterCallCount,
    });
  }

  broadcastToQueue(entry.queueId, "QUEUE_ENTRY_UPDATED", {
    entryId: entry.id,
    status: updated.status,
  });

  return updated;
};

/**
 * Retrieves all active entries for a session ID.
 * @param {string} sessionId
 * @returns {Promise<Array<object>>}
 */
export const getActiveEntriesForSession = async (sessionId) => {
  if (!sessionId) {
    throw new AppError("Session ID is required", 400, "MISSING_SESSION_ID");
  }
  return queueEntryRepository.findActiveBySessionId(sessionId);
};
