import dotenv from "dotenv";

dotenv.config();

export const emailConfig = {
  get apiKey() {
    return process.env.RESEND_API_KEY || "";
  },
  get from() {
    return process.env.EMAIL_FROM || "Skipline <notifications@skipline.madhavaghav.in>";
  },
  get appUrl() {
    return (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  get logoUrl() {
    return process.env.EMAIL_LOGO_URL || "https://skipline.madhavaghav.in/skipline-logo.png";
  },
  get verificationTokenTtlMinutes() {
    return Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES) || 1440; // 24 hours
  },
  get resetTokenTtlMinutes() {
    return Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES) || 30; // 30 minutes
  },

  /**
   * Generates absolute public URL for official Skipline logo.
   * Uses public HTTPS domain even in development so external email clients can load the image.
   * @returns {string}
   */
  getLogoUrl() {
    if (process.env.EMAIL_LOGO_URL) {
      return process.env.EMAIL_LOGO_URL;
    }
    const currentAppUrl = this.appUrl;
    if (currentAppUrl && !currentAppUrl.includes("localhost") && !currentAppUrl.includes("127.0.0.1")) {
      return `${currentAppUrl}/skipline-logo.png`;
    }
    return "https://skipline.madhavaghav.in/skipline-logo.png";
  },

  /**
   * Generates browser verification URL.
   * @param {string} token
   * @returns {string}
   */
  getVerificationUrl(token) {
    return `${this.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  },

  /**
   * Generates browser password reset URL.
   * @param {string} token
   * @returns {string}
   */
  getPasswordResetUrl(token) {
    return `${this.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  },
};
