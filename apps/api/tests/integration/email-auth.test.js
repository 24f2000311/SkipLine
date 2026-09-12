import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import prisma from "../../src/infrastructure/database/prisma.js";
import { getSentEmails, clearSentEmails, resendClient } from "../../src/infrastructure/email/resend.client.js";
import { hashAuthToken } from "../../src/modules/auth/auth.utils.js";
import { resetRateLimits } from "../../src/middleware/rate-limiter.middleware.js";

describe("Email Verification & Password Reset Integration Tests", () => {
  beforeEach(async () => {
    clearSentEmails();
    resetRateLimits();
  });

  it("registration creates verification token, stores hash (not raw), and dispatches email", async () => {
    const email = `org-email-${Date.now()}@example.com`;
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Test Email Organizer",
        email,
        password: "Password123!",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    // Security: Raw verification token must NEVER be returned in API response
    expect(res.body.data.verificationToken).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/sk_verify_/);

    // Database verification: token stored as hash
    const user = await prisma.user.findUnique({
      where: { email },
      include: { authTokens: true },
    });

    expect(user.emailVerifiedAt).toBeNull();
    expect(user.authTokens.length).toBe(1);
    const storedToken = user.authTokens[0];
    expect(storedToken.type).toBe("EMAIL_VERIFICATION");
    expect(storedToken.usedAt).toBeNull();
    expect(storedToken.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Verify email was dispatched
    const sent = getSentEmails();
    const verificationEmail = sent.find((e) => e.to === email && e.subject.includes("Verify"));
    expect(verificationEmail).toBeDefined();
    expect(verificationEmail.idempotencyKey).toBe(`email-verification:${user.id}:${storedToken.id}`);
    
    // Extract raw token from dispatched email body
    const tokenMatch = verificationEmail.text.match(/token=([^&\s]+)/) || verificationEmail.html.match(/token=([^&"'\s]+)/);
    expect(tokenMatch).toBeTruthy();
    const rawToken = decodeURIComponent(tokenMatch[1]);
    expect(rawToken.startsWith("sk_verify_")).toBe(true);

    // Verify DB stores only hash of raw token
    expect(storedToken.tokenHash).toBe(hashAuthToken(rawToken));
    expect(storedToken.tokenHash).not.toBe(rawToken);
  });

  it("POST /auth/verify-email validates token, marks emailVerifiedAt, and prevents reuse", async () => {
    const email = `verify-success-${Date.now()}@example.com`;
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Verifiable User",
        email,
        password: "Password123!",
      });

    const sent = getSentEmails();
    const emailObj = sent.find((e) => e.to === email);
    const tokenMatch = emailObj.text.match(/token=([^&\s]+)/);
    const rawToken = decodeURIComponent(tokenMatch[1]);

    // 1. Verify email with valid token
    const verifyRes = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: rawToken });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.message).toBe("Email verified successfully");

    // DB state check
    const updatedUser = await prisma.user.findUnique({
      where: { email },
      include: { authTokens: true },
    });
    expect(updatedUser.emailVerifiedAt).not.toBeNull();
    expect(updatedUser.authTokens[0].usedAt).not.toBeNull();

    // Welcome email check
    const welcomeEmail = getSentEmails().find((e) => e.to === email && e.subject.includes("Welcome"));
    expect(welcomeEmail).toBeDefined();

    // 2. Prevent replay/reuse of already used token
    const reuseRes = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: rawToken });

    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error.code).toBe("INVALID_VERIFICATION_TOKEN");
  });

  it("POST /auth/verify-email rejects expired verification token", async () => {
    const email = `verify-expired-${Date.now()}@example.com`;
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Expired Token User",
        email,
        password: "Password123!",
      });

    const user = await prisma.user.findUnique({ where: { email }, include: { authTokens: true } });
    const rawToken = decodeURIComponent(getSentEmails().find((e) => e.to === email).text.match(/token=([^&\s]+)/)[1]);

    // Manually expire the token in DB
    await prisma.authToken.update({
      where: { id: user.authTokens[0].id },
      data: { expiresAt: new Date(Date.now() - 60000) },
    });

    const res = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: rawToken });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EXPIRED_VERIFICATION_TOKEN");
  });

  it("POST /auth/resend-verification invalidates old token, issues new token, and rate-limits", async () => {
    const email = `resend-${Date.now()}@example.com`;
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Resend User",
        email,
        password: "Password123!",
      });

    const initialTokenId = (await prisma.user.findUnique({ where: { email }, include: { authTokens: true } })).authTokens[0].id;

    // Resend 1
    const res1 = await request(app)
      .post("/api/v1/auth/resend-verification")
      .send({ email });
    expect(res1.status).toBe(200);

    // Check old token was invalidated
    const oldToken = await prisma.authToken.findUnique({ where: { id: initialTokenId } });
    expect(oldToken.usedAt).not.toBeNull();

    // Check new active token exists
    const userTokens = await prisma.authToken.findMany({ where: { userId: oldToken.userId } });
    expect(userTokens.length).toBe(2);
    const activeToken = userTokens.find((t) => t.id !== initialTokenId);
    expect(activeToken.usedAt).toBeNull();

    // Resend 2 & 3
    await request(app).post("/api/v1/auth/resend-verification").send({ email });
    await request(app).post("/api/v1/auth/resend-verification").send({ email });

    // 4th request triggers rate limit (max 3 per 10m window)
    const resRateLimited = await request(app)
      .post("/api/v1/auth/resend-verification")
      .send({ email });
    expect(resRateLimited.status).toBe(429);
    expect(resRateLimited.body.error.code).toBe("TOO_MANY_REQUESTS");
  });

  it("POST /auth/forgot-password and reset-password lifecycle with session revocation", async () => {
    const email = `forgot-pwd-${Date.now()}@example.com`;
    const regRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Password Reset Tester",
        email,
        password: "OldPassword123!",
      });

    const user = regRes.body.data.user;

    // 1. Forgot password request (generic response anti-enumeration)
    const forgotRes = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.message).toContain("If an account with that email exists");

    // Check for non-existing email gives SAME response
    const nonExistRes = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nonexistent-user-12345@example.com" });
    expect(nonExistRes.status).toBe(200);
    expect(nonExistRes.body.message).toBe(forgotRes.body.message);

    // 2. Extract reset token from email
    const resetEmail = getSentEmails().find((e) => e.to === email && e.subject.includes("Reset"));
    expect(resetEmail).toBeDefined();
    const tokenMatch = resetEmail.text.match(/token=([^&\s]+)/);
    const rawResetToken = decodeURIComponent(tokenMatch[1]);

    // 3. Reset password with new password
    const resetRes = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({
        token: rawResetToken,
        password: "BrandNewPassword123!",
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toContain("Password reset successful");

    // 4. Verify password was updated: old password fails, new password succeeds
    const oldLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "OldPassword123!" });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "BrandNewPassword123!" });
    expect(newLogin.status).toBe(200);

    // 5. Verify refresh tokens were revoked
    const refreshTokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
    // Should only have the newly issued refresh token from newLogin
    expect(refreshTokens.length).toBe(1);

    // 6. Verify security alert email was dispatched
    const securityEmail = getSentEmails().find((e) => e.to === email && e.subject.includes("password was changed"));
    expect(securityEmail).toBeDefined();

    // 7. Prevent token reuse
    const reuseReset = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({
        token: rawResetToken,
        password: "AnotherPassword123!",
      });
    expect(reuseReset.status).toBe(400);
    expect(reuseReset.body.error.code).toBe("INVALID_RESET_TOKEN");
  });

  it("email provider failure does not break or roll back successful registration", async () => {
    // Mock sendEmail to simulate Resend operational failure
    const sendSpy = vi.spyOn(resendClient, "sendEmail").mockRejectedValueOnce(new Error("Resend network timeout"));

    const email = `resend-failure-${Date.now()}@example.com`;
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Fault Tolerance Tester",
        email,
        password: "Password123!",
      });

    // Registration must still succeed!
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // User is persisted in database
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();

    sendSpy.mockRestore();
  });
});
