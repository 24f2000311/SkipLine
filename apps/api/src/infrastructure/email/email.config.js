import dotenv from "dotenv";

dotenv.config();

export const emailConfig = {
  apiKey: process.env.RESEND_API_KEY || "",
  from: process.env.EMAIL_FROM || "Skipline <notifications@skipline.madhavaghav.in>",
  appUrl: (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, ""),
  logoUrl: process.env.EMAIL_LOGO_URL || "https://skipline.madhavaghav.in/skipline-logo.png",
  verificationTokenTtlMinutes: Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES) || 1440, // 24 hours
  resetTokenTtlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES) || 30, // 30 minutes

  /**
   * Generates absolute public URL for official Skipline logo.
   * Uses public HTTPS domain even in development so external email clients can load the image.
   * @returns {string}
   */
  getLogoUrl() {
    if (process.env.EMAIL_LOGO_URL) {
      return process.env.EMAIL_LOGO_URL;
    }
    if (this.appUrl && !this.appUrl.includes("localhost") && !this.appUrl.includes("127.0.0.1")) {
      return `${this.appUrl}/skipline-logo.png`;
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
