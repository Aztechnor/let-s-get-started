/**
 * Transactional email delivery for Storyhouse.
 *
 * Only providers with a real HTTP delivery implementation are supported.
 * A provider is never reported as successful unless its API accepts the email.
 */

export class EmailNotConfiguredError extends Error {
  code = "EMAIL_NOT_CONFIGURED";
}

export class EmailDeliveryError extends Error {
  code = "EMAIL_DELIVERY_FAILED";
  originalError: Error | undefined;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.originalError = originalError;
  }
}

export type EmailProvider = "resend" | "postmark" | "none";

function getEmailProvider(): EmailProvider {
  const provider = (process.env["EMAIL_PROVIDER"] ?? "").trim().toLowerCase() || "none";
  if (provider === "resend" || provider === "postmark" || provider === "none") return provider;
  throw new EmailNotConfiguredError(
    `Unsupported EMAIL_PROVIDER "${provider}". Configure "resend" or "postmark".`,
  );
}

function getFromEmail(): string {
  const email = (process.env["EMAIL_FROM"] ?? "").trim();
  const parts = email.split("@");
  if (
    email.length > 254 ||
    parts.length !== 2 ||
    !parts[0] ||
    !parts[1]?.includes(".") ||
    email.includes(" ") ||
    parts[1]?.startsWith(".") ||
    parts[1]?.endsWith(".")
  ) {
    throw new EmailNotConfiguredError("EMAIL_FROM must be configured with a verified sender address.");
  }
  return email;
}

function isValidEmail(email: string): boolean {
  const parts = email.split("@");
  return email.length <= 254 && parts.length === 2 && Boolean(parts[0] && parts[1]?.includes(".")) && !email.includes(" ");
}

function isDevelopment(): boolean {
  return !import.meta.env.PROD;
}

export async function sendLoginCode(
  recipient: string,
  code: string,
): Promise<{ delivered: boolean; devCode?: string }> {
  if (!recipient || !code) throw new EmailDeliveryError("Recipient email and code are required");
  if (!isValidEmail(recipient)) throw new EmailDeliveryError("Invalid email address");
  if (!/^[0-9]{6}$/.test(code)) throw new EmailDeliveryError("Code must be a 6-digit number");

  const provider = getEmailProvider();
  if (provider === "none") {
    if (isDevelopment()) {
      console.log(`[DEV] Login code generated for ${recipient}`);
      return { delivered: false, devCode: code };
    }
    throw new EmailNotConfiguredError(
      "Email delivery is not configured. Set EMAIL_PROVIDER and the corresponding provider credentials.",
    );
  }

  try {
    if (provider === "resend") return await sendWithResend(recipient, code);
    return await sendWithPostmark(recipient, code);
  } catch (error) {
    console.error(`[Email] Delivery failed using ${provider}:`, error);
    throw new EmailDeliveryError(
      error instanceof Error ? error.message : "Unknown email delivery error",
      error instanceof Error ? error : undefined,
    );
  }
}

async function sendWithResend(recipient: string, code: string): Promise<{ delivered: true }> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) throw new EmailNotConfiguredError("RESEND_API_KEY is required for the Resend provider.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: getFromEmail(),
      to: [recipient],
      subject: getLoginCodeSubject(),
      html: getLoginCodeHtmlBody(code),
      text: getLoginCodeTextBody(code),
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Resend rejected the email (${response.status}): ${details.slice(0, 500)}`);
  }
  return { delivered: true };
}

async function sendWithPostmark(recipient: string, code: string): Promise<{ delivered: true }> {
  const apiKey = process.env["POSTMARK_API_KEY"];
  if (!apiKey) throw new EmailNotConfiguredError("POSTMARK_API_KEY is required for the Postmark provider.");

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Postmark-Server-Token": apiKey },
    body: JSON.stringify({
      From: getFromEmail(),
      To: recipient,
      Subject: getLoginCodeSubject(),
      HtmlBody: getLoginCodeHtmlBody(code),
      TextBody: getLoginCodeTextBody(code),
      MessageStream: "outbound",
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Postmark rejected the email (${response.status}): ${details.slice(0, 500)}`);
  }
  return { delivered: true };
}

export function getLoginCodeSubject(): string {
  return "Your Storyhouse sign-in code";
}

export function getLoginCodeHtmlBody(code: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8"><title>Your Storyhouse sign-in code</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #20231f; font-size: 24px; margin-bottom: 20px;">Your Storyhouse sign-in code</h1>
        <p style="margin-bottom: 20px;">Here is your one-time sign-in code:</p>
        <div style="background: #f6f3ec; border: 1px solid #ded9ce; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #20231f;">${code}</span>
        </div>
        <p style="margin-bottom: 20px; color: #777a72; font-size: 14px;">This code will expire in 10 minutes. If you didn't request this code, please ignore this email.</p>
        <p style="margin-bottom: 5px; color: #777a72; font-size: 12px;">Stories that stay with you, kept on a quiet shelf.</p>
        <p style="color: #777a72; font-size: 12px;">Storyhouse</p>
      </body>
    </html>
  `;
}

export function getLoginCodeTextBody(code: string): string {
  return `Your Storyhouse sign-in code is: ${code}

This code will expire in 10 minutes. If you didn't request this code, please ignore this email.

Stories that stay with you, kept on a quiet shelf.
Storyhouse`;
}
