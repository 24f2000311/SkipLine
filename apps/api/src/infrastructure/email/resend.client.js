import { Resend } from "resend";
import { emailConfig } from "./email.config.js";
import logger from "../logger/logger.js";

// Test-environment email capture for assertions
let sentEmailsHistory = [];

export const getSentEmails = () => [...sentEmailsHistory];
export const clearSentEmails = () => {
  sentEmailsHistory = [];
};

/**
 * Mask an email address for safe logging (e.g., j***e@example.com).
 * @param {string} email
 * @returns {string}
 */
const maskEmail = (email) => {
  if (!email || typeof email !== "string") return "***";
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  if (local.length <= 2) return `*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

/**
 * Resend client adapter.
 * Isolated layer responsible for communicating with the Resend API.
 */
class ResendClient {
  constructor() {
    this._client = null;
  }

  getClient() {
    if (!this._client && emailConfig.apiKey && emailConfig.apiKey !== "mock") {
      this._client = new Resend(emailConfig.apiKey);
    }
    return this._client;
  }

  /**
   * Sends an email via Resend with idempotency support.
   * @param {object} params
   * @param {string} params.to - Recipient email address
   * @param {string} params.subject - Email subject
   * @param {string} params.html - HTML content
   * @param {string} [params.text] - Plain-text fallback
   * @param {string} params.idempotencyKey - Deterministic event idempotency key
   * @returns {Promise<{ id: string, success: boolean }>}
   */
  async sendEmail({ to, subject, html, text, idempotencyKey }) {
    if (!to) {
      throw new Error("Recipient email address 'to' is required");
    }

    const payload = {
      from: emailConfig.from,
      to: [to],
      subject,
      html,
      text: text || "",
    };

    // In test environment or when no valid API key is present: simulate send
    const isTest = process.env.NODE_ENV === "test";
    const isSimulated = !emailConfig.apiKey || emailConfig.apiKey === "mock" || isTest;

    if (isSimulated) {
      const simulatedId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const record = {
        id: simulatedId,
        to,
        subject,
        html,
        text,
        idempotencyKey,
        sentAt: new Date().toISOString(),
      };
      sentEmailsHistory.push(record);

      logger.info(
        {
          to: maskEmail(to),
          subject,
          idempotencyKey,
          simulated: true,
        },
        "Transactional email send simulated (test/no-key mode)"
      );

      return { id: simulatedId, success: true };
    }

    try {
      const client = this.getClient();
      if (!client) {
        throw new Error("Resend client not initialized");
      }

      const response = await client.emails.send(payload, {
        headers: {
          "Idempotency-Key": idempotencyKey,
          "X-Entity-Ref-ID": idempotencyKey,
        },
      });

      if (response.error) {
        logger.error(
          {
            to: maskEmail(to),
            subject,
            idempotencyKey,
            errorName: response.error.name,
            errorMessage: response.error.message,
          },
          "Resend API reported send failure"
        );
        return { success: false, error: response.error.message };
      }

      logger.info(
        {
          to: maskEmail(to),
          subject,
          emailId: response.data?.id,
          idempotencyKey,
        },
        "Transactional email sent successfully via Resend"
      );

      return { id: response.data?.id, success: true };
    } catch (err) {
      // Safe operational failure logging: no sensitive tokens or passwords logged
      logger.error(
        {
          to: maskEmail(to),
          subject,
          idempotencyKey,
          error: err.message,
        },
        "Operational error during Resend email dispatch"
      );

      return { success: false, error: err.message };
    }
  }
}

export const resendClient = new ResendClient();
