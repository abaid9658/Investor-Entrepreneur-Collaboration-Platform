import nodemailer from 'nodemailer';
import logger from './logger.js';

const sendEmail = async ({ email, subject, message, html }) => {
  try {
    // Check if SMTP settings are mock or dummy, log to console instead
    if (
      !process.env.SMTP_USER || 
      process.env.SMTP_USER === 'mock_user' || 
      process.env.SMTP_USER.includes('<')
    ) {
      logger.info(`[SMTP MOCK EMAIL LOG]
      TO: ${email}
      SUBJECT: ${subject}
      MESSAGE: ${message || '(HTML Content)'}
      `);
      return true;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '2525', 10),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@nexus-platform.com',
      to: email,
      subject,
      text: message,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`SMTP Email Send Failure: ${error.message}`);
    return false; // Safe return to not break registration flow on incorrect SMTP
  }
};

export default sendEmail;
