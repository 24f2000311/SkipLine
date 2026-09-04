import { Router } from "express";
import { authController } from "./auth.controller.js";
import { authenticateOrganizer } from "../../middleware/organizer-auth.middleware.js";

const router = Router();

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);
router.get("/auth/me", authenticateOrganizer, authController.getMe);

export default router;
