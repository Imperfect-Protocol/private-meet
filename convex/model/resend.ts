export type EmailAttachment = {
  filename: string;
  content: string;
};

type EmailOptions = {
  to: string;
  reply_to?: string;
  attachments?: EmailAttachment[];
};

type TemplateEmail = EmailOptions & {
  template: {
    id: string;
    variables: Record<string, string | number | boolean>;
  };
  subject?: never;
  html?: never;
  text?: never;
};

type HtmlEmail = EmailOptions & {
  subject: string;
  html: string;
  text: string;
  template?: never;
};

export type OutgoingEmail = TemplateEmail | HtmlEmail;

const DEFAULT_FROM = "Private Meet <onboarding@resend.dev>";

/**
 * Sends email through Resend.
 * Supports both saved Resend templates and regular HTML emails.
 * Logs emails when AUTH_RESEND_KEY is unset (local development).
 */
export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY;

  if (!apiKey) {
    if (email.template) {
      console.info(
        `[Private Meet] Template email to ${email.to}:`,
        email.template.id
      );
    } else {
      console.info(
        `[Private Meet] Email to ${email.to}: ${email.subject}\n${email.text}`
      );
    }
    return;
  }

  const {
    reply_to,
    attachments,
    ...rest
  } = email;

  const payload = {
    from: process.env.MEET_FROM_EMAIL ?? DEFAULT_FROM,
    to: email.to,

    ...(reply_to ? { replyTo: reply_to } : {}),
    ...(attachments ? { attachments } : {}),

    ...("template" in rest
      ? { template: rest.template }
      : {
          subject: rest.subject,
          html: rest.html,
          text: rest.text,
        }),
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Resend rejected email: ${response.status} ${await response.text()}`
    );
  }
}
