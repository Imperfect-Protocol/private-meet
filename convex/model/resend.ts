export type EmailAttachment = { filename: string; content: string };

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
};

const DEFAULT_FROM = "Private Meet <onboarding@resend.dev>";

/** Sends through the Resend REST API, or logs when AUTH_RESEND_KEY is unset (local dev). */
export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    console.info(`[Private Meet] Email to ${email.to}: ${email.subject}\n${email.text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.MEET_FROM_EMAIL ?? DEFAULT_FROM, ...email }),
  });

  if (!response.ok) {
    throw new Error(`Resend rejected email: ${response.status} ${await response.text()}`);
  }
}
