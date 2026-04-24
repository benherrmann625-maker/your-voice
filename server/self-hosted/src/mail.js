import nodemailer from "nodemailer";
import { config } from "./config.js";
import { logger } from "./logger.js";

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: false,
  auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
});

export async function sendEmail({ to, subject, text, html }) {
  const info = await transporter.sendMail({
    from: config.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  logger.info({ event: "email.sent", messageId: info.messageId, to, subject }, "Transaktionsmail versendet");
  return info;
}
