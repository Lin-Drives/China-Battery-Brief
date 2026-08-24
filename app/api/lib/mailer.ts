import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import { env, mailEnabled } from "./env";

export type SendResult = {
  /** True when the mail was handed to an SMTP transport. */
  sent: boolean;
  messageId?: string;
  error?: string;
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!mailEnabled()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
      // Bound the SMTP handshake so an unreachable host can't hang a send.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }
  return transporter;
}

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

/**
 * Send a transactional / blast email over SMTP. Without SMTP credentials the
 * module degrades to log-mode (prints instead of sending) so dev and a
 * not-yet-configured production stay alive; callers treat that as a silent
 * no-op rather than a hard failure.
 */
export async function sendMail(mail: OutboundMail): Promise<SendResult> {
  const tx = getTransporter();
  if (!tx) {
    if (env.isProduction) {
      console.error("[mail] production running without SMTP credentials — email NOT sent");
    }
    console.log(`[mail:log] to=${mail.to} subject="${mail.subject}"`);
    return { sent: false };
  }
  try {
    const info = await tx.sendMail({
      from: `"${env.mail.fromName}" <${env.mail.fromEmail}>`,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: mail.replyTo,
    });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mail] send failed", message);
    return { sent: false, error: message };
  }
}
