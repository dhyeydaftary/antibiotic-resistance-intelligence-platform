const { Resend } = require('resend');
const { wrapEmail, ctaButton, featureRow, divider, BRAND } = require('./emailLayout');
const { logError } = require('./logger');

const resend = new Resend(process.env.RESEND_API_KEY);

// Builds and sends the first-login welcome email via Resend.
/**
 * Sends a one-time welcome email after a user's first successful authenticated session.
 */
async function sendWelcomeEmail(to, name) {
  const firstName = (name || '').split(' ')[0] || 'there';
  const frontendUrl = process.env.FRONTEND_URL || '#';

  const features = [
    featureRow('Run predictions', 'Enter patient and organism data to get antibiotic susceptibility predictions across 15 antibiotics.'),
    featureRow('See why, not just what', 'Every result comes with SHAP explainability and a plain-English AI summary.'),
    featureRow('Track and export', 'Filter your prediction history, compare cases side by side, and export as PDF, CSV, or JSON.'),
  ].join('');

  const inner = `
    <h1 style="font-size:24px; font-weight:700; color:${BRAND.ink}; margin:0 0 10px; line-height:1.3;">
      Welcome, ${firstName}.
    </h1>
    <p style="font-size:14.5px; color:${BRAND.inkMuted}; line-height:1.65; margin:0 0 28px;">
      Your account is verified and ready. AMR-Insight uses trained machine learning models to help you
      explore antibiotic resistance patterns, aligned with WHO AWaRe classification — built as a research
      and education tool for students and researchers.
    </p>

    ${features}

    ${divider()}

    <p style="font-size:13.5px; color:${BRAND.inkSoft}; margin:0 0 20px;">
      Ready to run your first prediction?
    </p>

    ${ctaButton('Get started', `${frontendUrl}/predict`)}
  `;

  try {
    const result = await resend.emails.send({
      from: 'AMR-Insight <onboarding@resend.dev>',
      to,
      subject: 'Welcome to AMR-Insight',
      html: wrapEmail(inner, `Welcome to AMR-Insight, ${firstName} — here's how to get started`),
    });

    if (result.error) {
      logError('Resend API error (welcome email)', { error: result.error });
      return { success: false, error: result.error };
    }
    return { success: true, id: result.data?.id };
  } catch (err) {
    logError('Failed to send welcome email', { err });
    return { success: false, error: err.message };
  }
}

module.exports = { sendWelcomeEmail };