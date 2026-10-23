/**
 * One-time sign-in code delivery.
 *
 * Uses Lovable's managed transactional email. Until the sender domain is
 * verified and the email templates are scaffolded, sending throws
 * EmailNotConfiguredError; the request-code handler surfaces a clear message
 * and, in the dev preview only, shows the code.
 */
export class EmailNotConfiguredError extends Error {
  code = "EMAIL_NOT_CONFIGURED";
}

export async function sendLoginCode(_recipient: string, _code: string): Promise<void> {
  // Replaced with the scaffolded Lovable email template once the sending
  // domain is verified (see src/lib/email-templates/).
  throw new EmailNotConfiguredError("Email delivery is not configured yet.");
}
