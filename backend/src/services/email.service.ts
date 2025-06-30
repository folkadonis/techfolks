import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const mailOptions = {
      from: `"TechFolks" <${process.env.SMTP_USER || 'noreply@techfolks.com'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, '')
    };

    if (process.env.NODE_ENV === 'production') {
      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
    } else {
      logger.info(`[DEV] Email would be sent to: ${options.to}`);
      logger.info(`[DEV] Subject: ${options.subject}`);
    }
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  await sendEmail({
    to: email,
    subject: 'Verify your TechFolks account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to TechFolks!</h1>
            </div>
            <div class="content">
              <h2>Verify Your Account</h2>
              <p>Thank you for registering with TechFolks. To complete your registration and start solving problems, please verify your email address by clicking the button below:</p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account with TechFolks, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 TechFolks. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  await sendEmail({
    to: email,
    subject: 'Password Reset Request - TechFolks',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>You recently requested to reset your password for your TechFolks account. Click the button below to reset it:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
              <p>If you didn't request a password reset, please ignore this email. Your password won't be changed.</p>
              <p>For security reasons, we recommend that you:</p>
              <ul>
                <li>Use a strong, unique password</li>
                <li>Enable two-factor authentication (coming soon)</li>
                <li>Never share your password with anyone</li>
              </ul>
            </div>
            <div class="footer">
              <p>&copy; 2024 TechFolks. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  });
};