import { renderBaseTemplate } from "./base.template.js";
import {
  renderEmailHeading,
  renderEmailParagraph,
  renderEmailButton,
  renderEmailNotice,
  renderEmailFallbackUrl,
} from "./email.components.js";
import { emailConfig } from "../email.config.js";

/**
 * Renders the official password reset email template.
 * @param {object} params
 * @param {string} [params.name]
 * @param {string} params.token
 * @returns {{ subject: string, html: string, text: string }}
 */
export const renderPasswordResetEmail = ({ name, token }) => {
  const resetUrl = emailConfig.getPasswordResetUrl(token);

  const subject = "Reset your Skipline password";
  const preheader = "Reset the password for your Skipline organizer account.";

  const greetingLine = name ? `Hi ${name},` : "";

  const contentHtml = `
    ${renderEmailHeading("Reset your Skipline password")}

    ${greetingLine ? renderEmailParagraph(greetingLine) : ""}

    ${renderEmailParagraph("We received a request to reset the password for your Skipline account.")}

    ${renderEmailButton({
      label: "Reset password",
      url: resetUrl,
    })}

    ${renderEmailNotice({
      title: "LINK EXPIRATION",
      text: "This reset link expires in 30 minutes.",
    })}

    <p style="margin: 18px 0 0 0; font-size: 14px; line-height: 22px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      If you didn't request a password reset, you can safely ignore this email. Your password will not change unless you use this link.
    </p>

    ${renderEmailFallbackUrl(resetUrl)}
  `;

  const html = renderBaseTemplate({
    title: subject,
    preheader,
    contentHtml,
  });

  const text = `Skipline

Reset your Skipline password

${greetingLine ? `${greetingLine}\n\n` : ""}We received a request to reset the password for your Skipline account.

Reset your password:
${resetUrl}

LINK EXPIRATION
This reset link expires in 30 minutes.

If you didn't request a password reset, you can safely ignore this email. Your password will not change unless you use this link.

If the button doesn't work, copy and paste the link above into your browser.

Join the queue. Not the crowd.
© ${new Date().getFullYear()} Skipline`;

  return { subject, html, text };
};
