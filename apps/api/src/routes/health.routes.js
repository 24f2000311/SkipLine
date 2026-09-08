import { Router } from "express";
import prisma from "../infrastructure/database/prisma.js";

const router = Router();

// Cache control middleware for health routes
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/live", (req, res) => {
  res.status(200).json({ status: "ok" });
});

router.get("/ready", async (req, res) => {
  try {
    // Lightweight connectivity check
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready" });
  } catch (error) {
    if (req.log) {
      req.log.error({ err: error, requestId: req.requestId }, "Readiness check failed");
    }
    res.status(503).json({ status: "not_ready" });
  }
});

export default router;
