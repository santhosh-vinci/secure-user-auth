import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
    logger.info('Email sent', { to, subject });
  } catch (err) {
    logger.error('Failed to send email', { to, subject, error: err });
    // Do not throw — email failure should not crash the request
    // The caller handles the graceful degradation
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${env.APP_URL}/verify-email?token=${token}`;

  if (!env.isProduction) {
    logger.info(`[DEV] Verification link for ${to}: ${link}`);
  }

  await sendMail(
    to,
    'Verify your email address',
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#1a1d2e">Verify your email</h2>
      <p style="color:#555">Click the button below to verify your email address. This link expires in <strong>15 minutes</strong>.</p>
      <a href="${link}"
         style="display:inline-block;margin:24px 0;padding:12px 28px;background:#6c63ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Verify Email
      </a>
      <p style="color:#999;font-size:13px;">If you didn't create an account, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#bbb;font-size:12px;">Or copy this link: ${link}</p>
    </div>
    `,
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${env.APP_URL}/password-reset?token=${token}`;

  if (!env.isProduction) {
    logger.info(`[DEV] Password reset link for ${to}: ${link}`);
  }

  await sendMail(
    to,
    'Reset your password',
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#1a1d2e">Reset your password</h2>
      <p style="color:#555">Click the button below to set a new password. This link expires in <strong>15 minutes</strong>.</p>
      <a href="${link}"
         style="display:inline-block;margin:24px 0;padding:12px 28px;background:#6c63ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Reset Password
      </a>
      <p style="color:#999;font-size:13px;">If you didn't request a password reset, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#bbb;font-size:12px;">Or copy this link: ${link}</p>
    </div>
    `,
  );
}
