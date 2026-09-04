import { Router } from "express";
import { queueEntryController } from "./queue-entry.controller.js";
import { authenticateQueueCustomer } from "../../middleware/queue-auth.middleware.js";
import { authenticateOrganizer } from "../../middleware/organizer-auth.middleware.js";

const router = Router();

// Customer endpoints
router.post("/queues/:queueId/entries", queueEntryController.join);
router.get("/queue-entries/session/:sessionId", queueEntryController.getActiveSessionEntries);
router.get("/queue-entries/:id", authenticateQueueCustomer, queueEntryController.getStatus);
router.post("/queue-entries/:id/leave", authenticateQueueCustomer, queueEntryController.leave);

// Organizer endpoints
router.get("/queues/:queueId/entries", authenticateOrganizer, queueEntryController.getActiveEntries);
router.post("/queues/:queueId/call-next", authenticateOrganizer, queueEntryController.callNext);
router.post("/queue-entries/:id/start", authenticateOrganizer, queueEntryController.startServing);
router.post("/queue-entries/:id/no-show", authenticateOrganizer, queueEntryController.handleNoShow);
router.post("/queue-entries/:id/complete", authenticateOrganizer, queueEntryController.completeService);

export default router;
