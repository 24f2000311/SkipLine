import { Router } from "express";
import { eventController } from "./event.controller.js";
import { authenticateOrganizer } from "../../middleware/organizer-auth.middleware.js";

const router = Router();

router.post("/events", authenticateOrganizer, eventController.create);
router.get("/events", authenticateOrganizer, eventController.getAll);
router.get("/events/:id", authenticateOrganizer, eventController.getOne);
router.put("/events/:id", authenticateOrganizer, eventController.update);
router.delete("/events/:id", authenticateOrganizer, eventController.delete);

export default router;
