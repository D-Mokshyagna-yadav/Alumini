import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import logger from './logger';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Verify connection on startup
transporter.verify().then(() => {
  logger.startup('✉️  Gmail SMTP ready');
}).catch((err) => {
  console.error('✉️  Gmail SMTP error:', err.message);
});

/* ─── Brand constants ─── */
const BRAND = {
  accent: '#0A4174',
  accentDark: '#001D39',
  accentLight: '#BDD8E9',
  bgBody: '#f0f4f8',
  bgCard: '#ffffff',
  textPrimary: '#0a0a0a',
  textSecondary: '#555e6e',
  textMuted: '#8a929e',
  border: '#e2e8f0',
  collegeName: 'MIC College of Technology',
  platformName: 'MIC Alumni Network',
  // Logo file path for CID embedding in emails
  logoPath: path.resolve(__dirname, '..', '..', '..', 'client', 'public', 'logo-small.png'),
  location: 'Kanchikacherla, N.T.R District, Andhra Pradesh – 521180',
};

/* Pre-read the logo once at startup as a Buffer for CID inline embedding.
   Gmail requires X-Attachment-Id matching the CID to treat images as truly
   inline — they won't appear in the attachment list. */
let logoBuf: Buffer | null = null;
try {
  logoBuf = fs.readFileSync(BRAND.logoPath);
} catch {
  logger.warn('⚠️  College logo not found at', BRAND.logoPath, '– emails will omit it');
}

/**
 * Build the type-specific icon using a table-based circle (Gmail-compatible).
 * Gmail strips <svg> and doesn't support display:flex, so we use table-cell centering.
 */
function iconBlock(type: 'register' | 'reset' | 'login'): string {
  const map: Record<string, { emoji: string; bg: string }> = {
    register: { emoji: '&#9993;', bg: '#e0f2fe' },
    reset:    { emoji: '&#128273;', bg: '#fef3c7' },
    login:    { emoji: '&#128274;', bg: '#e0e7ff' },
  };
  const { emoji, bg } = map[type];
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
      <tr>
        <td style="width:64px;height:64px;border-radius:50%;background:${bg};text-align:center;vertical-align:middle;font-size:28px;line-height:64px;">
          ${emoji}
        </td>
      </tr>
    </table>`;
}

/**
 * Send a 6-digit OTP email with a website-matching branded template.
 * @param to    recipient email
 * @param otp   6-digit code
 * @param type  'register' | 'reset' | 'login'
 */
export async function sendOtpEmail(to: string, otp: string, type: 'register' | 'reset' | 'login') {
  const subject = type === 'register'
    ? `${BRAND.platformName} – Verify Your Email`
    : type === 'login'
    ? `${BRAND.platformName} – Login Verification Code`
    : `${BRAND.platformName} – Reset Your Password`;

  const heading = type === 'register'
    ? 'Verify Your Email Address'
    : type === 'login'
    ? 'Two-Step Verification'
    : 'Password Reset Request';

  const message = type === 'register'
    ? `Thank you for registering with ${BRAND.collegeName} Alumni Network. Use the code below to verify your email address.`
    : type === 'login'
    ? 'A sign-in attempt was made on your account. Use the code below to complete the login.'
    : 'We received a request to reset your password. Use the code below to proceed.';

  const actionHint = type === 'register'
    ? 'Once verified, your account will be reviewed by an admin before activation.'
    : type === 'login'
    ? 'If this wasn\'t you, change your password immediately.'
    : 'If you didn\'t request a password reset, you can safely ignore this email.';

  /* Split OTP digits for styled boxes */
  const otpBoxes = otp.split('').map(d =>
    `<td style="width:44px;height:52px;text-align:center;vertical-align:middle;font-size:26px;font-weight:700;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.accent};background:${BRAND.accentLight}22;border:2px solid ${BRAND.accentLight};border-radius:10px;">${d}</td>`
  ).join('<td style="width:8px;"></td>');

  const year = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND.bgBody};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;">

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bgBody};padding:32px 16px;">
<tr><td align="center">

<!-- Main card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${BRAND.bgCard};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(10,65,116,0.08);">

  <!-- Header band -->
  <tr>
    <td style="background:linear-gradient(135deg,${BRAND.accent},${BRAND.accentDark});padding:28px 32px;text-align:center;">
      <!-- College logo (CID inline – hidden from attachment list via X-Attachment-Id) -->
      ${logoBuf ? `<img src="cid:collegeLogo" alt="${BRAND.collegeName}" width="52" height="52" style="display:block;margin:0 auto 10px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);" />` : ''}
      <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">${BRAND.platformName}</h1>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">${BRAND.collegeName}</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:36px 32px 24px;">

      <!-- Icon -->
      ${iconBlock(type)}

      <!-- Heading -->
      <h2 style="margin:0 0 8px;text-align:center;font-size:22px;font-weight:700;color:${BRAND.textPrimary};">${heading}</h2>
      <p style="margin:0 0 28px;text-align:center;font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">${message}</p>

      <!-- OTP code -->
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr>${otpBoxes}</tr>
      </table>

      <!-- Timer badge -->
      <p style="text-align:center;margin:0 0 24px;">
        <span style="display:inline-block;padding:6px 16px;background:#fef3c7;border-radius:20px;font-size:12px;font-weight:600;color:#92400e;">
          ⏱ Expires in 10 minutes
        </span>
      </p>

      <!-- Divider -->
      <hr style="border:none;border-top:1px solid ${BRAND.border};margin:0 0 20px;" />

      <!-- Hint -->
      <p style="margin:0;text-align:center;font-size:13px;line-height:1.5;color:${BRAND.textMuted};">${actionHint}</p>

    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid ${BRAND.border};">
      <p style="margin:0 0 4px;text-align:center;font-size:12px;color:${BRAND.textMuted};">
        ${BRAND.collegeName} Alumni Network
      </p>
      <p style="margin:0 0 8px;text-align:center;font-size:11px;color:${BRAND.textMuted};">
        ${BRAND.location}
      </p>
      <p style="margin:0;text-align:center;font-size:11px;color:${BRAND.textMuted};">
        © ${year} ${BRAND.platformName} &middot; All rights reserved
      </p>
    </td>
  </tr>

</table>
<!-- /Main card -->

<!-- Anti-phishing note -->
<p style="margin:20px 0 0;text-align:center;font-size:11px;color:${BRAND.textMuted};max-width:520px;">
  This is an automated message from ${BRAND.platformName}. Please do not reply to this email.
  If you did not request this code, you can safely ignore this message.
</p>

</td></tr>
</table>
<!-- /Outer wrapper -->

</body>
</html>
`;

  await transporter.sendMail({
    from: `"${BRAND.platformName}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    attachments: logoBuf
      ? [
          {
            filename: 'logo.png',
            content: logoBuf,
            contentType: 'image/png',
            cid: 'collegeLogo',
            contentDisposition: 'inline' as const,
            headers: {
              'X-Attachment-Id': 'collegeLogo',
            },
          },
        ]
      : [],
  });
}

/* ─── Shared mail-sending helper (DRY) ─── */
const logoAttachments = () =>
  logoBuf
    ? [
        {
          filename: 'logo.png',
          content: logoBuf,
          contentType: 'image/png',
          cid: 'collegeLogo',
          contentDisposition: 'inline' as const,
          headers: { 'X-Attachment-Id': 'collegeLogo' },
        },
      ]
    : [];

const logoImg = () =>
  logoBuf
    ? `<img src="cid:collegeLogo" alt="${BRAND.collegeName}" width="52" height="52" style="display:block;margin:0 auto 10px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);" />`
    : '';

/* ─── Shared HTML shell ─── */
function emailShell(body: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND.bgBody};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bgBody};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${BRAND.bgCard};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(10,65,116,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,${BRAND.accent},${BRAND.accentDark});padding:28px 32px;text-align:center;">
      ${logoImg()}
      <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">${BRAND.platformName}</h1>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">${BRAND.collegeName}</p>
    </td>
  </tr>
  <tr><td style="padding:36px 32px 24px;">${body}</td></tr>
  <tr>
    <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid ${BRAND.border};">
      <p style="margin:0 0 4px;text-align:center;font-size:12px;color:${BRAND.textMuted};">${BRAND.collegeName} Alumni Network</p>
      <p style="margin:0 0 8px;text-align:center;font-size:11px;color:${BRAND.textMuted};">${BRAND.location}</p>
      <p style="margin:0;text-align:center;font-size:11px;color:${BRAND.textMuted};">© ${year} ${BRAND.platformName} &middot; All rights reserved</p>
    </td>
  </tr>
</table>
<p style="margin:20px 0 0;text-align:center;font-size:11px;color:${BRAND.textMuted};max-width:520px;">
  This is an automated message from ${BRAND.platformName}. Please do not reply to this email.
</p>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Send a "You're on the waitlist" email after registration (when auto-approve is off).
 */
export async function sendWaitlistEmail(to: string, name: string) {
  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
      <tr>
        <td style="width:64px;height:64px;border-radius:50%;background:#e0f2fe;text-align:center;vertical-align:middle;font-size:28px;line-height:64px;">
          &#9203;
        </td>
      </tr>
    </table>
    <h2 style="margin:0 0 8px;text-align:center;font-size:22px;font-weight:700;color:${BRAND.textPrimary};">You're on the Waitlist!</h2>
    <p style="margin:0 0 24px;text-align:center;font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">
      Hi <strong>${name}</strong>, thank you for registering with the <strong>${BRAND.collegeName}</strong> Alumni Network.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:${BRAND.accentLight}15;border:1px solid ${BRAND.accentLight}40;border-radius:12px;">
      <tr>
        <td style="padding:20px;text-align:center;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${BRAND.accent};">Account Under Review</p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:${BRAND.textSecondary};">
            An administrator will review your details and approve your account shortly.
            You'll receive an email notification once your account is activated.
          </p>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid ${BRAND.border};margin:0 0 20px;" />
    <p style="margin:0;text-align:center;font-size:13px;line-height:1.5;color:${BRAND.textMuted};">
      This usually takes less than 24 hours. If you have questions, contact your alumni coordinator.
    </p>`;

  await transporter.sendMail({
    from: `"${BRAND.platformName}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${BRAND.platformName} – Registration Received`,
    html: emailShell(body),
    attachments: logoAttachments(),
  });
}

/**
 * Send an "Account Approved" email when admin verifies a user.
 */
export async function sendApprovedEmail(to: string, name: string) {
  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
      <tr>
        <td style="width:64px;height:64px;border-radius:50%;background:#d1fae5;text-align:center;vertical-align:middle;font-size:28px;line-height:64px;">
          &#9989;
        </td>
      </tr>
    </table>
    <h2 style="margin:0 0 8px;text-align:center;font-size:22px;font-weight:700;color:${BRAND.textPrimary};">Account Approved!</h2>
    <p style="margin:0 0 24px;text-align:center;font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">
      Hi <strong>${name}</strong>, great news! Your alumni account has been approved by an administrator.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#d1fae515;border:1px solid #d1fae540;border-radius:12px;">
      <tr>
        <td style="padding:20px;text-align:center;">
          <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#059669;">You're All Set</p>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:${BRAND.textSecondary};">
            You now have full access to the ${BRAND.collegeName} Alumni Network. Connect with fellow alumni, discover events, explore jobs, and more.
          </p>
          <a href="#" style="display:inline-block;padding:12px 32px;background:${BRAND.accent};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
            Go to Dashboard
          </a>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid ${BRAND.border};margin:0 0 20px;" />
    <p style="margin:0;text-align:center;font-size:13px;line-height:1.5;color:${BRAND.textMuted};">
      Welcome to the community! We're glad to have you.
    </p>`;

  await transporter.sendMail({
    from: `"${BRAND.platformName}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${BRAND.platformName} – Your Account Has Been Approved!`,
    html: emailShell(body),
    attachments: logoAttachments(),
  });
}

export default transporter;
