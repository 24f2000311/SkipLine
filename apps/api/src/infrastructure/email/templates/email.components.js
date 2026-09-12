import { emailConfig } from "../email.config.js";

/**
 * Reusable email primitives designed for high email client compatibility
 * (Gmail, Outlook, Apple Mail, iOS, Android) and matching Skipline's visual language.
 */

/**
 * Renders the top brand header with the official Skipline brand badge and white text inside the midnight navy bar.
 * Matches Image 2 reference with 100% client compatibility.
 */
export const renderEmailHeader = () => {
  const appUrl = emailConfig.appUrl;

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="left" style="padding: 26px 36px; background-color: #0F172A;">
          <a href="${appUrl}" target="_blank" style="display: inline-block; text-decoration: none;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: middle; padding-right: 8px; line-height: 1;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width: 8px; height: 8px; background-color: #1868F8; border-radius: 2px; font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align: middle; line-height: 1;">
                  <span class="skipline-logo" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 17px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">SKIPLINE</span>
                </td>
              </tr>
            </table>
          </a>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Primary heading in Skipline typography.
 * @param {string} text
 */
export const renderEmailHeading = (text) => `
  <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; line-height: 32px; color: #0F172A; letter-spacing: -0.3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    ${text}
  </h1>
`;

/**
 * Subheading / introductory lead copy in Skipline typography.
 * @param {string} text
 */
export const renderEmailSubheading = (text) => `
  <p style="margin: 0 0 20px 0; font-size: 15px; font-weight: 500; line-height: 24px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    ${text}
  </p>
`;

/**
 * Standard body text paragraph.
 * @param {string} text
 */
export const renderEmailParagraph = (text) => `
  <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 400; line-height: 24px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    ${text}
  </p>
`;

/**
 * Bulletproof primary CTA button in Skipline Royal Blue (#1868F8). Centered layout.
 * @param {object} params
 * @param {string} params.label
 * @param {string} params.url
 */
export const renderEmailButton = ({ label, url }) => `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 26px 0 26px 0;">
    <tr>
      <td align="center">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="16%" stroke="f" fillcolor="#1868F8">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${label}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${url}" target="_blank" style="display: inline-block; background-color: #1868F8; color: #FFFFFF !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; line-height: 20px; text-decoration: none; padding: 13px 32px; border-radius: 8px; text-align: center;">
          ${label}
        </a>
        <!--<![endif]-->
      </td>
    </tr>
  </table>
`;

/**
 * Subtle notice / expiration / security callout box.
 * @param {object} params
 * @param {string} [params.title]
 * @param {string} params.text
 * @param {'info' | 'warning'} [params.type='info']
 */
export const renderEmailNotice = ({ title, text, type = "info" }) => {
  const isWarning = type === "warning";
  const bgColor = isWarning ? "#FEF2F2" : "#F8FAFC";
  const borderColor = isWarning ? "#FECACA" : "#E2E8F0";
  const accentColor = isWarning ? "#DC2626" : "#1868F8";
  const textColor = isWarning ? "#991B1B" : "#334155";
  const titleColor = isWarning ? "#7F1D1D" : "#475569";

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background-color: ${bgColor}; border: 1px solid ${borderColor}; border-left: 3px solid ${accentColor}; border-radius: 8px;">
      <tr>
        <td style="padding: 14px 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          ${
            title
              ? `<div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${titleColor}; margin-bottom: 4px;">${title}</div>`
              : ""
          }
          <div style="font-size: 14px; font-weight: 500; line-height: 22px; color: ${textColor};">
            ${text}
          </div>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Fallback link block when button cannot be clicked.
 * @param {string} url
 */
export const renderEmailFallbackUrl = (url) => `
  <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #E2E8F0;">
    <p style="margin: 0 0 6px 0; font-size: 12px; line-height: 18px; color: #94A3B8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      If the button above does not work, copy and paste this URL into your browser:
    </p>
    <p style="margin: 0; font-size: 12px; line-height: 18px; word-break: break-all; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <a href="${url}" target="_blank" style="color: #1868F8; text-decoration: underline;">
        ${url}
      </a>
    </p>
  </div>
`;

/**
 * 3-step getting started guide for the Welcome email.
 */
export const renderEmailSteps = () => `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 22px 0 24px 0; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;">
    <tr>
      <td style="padding: 18px 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td valign="top" style="padding-bottom: 14px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="36" valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 800; color: #1868F8; line-height: 20px; letter-spacing: 0.04em;">
                    01
                  </td>
                  <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">
                      CREATE AN EVENT
                    </div>
                    <div style="font-size: 14px; color: #475569; line-height: 20px;">
                      Set up your event details.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td valign="top" style="padding-bottom: 14px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="36" valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 800; color: #1868F8; line-height: 20px; letter-spacing: 0.04em;">
                    02
                  </td>
                  <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">
                      CREATE A QUEUE
                    </div>
                    <div style="font-size: 14px; color: #475569; line-height: 20px;">
                      Configure how participants are served.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td valign="top">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="36" valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 800; color: #1868F8; line-height: 20px; letter-spacing: 0.04em;">
                    03
                  </td>
                  <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">
                      SHARE THE QR CODE
                    </div>
                    <div style="font-size: 14px; color: #475569; line-height: 20px;">
                      Let participants join without standing around.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

/**
 * Clean, consistent professional footer for all Skipline transactional emails.
 */
export const renderEmailFooter = () => {
  const currentYear = new Date().getFullYear();

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #F1F5F9;">
      <tr>
        <td align="center" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 18px; color: #94A3B8;">
          <p style="margin: 0 0 4px 0; font-weight: 700; color: #64748B;">Skipline</p>
          <p style="margin: 0 0 6px 0; color: #94A3B8;">Join the queue. Not the crowd.</p>
          <p style="margin: 0; color: #94A3B8;">This is an automated message from Skipline. Please do not reply.</p>
          <p style="margin: 4px 0 0 0; color: #CBD5E1;">&copy; ${currentYear} Skipline</p>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Standard EmailShell wrapper for all templates.
 * Responsive, table-based, mobile-friendly, with graceful dark-mode compatibility.
 */
export const renderEmailShell = ({ title, preheader, contentHtml }) => {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${title}</title>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      height: 100% !important;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      -webkit-font-smoothing: antialiased;
    }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-wrapper { padding-top: 8px !important; padding-bottom: 8px !important; }
      .email-card-cell { padding: 24px 20px !important; }
    }
    @media (prefers-color-scheme: dark) {
      body, .email-wrapper { background-color: #0B0F19 !important; }
      .email-card { background-color: #111827 !important; border-color: #1F2937 !important; }
      h1, h2, h3, strong { color: #F9FAFB !important; }
      p, li, td { color: #D1D5DB !important; }
      .notice-box { background-color: #1F2937 !important; border-color: #374151 !important; color: #9CA3AF !important; }
      .footer-text { color: #6B7280 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC;">
  <!-- Preheader text for email inbox preview -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #F8FAFC;">
    ${preheader || title}
  </div>

  <center class="email-wrapper" style="width: 100%; background-color: #F8FAFC; padding-top: 40px; padding-bottom: 40px;">
    <table class="email-container email-card" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
      <!-- Midnight Navy Header with Logo -->
      <tr>
        <td style="padding: 0; background-color: #0F172A;">
          ${renderEmailHeader()}
        </td>
      </tr>
      <!-- White Card Content Body -->
      <tr>
        <td class="email-card-cell" style="padding: 36px 36px 32px 36px; background-color: #FFFFFF;">
          ${contentHtml}
          ${renderEmailFooter()}
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};
