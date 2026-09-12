import { renderBaseTemplate } from "./base.template.js";
import {
  renderEmailHeading,
  renderEmailSubheading,
  renderEmailParagraph,
  renderEmailButton,
  renderEmailSteps,
} from "./email.components.js";
import { emailConfig } from "../email.config.js";

/**
 * Renders the official welcome onboarding email template for organizers.
 * @param {object} params
 * @param {string} [params.name]
 * @returns {{ subject: string, html: string, text: string }}
 */
export const renderWelcomeEmail = ({ name }) => {
  const dashboardUrl = `${emailConfig.appUrl}/organizer/dashboard`;

  const subject = "Welcome to Skipline";
  const preheader = "Welcome to Skipline. Join the queue. Not the crowd.";

  const greetingLine = name ? `Hi ${name},` : "Hello,";

  const contentHtml = `
    ${renderEmailHeading("Welcome to Skipline")}

    ${renderEmailSubheading("Your queues are about to get a lot easier to manage.")}

    ${renderEmailParagraph(greetingLine)}

    ${renderEmailParagraph(
      "Skipline helps event organizers manage queues so people can join, move freely, and return when it's their turn."
    )}

    ${renderEmailSteps()}

    ${renderEmailButton({
      label: "Open dashboard",
      url: dashboardUrl,
    })}
  `;

  const html = renderBaseTemplate({
    title: subject,
    preheader,
    contentHtml,
  });

  const text = `Skipline

Welcome to Skipline
Your queues are about to get a lot easier to manage.

${greetingLine}

Skipline helps event organizers manage queues so people can join, move freely, and return when it's their turn.

01 CREATE AN EVENT
Set up your event details.

02 CREATE A QUEUE
Configure how participants are served.

03 SHARE THE QR CODE
Let participants join without standing around.

Open dashboard:
${dashboardUrl}

Join the queue. Not the crowd.
© ${new Date().getFullYear()} Skipline`;

  return { subject, html, text };
};
