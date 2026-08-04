const { Resend } = require('resend');
const { wrapEmail, ctaButton, featureRow, infoBox, divider, BRAND } = require('./emailLayout');
const { logError } = require('./logger');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a one-time-password email for signup verification or password reset.
 */
async function sendOtpEmail(to, code, purpose = 'verify') {
  const subject =
    purpose === 'reset'
      ? 'Your AMR-Insight password reset code'
      : 'Verify your AMR-Insight account';

  const heading = purpose === 'reset' ? 'Reset your password' : 'Confirm your email';

  const bodyText =
    purpose === 'reset'
      ? "We received a request to reset your AMR-Insight password. Enter the code below to continue — it's valid for 10 minutes."
      : "You're one step away from activating your AMR-Insight account. Enter the code below to confirm your email — it's valid for 10 minutes.";

  const otpBlock = infoBox(`
    <div style="text-align:center;">
      <div style="font-size:11px; color:${BRAND.inkFaint}; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:12px;">Verification code</div>
      <div class="email-otp-code" style="font-size:34px; font-weight:700; letter-spacing:10px; color:${BRAND.ink}; font-family: 'SF Mono', Consolas, monospace;">
        ${code}
      </div>
      <div style="font-size:12px; color:${BRAND.inkMuted}; margin-top:12px;">Expires in 10 minutes</div>
    </div>
  `, 'accent');

  const inner = `
    <h1 style="font-size:22px; font-weight:700; color:${BRAND.ink}; margin:0 0 10px; line-height:1.3;">
      ${heading}
    </h1>
    <p style="font-size:14px; color:${BRAND.inkMuted}; line-height:1.6; margin:0 0 28px;">
      ${bodyText}
    </p>

    ${otpBlock}

    <p style="font-size:12.5px; color:${BRAND.inkFaint}; line-height:1.6; margin:0;">
      For your security, never share this code with anyone — AMR-Insight will never ask for it directly.
      If you didn't request this, you can safely ignore this email.
    </p>
  `;

  try {
    const result = await resend.emails.send({
      from: 'AMR-Insight <onboarding@resend.dev>',
      to,
      subject,
      html: wrapEmail(inner, `Your verification code is ${code}`),
    });

    if (result.error) {
      logError('Resend API error', { error: result.error });
      return { success: false, error: result.error };
    }
    return { success: true, id: result.data?.id };
  } catch (err) {
    logError('Failed to send OTP email', { err });
    return { success: false, error: err.message };
  }
}

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

module.exports = { sendOtpEmail, sendWelcomeEmail };