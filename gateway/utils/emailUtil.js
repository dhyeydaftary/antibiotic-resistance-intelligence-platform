const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a one-time-password email for signup verification or password reset.
 * @param {string} to - recipient email address
 * @param {string} code - the 6-digit OTP (plaintext, only used here for display in the email body)
 * @param {'verify' | 'reset'} purpose - which flow this OTP belongs to, controls the email copy
 */

async function sendOtpEmail(to, code, purpose = 'verify') {
  const subject =
    purpose === 'reset'
      ? 'AMR-Insight — Password reset code'
      : 'AMR-Insight — Verify your email';

  const heading =
    purpose === 'reset'
      ? 'Reset your password'
      : 'Verify your email address';

  const bodyText =
    purpose === 'reset'
      ? 'Use the code below to reset your AMR-Insight password. This code expires in 10 minutes.'
      : 'Use the code below to verify your email and activate your AMR-Insight account. This code expires in 10 minutes.';

  try {
    const result = await resend.emails.send({
      from: 'AMR-Insight <onboarding@resend.dev>',
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #12141A;">${heading}</h2>
          <p style="color: #5E6068;">${bodyText}</p>
          <p style="font-size: 32px; letter-spacing: 8px; font-weight: 600; color: #12141A; text-align: center; padding: 16px 0;">
            ${code}
          </p>
          <p style="color: #8A8D93; font-size: 12px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (result.error) {
      console.error('Resend API error:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true, id: result.data?.id };
  } catch (err) {
    console.error('Failed to send OTP email:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { sendOtpEmail };