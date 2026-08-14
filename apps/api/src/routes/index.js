import { Router } from "express";
import AppError from "../shared/errors/AppError.js";
import validate from "../middleware/validation.middleware.js";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "skipline-api-v1",
  });
});

router.get("/test-error", (req, res) => {
  throw new AppError("This is a test error", 400, "TEST_ERROR");
});

export default router;
