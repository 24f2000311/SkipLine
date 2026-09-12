import { renderBaseTemplate } from "./base.template.js";
import {
  renderEmailHeading,
  renderEmailParagraph,
  renderEmailButton,
  renderEmailNotice,
} from "./email.components.js";
import { emailConfig } from "../email.config.js";

/**
 * Renders the official password changed security notification email template.
 * @param {object} params
 * @param {string} [params.name]
 * @returns {{ subject: string, html: string, text: string }}
 */
export const renderPasswordChangedEmail = ({ name }) => {
  const dashboardUrl = `${emailConfig.appUrl}/organizer/dashboard`;

  const subject = "Your password was changed";
  const preheader = "Security alert: Your Skipline password was changed.";

  const greetingLine = name
    ? `Hi ${name}, your Skipline password was successfully changed.`
    : "Your Skipline password was successfully changed.";

  const contentHtml = `
    ${renderEmailHeading("Your password was changed")}

    ${renderEmailParagraph(greetingLine)}

    ${renderEmailNotice({
      title: "PASSWORD UPDATED",
      text: "Your password was changed successfully.",
      type: "info",
    })}

    <div style="margin: 18px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 22px; color: #334155;">
      <p style="margin: 0 0 10px 0;">
        If you made this change, no further action is needed. For your security, all active login sessions on other devices have been signed out.
      </p>
      <p style="margin: 0; color: #B91C1C; font-weight: 500;">
        If you didn't make this change, secure your account immediately.
      </p>
    </div>

    ${renderEmailButton({
      label: "Review your account",
      url: dashboardUrl,
    })}
  `;

  const html = renderBaseTemplate({
    title: subject,
    preheader,
    contentHtml,
  });

  const text = `Skipline

Your password was changed

${greetingLine}

PASSWORD UPDATED
Your password was changed successfully.

If you made this change, no further action is needed. For your security, all active login sessions on other devices have been signed out.

If you didn't make this change, secure your account immediately:
${dashboardUrl}

Review your account:
${dashboardUrl}

Join the queue. Not the crowd.
© ${new Date().getFullYear()} Skipline`;

  return { subject, html, text };
};
