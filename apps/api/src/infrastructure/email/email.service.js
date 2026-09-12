import { resendClient } from "./resend.client.js";
import { renderVerificationEmail } from "./templates/verification.email.js";
import { renderPasswordResetEmail } from "./templates/password-reset.email.js";
import { renderPasswordChangedEmail } from "./templates/password-changed.email.js";
import { renderWelcomeEmail } from "./templates/welcome.email.js";
import logger from "../logger/logger.js";

/**
 * Domain-facing email service.
 * Isolates the rest of the application from Resend specifics.
 * All sends are executed with event-based idempotency keys and safe operational fault tolerance.
 */
export const emailService = {
  /**
   * Sends an email verification link to an organizer.
   * @param {object} user - User record (id, name, email)
   * @param {string} rawToken - Raw verification token (sent only in email)
   * @param {string} tokenId - Persisted AuthToken record ID
   */
  async sendVerificationEmail(user, rawToken, tokenId) {
    try {
      const { subject, html, text } = renderVerificationEmail({
        name: user.name,
        token: rawToken,
      });

      const idempotencyKey = `email-verification:${user.id}:${tokenId}`;

      return await resendClient.sendEmail({
        to: user.email,
        subject,
        html,
        text,
        idempotencyKey,
      });
    } catch (err) {
      logger.error(
        { userId: user.id, error: err.message },
        "Failed to dispatch verification email"
      );
      return { success: false, error: err.message };
    }
  },

  /**
   * Sends a password reset link to an organizer.
   * @param {object} user - User record (id, name, email)
   * @param {string} rawToken - Raw reset token
   * @param {string} tokenId - Persisted AuthToken record ID
   */
  async sendPasswordResetEmail(user, rawToken, tokenId) {
    try {
      const { subject, html, text } = renderPasswordResetEmail({
        name: user.name,
        token: rawToken,
      });

      const idempotencyKey = `password-reset:${user.id}:${tokenId}`;

      return await resendClient.sendEmail({
        to: user.email,
        subject,
        html,
        text,
        idempotencyKey,
      });
    } catch (err) {
      logger.error(
        { userId: user.id, error: err.message },
        "Failed to dispatch password reset email"
      );
      return { success: false, error: err.message };
    }
  },

  /**
   * Sends a security alert notification when a password has been updated.
   * @param {object} user - User record (id, name, email)
   * @param {string} [changeEventId] - Unique ID for the change event
   */
  async sendPasswordChangedEmail(user, changeEventId = Date.now().toString()) {
    try {
      const { subject, html, text } = renderPasswordChangedEmail({
        name: user.name,
      });

      const idempotencyKey = `password-changed:${user.id}:${changeEventId}`;

      return await resendClient.sendEmail({
        to: user.email,
        subject,
        html,
        text,
        idempotencyKey,
      });
    } catch (err) {
      logger.error(
        { userId: user.id, error: err.message },
        "Failed to dispatch password changed security alert email"
      );
      return { success: false, error: err.message };
    }
  },

  /**
   * Sends a welcome email upon successful email verification.
   * @param {object} user - User record (id, name, email)
   */
  async sendWelcomeEmail(user) {
    try {
      const { subject, html, text } = renderWelcomeEmail({
        name: user.name,
      });

      const idempotencyKey = `welcome:${user.id}`;

      return await resendClient.sendEmail({
        to: user.email,
        subject,
        html,
        text,
        idempotencyKey,
      });
    } catch (err) {
      logger.error(
        { userId: user.id, error: err.message },
        "Failed to dispatch welcome email"
      );
      return { success: false, error: err.message };
    }
  },
};
