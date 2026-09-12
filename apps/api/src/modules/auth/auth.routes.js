import { Router } from "express";
import { authController } from "./auth.controller.js";
import { authenticateOrganizer } from "../../middleware/organizer-auth.middleware.js";
import { createRateLimiter } from "../../middleware/rate-limiter.middleware.js";
import prisma from "../../infrastructure/database/prisma.js";

const router = Router();

const resendVerificationLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: "Too many verification email requests. Please try again in 10 minutes.",
  keyPrefix: "resend-verify",
});

const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset requests. Please try again in 15 minutes.",
  keyPrefix: "forgot-pwd",
});

const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts. Please try again later.",
  keyPrefix: "reset-pwd",
});

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);
router.get("/auth/me", authenticateOrganizer, authController.getMe);

router.post("/auth/verify-email", authController.verifyEmail);
router.post("/auth/resend-verification", resendVerificationLimiter, authController.resendVerification);
router.post("/auth/forgot-password", forgotPasswordLimiter, authController.forgotPassword);
router.post("/auth/reset-password", resetPasswordLimiter, authController.resetPassword);
router.delete("/auth/account", authenticateOrganizer, authController.deleteAccount);

// Non-production test verification helper for automated E2E suites
if (process.env.NODE_ENV !== "production") {
  router.post("/auth/test-verify", async (req, res, next) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await prisma.user.update({
        where: { email: String(email).toLowerCase() },
        data: { emailVerifiedAt: new Date() },
      });
      res.json({ success: true, user: { id: user.id, email: user.email, emailVerifiedAt: user.emailVerifiedAt } });
    } catch (err) {
      next(err);
    }
  });
}

export default router;

