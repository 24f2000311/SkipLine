import { describe, it, expect } from "vitest";
import { renderVerificationEmail } from "../../src/infrastructure/email/templates/verification.email.js";
import { renderPasswordResetEmail } from "../../src/infrastructure/email/templates/password-reset.email.js";
import { renderPasswordChangedEmail } from "../../src/infrastructure/email/templates/password-changed.email.js";
import { renderWelcomeEmail } from "../../src/infrastructure/email/templates/welcome.email.js";
import { emailConfig } from "../../src/infrastructure/email/email.config.js";

describe("Transactional Email Templates Unit Tests", () => {
  it("renderVerificationEmail generates branded HTML and plain-text with token URL, brand color, and official logo", () => {
    const rendered = renderVerificationEmail({
      name: "Alex Smith",
      token: "sk_verify_test_token_123",
    });

    expect(rendered.subject).toBe("Verify your Skipline email");
    expect(rendered.html).toContain("Hello Alex Smith,");
    expect(rendered.html).toContain("Verify your email address");
    expect(rendered.html).toContain("Verify Email Address");
    expect(rendered.html).toContain("#1868F8");
    expect(rendered.html).toContain(emailConfig.appUrl);
    expect(rendered.html).toContain("sk_verify_test_token_123");
    expect(rendered.html).toContain("skipline-logo");
    expect(rendered.html).toContain("Join the queue. Not the crowd.");
    expect(rendered.html).toContain("This verification link will expire in 24 hours.");
    expect(rendered.html).toContain("If you did not create a Skipline account, you can safely ignore this message.");
    expect(rendered.html).not.toContain("undefined");
    expect(rendered.html).not.toContain("null");

    // Plain text verification
    expect(rendered.text).toContain("Skipline");
    expect(rendered.text).toContain("Verify your email address");
    expect(rendered.text).toContain("Hello Alex Smith,");
    expect(rendered.text).toContain("sk_verify_test_token_123");
    expect(rendered.text).toContain("This verification link will expire in 24 hours.");
    expect(rendered.text).toContain("Join the queue. Not the crowd.");
    expect(rendered.text).not.toContain("undefined");
  });

  it("renderVerificationEmail handles missing name gracefully", () => {
    const rendered = renderVerificationEmail({
      token: "sk_verify_no_name",
    });

    expect(rendered.html).not.toContain("undefined");
    expect(rendered.html).not.toContain("null");
    expect(rendered.html).toContain("Hello,");
    expect(rendered.html).toContain("Verify your email address");
    expect(rendered.html).toContain("Please confirm your email address to activate your organizer account");
    expect(rendered.text).not.toContain("undefined");
  });

  it("renderPasswordResetEmail generates branded HTML with 30m notice and reset URL", () => {
    const rendered = renderPasswordResetEmail({
      name: "Jordan Doe",
      token: "sk_reset_test_token_456",
    });

    expect(rendered.subject).toBe("Reset your Skipline password");
    expect(rendered.html).toContain("Reset your Skipline password");
    expect(rendered.html).toContain("Reset password");
    expect(rendered.html).toContain("#1868F8");
    expect(rendered.html).toContain("sk_reset_test_token_456");
    expect(rendered.html).toContain("LINK EXPIRATION");
    expect(rendered.html).toContain("This reset link expires in 30 minutes.");
    expect(rendered.html).toContain("skipline-logo");
    expect(rendered.html).toContain("Join the queue. Not the crowd.");
    expect(rendered.html).not.toContain("undefined");

    // Plain text verification
    expect(rendered.text).toContain("Reset your Skipline password");
    expect(rendered.text).toContain("sk_reset_test_token_456");
    expect(rendered.text).toContain("LINK EXPIRATION");
    expect(rendered.text).toContain("30 minutes");
    expect(rendered.text).toContain("Join the queue. Not the crowd.");
    expect(rendered.text).not.toContain("undefined");
  });

  it("renderPasswordChangedEmail generates security notice with CTA and no sensitive tokens", () => {
    const rendered = renderPasswordChangedEmail({
      name: "Morgan Lee",
    });

    expect(rendered.subject).toBe("Your password was changed");
    expect(rendered.html).toContain("Your password was changed");
    expect(rendered.html).toContain("PASSWORD UPDATED");
    expect(rendered.html).toContain("Your password was changed successfully.");
    expect(rendered.html).toContain("Review your account");
    expect(rendered.html).toContain("secure your account immediately");
    expect(rendered.html).toContain("#1868F8");
    expect(rendered.html).toContain("skipline-logo");
    expect(rendered.html).not.toContain("undefined");

    // Plain text verification
    expect(rendered.text).toContain("Your password was changed");
    expect(rendered.text).toContain("PASSWORD UPDATED");
    expect(rendered.text).toContain("secure your account immediately");
    expect(rendered.text).toContain("/organizer/dashboard");

    // Strictly verify no token or password patterns
    expect(rendered.html).not.toMatch(/sk_verify|sk_reset|password123/i);
    expect(rendered.text).not.toMatch(/sk_verify|sk_reset|password123/i);
  });

  it("renderWelcomeEmail generates onboarding email with 3-step guide and dashboard CTA", () => {
    const rendered = renderWelcomeEmail({
      name: "Taylor Swift",
    });

    expect(rendered.subject).toBe("Welcome to Skipline");
    expect(rendered.html).toContain("Welcome to Skipline");
    expect(rendered.html).toContain("Open dashboard");
    expect(rendered.html).toContain("/organizer/dashboard");
    expect(rendered.html).toContain("#1868F8");
    expect(rendered.html).toContain("CREATE AN EVENT");
    expect(rendered.html).toContain("CREATE A QUEUE");
    expect(rendered.html).toContain("SHARE THE QR CODE");
    expect(rendered.html).toContain("Join the queue. Not the crowd.");
    expect(rendered.html).not.toContain("undefined");

    // Plain text verification
    expect(rendered.text).toContain("Welcome to Skipline");
    expect(rendered.text).toContain("Open dashboard:");
    expect(rendered.text).toContain("01 CREATE AN EVENT");
    expect(rendered.text).toContain("02 CREATE A QUEUE");
    expect(rendered.text).toContain("03 SHARE THE QR CODE");
    expect(rendered.text).toContain("Join the queue. Not the crowd.");
    expect(rendered.text).not.toContain("undefined");
  });

  it("production logo URL does not contain localhost or LAN addresses", () => {
    const logoUrl = emailConfig.getLogoUrl();
    expect(logoUrl).toContain("https://");
    expect(logoUrl).not.toContain("localhost");
    expect(logoUrl).not.toContain("127.0.0.1");
    expect(logoUrl).not.toContain("192.168.");
  });
});
