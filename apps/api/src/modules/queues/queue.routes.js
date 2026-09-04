import { Router } from "express";
import { queueController } from "./queue.controller.js";
import { authenticateOrganizer } from "../../middleware/organizer-auth.middleware.js";

const router = Router();

router.post("/queues", authenticateOrganizer, queueController.create);
router.get("/events/:eventId/queues", authenticateOrganizer, queueController.getByEvent);
router.get("/queues/:id/public", queueController.getPublic);
router.get("/queues/:id", authenticateOrganizer, queueController.getOne);
router.put("/queues/:id", authenticateOrganizer, queueController.update);
router.delete("/queues/:id", authenticateOrganizer, queueController.delete);

export default router;
