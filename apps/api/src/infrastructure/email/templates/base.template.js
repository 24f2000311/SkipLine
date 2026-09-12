import { renderEmailShell } from "./email.components.js";

/**
 * Base email layout wrapper for Skipline transactional emails.
 * Uses the reusable EmailShell primitive matching Skipline's official visual design system.
 */
export const renderBaseTemplate = ({ title, preheader, contentHtml }) => {
  return renderEmailShell({ title, preheader, contentHtml });
};
