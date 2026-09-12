import { renderBaseTemplate } from "./base.template.js";
import {
  renderEmailHeading,
  renderEmailParagraph,
  renderEmailButton,
  renderEmailFallbackUrl,
} from "./email.components.js";
import { emailConfig } from "../email.config.js";

/**
 * Renders the official email verification template matching Skipline brand guidelines.
 * @param {object} params
 * @param {string} [params.name]
 * @param {string} params.token
 * @returns {{ subject: string, html: string, text: string }}
 */
export const renderVerificationEmail = ({ name, token }) => {
  const verificationUrl = emailConfig.getVerificationUrl(token);

  const subject = "Verify your Skipline email";
  const preheader = "Please confirm your email address to activate your organizer account and start managing queues.";

  const greetingLine = name ? `Hello ${name},` : "Hello,";
  const introLine = "Thanks for signing up for Skipline. Please confirm your email address to activate your organizer account and start managing queues.";

  const contentHtml = `
    ${renderEmailHeading("Verify your email address")}

    ${renderEmailParagraph(greetingLine)}

    ${renderEmailParagraph(introLine)}

    ${renderEmailButton({
      label: "Verify Email Address",
      url: verificationUrl,
    })}

    <p style="margin: 24px 0 16px 0; font-size: 13px; line-height: 20px; color: #64748B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      This verification link will expire in 24 hours. If you did not create a Skipline account, you can safely ignore this message.
    </p>

    ${renderEmailFallbackUrl(verificationUrl)}
  `;

  const html = renderBaseTemplate({
    title: subject,
    preheader,
    contentHtml,
  });

  const text = `Skipline

Verify your email address

${greetingLine}

${introLine}

Verify Email Address:
${verificationUrl}

This verification link will expire in 24 hours. If you did not create a Skipline account, you can safely ignore this message.

Join the queue. Not the crowd.`;

  return { subject, html, text };
};
