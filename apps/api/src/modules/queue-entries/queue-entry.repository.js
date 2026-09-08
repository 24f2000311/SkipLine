import prisma from "../../infrastructure/database/prisma.js";

/**
 * Repository layer for QueueEntry database operations.
 */
export const queueEntryRepository = {
  /**
   * Fetches a Queue along with all its current WAITING entries.
   * @param {string} queueId
   * @param {object} [tx=prisma]
   */
  async findQueueWithWaitingEntries(queueId, tx = prisma) {
    return tx.queue.findUnique({
      where: { id: queueId },
      include: {
        entries: {
          where: { status: "WAITING" },
          orderBy: { sequenceNumber: "asc" },
        },
      },
    });
  },

  /**
   * Fetches all active entries for a specific queue (WAITING, CALLED, SERVING).
   * @param {string} queueId
   * @param {object} [tx=prisma]
   */
  async findActiveEntriesByQueueId(queueId, tx = prisma) {
    return tx.queueEntry.findMany({
      where: {
        queueId,
        status: { in: ["WAITING", "CALLED", "SERVING"] },
      },
      orderBy: { sequenceNumber: "asc" },
    });
  },

  /**
   * Finds a QueueEntry by its unique ID.
   * @param {string} id
   * @param {object} [tx=prisma]
   */
  async findById(id, tx = prisma) {
    return tx.queueEntry.findUnique({
      where: { id },
      include: {
        queue: {
          include: { event: true },
        },
      },
    });
  },

  /**
   * Generates the next sequence number for a queue atomically.
   * @param {string} queueId
   * @param {object} [tx=prisma]
   */
  async getNextSequenceNumber(queueId, tx = prisma) {
    const aggregate = await tx.queueEntry.aggregate({
      where: { queueId },
      _max: { sequenceNumber: true },
    });
    const maxSeq = aggregate._max.sequenceNumber;
    return maxSeq !== null && maxSeq !== undefined ? maxSeq + 1n : 1n;
  },

  /**
   * Creates a new QueueEntry in the database.
   * @param {object} data
   * @param {object} [tx=prisma]
   */
  async create(data, tx = prisma) {
    return tx.queueEntry.create({
      data,
      include: {
        queue: true,
      },
    });
  },

  /**
   * Updates a QueueEntry by ID.
   * @param {string} id
   * @param {object} data
   * @param {object} [tx=prisma]
   */
  async update(id, data, tx = prisma) {
    return tx.queueEntry.update({
      where: { id },
      data,
      include: {
        queue: true,
      },
    });
  },

  /**
   * Finds all active entries (WAITING, CALLED, SERVING) for a given session ID.
   * @param {string} sessionId
   * @param {object} [tx=prisma]
   */
  async findActiveBySessionId(sessionId, tx = prisma) {
    return tx.queueEntry.findMany({
      where: {
        sessionId,
        status: {
          in: ["WAITING", "CALLED", "SERVING"],
        },
      },
      include: {
        queue: true,
      },
      orderBy: { joinedAt: "desc" },
    });
  },

  /**
   * Counts how many WAITING entries are currently ahead of a given sequence number.
   * @param {string} queueId
   * @param {bigint|number} sequenceNumber
   * @param {object} [tx=prisma]
   */
  async countWaitingAhead(queueId, sequenceNumber, tx = prisma) {
    return tx.queueEntry.count({
      where: {
        queueId,
        status: "WAITING",
        sequenceNumber: {
          lt: BigInt(sequenceNumber),
        },
      },
    });
  },

  /**
   * Updates Queue call state metrics (totalCallsCount and consecutiveVipCount).
   * @param {string} queueId
   * @param {object} data
   * @param {object} [tx=prisma]
   */
  async updateQueueMetrics(queueId, data, tx = prisma) {
    return tx.queue.update({
      where: { id: queueId },
      data,
    });
  },

  /**
   * Atomic operation to transition an entry to CALLED and increment Queue call metrics in a transaction.
   * @param {string} queueId
   * @param {string} entryId
   * @param {object} entryData
   * @param {object} queueData
   */
  async executeCallNextTransaction(queueId, entryId, entryData, queueData) {
    return prisma.$transaction(async (tx) => {
      const updatedEntry = await tx.queueEntry.update({
        where: { id: entryId },
        data: entryData,
        include: {
          queue: true,
        },
      });

      await tx.queue.update({
        where: { id: queueId },
        data: queueData,
      });

      return updatedEntry;
    });
  },
};
