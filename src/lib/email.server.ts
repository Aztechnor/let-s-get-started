/**
 * One-time sign-in code delivery.
 *
 * Uses Lovable's managed transactional email. Until the sender domain is
 * verified, sending throws EmailNotConfiguredError; the request-code handler
 * surfaces a clear message and, in the dev preview only, shows the code.
 */
export class EmailNotConfiguredError extends Error {
  code = "EMAIL_NOT_CONFIGURED";
}

export async function sendLoginCode(recipient: string, code: string): Promise<void> {
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const result = await sendTemplateEmail("sign-in-code", recipient, {
    templateData: { code },
  });
  if (!result.sent) {
    throw new Error("The sign-in email could not be delivered to this address.");
  }
}
