import { Router } from "express";
import authRouter from "../modules/auth/auth.routes.js";
import eventRouter from "../modules/events/event.routes.js";
import queueRouter from "../modules/queues/queue.routes.js";
import queueEntryRouter from "../modules/queue-entries/queue-entry.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "skipline-api-v1",
  });
});

router.use("/", authRouter);
router.use("/", eventRouter);
router.use("/", queueRouter);
router.use("/", queueEntryRouter);

export default router;
