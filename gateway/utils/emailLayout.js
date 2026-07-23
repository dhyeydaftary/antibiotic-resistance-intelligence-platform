const BRAND = {
    ink: '#0F172A',
    inkSoft: '#334155',
    inkMuted: '#64748B',
    inkFaint: '#94A3B8',
    accent: '#5B4FE9',
    accentSoft: '#EEECFD',
    border: '#E5E7EB',
    panel: '#F8F9FB',
    background: '#FFFFFF',
};

// --- Reusable components ---

function logoBadge() {
    return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;">
      <tr>
        <td style="width:34px; height:34px; border-radius:50%; border:1.5px solid ${BRAND.ink}; text-align:center; vertical-align:middle;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="width:18px; height:18px; border-radius:50%; border:1.5px solid ${BRAND.accent}; text-align:center; vertical-align:middle;">
              <div style="width:6px; height:6px; border-radius:50%; background:${BRAND.ink}; margin:5px auto;"></div>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function divider() {
    return `<div style="height:1px; background:${BRAND.border}; margin: 28px 0;"></div>`;
}

function ctaButton(label, href) {
    return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 8px 0;">
      <tr>
        <td class="email-cta" style="background:${BRAND.ink}; border-radius:8px;">
          <a href="${href}" style="display:inline-block; padding:13px 28px; font-size:14px; font-weight:600; color:#FFFFFF; text-decoration:none; letter-spacing:0.2px;">
            ${label} &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;
}

function featureRow(title, description) {
    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 18px;">
      <tr>
        <td style="width:8px; vertical-align:top; padding-top:5px;">
          <div style="width:5px; height:5px; border-radius:50%; background:${BRAND.accent};"></div>
        </td>
        <td style="padding-left:12px;">
          <div style="font-size:14px; font-weight:600; color:${BRAND.ink}; margin-bottom:2px;">${title}</div>
          <div style="font-size:13px; color:${BRAND.inkMuted}; line-height:1.5;">${description}</div>
        </td>
      </tr>
    </table>
  `;
}

function infoBox(innerHtml, tone = 'neutral') {
    const bg = tone === 'accent' ? BRAND.accentSoft : BRAND.panel;
    return `
    <div style="background:${bg}; border-radius:10px; padding: 22px; margin: 4px 0 24px;">
      ${innerHtml}
    </div>
  `;
}

// --- Shell ---

function wrapEmail(innerHtml, previewText = '') {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>AMR-Insight</title>
      <style>
        @media only screen and (max-width: 520px) {
          .email-container { width: 100% !important; border-radius: 0 !important; }
          .email-header, .email-body, .email-footer { padding-left: 24px !important; padding-right: 24px !important; }
          .email-otp-code { font-size: 28px !important; letter-spacing: 6px !important; }
          .email-cta a { display:block !important; text-align:center !important; }
        }
      </style>
    </head>
    <body style="margin:0; padding:0; background:${BRAND.panel};">
      <span style="display:none; font-size:1px; color:${BRAND.panel}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
        ${previewText}
      </span>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.panel}; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" class="email-container" width="520" cellpadding="0" cellspacing="0" style="max-width: 520px; width: 100%; background: ${BRAND.background}; border: 1px solid ${BRAND.border}; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,0.04);">

              <tr>
                <td class="email-header" style="padding: 32px 40px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;">${logoBadge()}</td>
                      <td style="vertical-align:middle; padding-left:12px;">
                        <div style="font-size:17px; font-weight:700; color:${BRAND.ink}; letter-spacing:-0.3px; line-height:1.2;">AMR-Insight</div>
                        <div style="font-size:10px; color:${BRAND.inkFaint}; text-transform:uppercase; letter-spacing:1.2px; margin-top:2px;">Resistance Intelligence Platform</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr><td style="padding: 0 40px;"><div style="height:1px; background:${BRAND.border};"></div></td></tr>

              <tr>
                <td class="email-body" style="padding: 36px 40px;">
                  ${innerHtml}
                </td>
              </tr>

              <tr>
                <td class="email-footer" style="padding: 24px 40px 32px; background:${BRAND.panel}; border-top: 1px solid ${BRAND.border};">
                  <div style="font-size:12px; color:${BRAND.inkFaint}; line-height:1.6;">
                    AMR-Insight is a research and education platform, not a clinical diagnostic tool.
                    This is an automated message — please don't reply directly.
                  </div>
                  <div style="font-size:11px; color:${BRAND.inkFaint}; margin-top:14px;">
                    &copy; ${new Date().getFullYear()} AMR-Insight. All rights reserved.
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

module.exports = { wrapEmail, ctaButton, featureRow, infoBox, divider, BRAND };