import * as queueEntryService from "./queue-entry.service.js";

/**
 * Converts BigInt fields (like sequenceNumber) to plain primitives for clean JSON serialization.
 */
const serializeQueueEntry = (entry) => {
  if (!entry) return null;
  return {
    ...entry,
    sequenceNumber:
      entry.sequenceNumber !== undefined && entry.sequenceNumber !== null
        ? Number(entry.sequenceNumber)
        : null,
  };
};

export const queueEntryController = {
  /**
   * Customer joins a queue.
   * POST /api/v1/queues/:queueId/entries
   */
  async join(req, res, next) {
    try {
      const { queueId } = req.params;
      const { sessionId, customerName, customerPhone, priority } = req.body;

      const result = await queueEntryService.joinQueue({
        queueId,
        sessionId,
        customerName,
        customerPhone,
        priority,
      });

      res.status(201).json({
        success: true,
        data: {
          entry: serializeQueueEntry(result.entry),
          accessToken: result.accessToken,
          qrPayload: result.qrPayload,
          position: result.position,
          estimatedWaitTimeMinutes: result.estimatedWaitTimeMinutes,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get queue entry current status, position, and wait estimate.
   * GET /api/v1/queue-entries/:id
   */
  async getStatus(req, res, next) {
    try {
      const { id } = req.params;
      const result = await queueEntryService.getQueueEntryStatus(id);

      res.status(200).json({
        success: true,
        data: {
          entry: serializeQueueEntry(result.entry),
          position: result.position,
          estimatedWaitTimeMinutes: result.estimatedWaitTimeMinutes,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Customer leaves the queue.
   * POST /api/v1/queue-entries/:id/leave
   */
  async leave(req, res, next) {
    try {
      const { id } = req.params;
      const updatedEntry = await queueEntryService.leaveQueue(id);

      res.status(200).json({
        success: true,
        message: "Successfully left the queue",
        data: serializeQueueEntry(updatedEntry),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Organizer calls the next customer in queue.
   * POST /api/v1/queues/:queueId/call-next
   */
  async callNext(req, res, next) {
    try {
      const { queueId } = req.params;
      const calledEntry = await queueEntryService.callNext(queueId);

      if (!calledEntry) {
        return res.status(200).json({
          success: true,
          message: "No waiting customers available in queue",
          data: null,
        });
      }

      res.status(200).json({
        success: true,
        message: "Customer called successfully",
        data: serializeQueueEntry(calledEntry),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Organizer gets active entries for a queue.
   * GET /api/v1/queues/:queueId/entries
   */
  async getActiveEntries(req, res, next) {
    try {
      const { queueId } = req.params;
      const entries = await queueEntryService.getActiveEntriesForQueue(queueId, req.user.id);
      
      res.status(200).json({
        success: true,
        data: entries.map(serializeQueueEntry),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Organizer starts serving a CALLED customer.
   * POST /api/v1/queue-entries/:id/start
   */
  async startServing(req, res, next) {
    try {
      const { id } = req.params;
      const updatedEntry = await queueEntryService.startServing(id);

      res.status(200).json({
        success: true,
        message: "Started serving customer",
        data: serializeQueueEntry(updatedEntry),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Organizer marks customer as no-show.
   * POST /api/v1/queue-entries/:id/no-show
   */
  async handleNoShow(req, res, next) {
    try {
      const { id } = req.params;
      const updatedEntry = await queueEntryService.handleNoShow(id);

      res.status(200).json({
        success: true,
        message:
          updatedEntry.status === "SKIPPED"
            ? "Customer maximum no-show limit reached. Skipped."
            : "No-show recorded. Customer requeued.",
        data: serializeQueueEntry(updatedEntry),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Organizer completes service for customer.
   * POST /api/v1/queue-entries/:id/complete
   */
  async completeService(req, res, next) {
    try {
      const { id } = req.params;
      const updatedEntry = await queueEntryService.completeService(id);

      res.status(200).json({
        success: true,
        message: "Service completed successfully",
        data: serializeQueueEntry(updatedEntry),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retrieve active entries for a session ID.
   * GET /api/v1/queue-entries/session/:sessionId
   */
  async getActiveSessionEntries(req, res, next) {
    try {
      const { sessionId } = req.params;
      const entries = await queueEntryService.getActiveEntriesForSession(sessionId);

      res.status(200).json({
        success: true,
        data: entries.map(serializeQueueEntry),
      });
    } catch (error) {
      next(error);
    }
  },
};
