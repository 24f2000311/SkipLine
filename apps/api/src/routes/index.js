import { Router } from "express";
import authRouter from "../modules/auth/auth.routes.js";
import eventRouter from "../modules/events/event.routes.js";
import queueRouter from "../modules/queues/queue.routes.js";
import queueEntryRouter from "../modules/queue-entries/queue-entry.routes.js";

const router = Router();

router.use("/", authRouter);
router.use("/", eventRouter);
router.use("/", queueRouter);
router.use("/", queueEntryRouter);

export default router;
