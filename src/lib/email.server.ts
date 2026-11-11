/**
 * Transactional email delivery for Storyhouse.
 *
 * Supports multiple email providers with a fallback for development.
 * In development mode without a configured provider, codes are displayed
 * in the UI instead of being emailed.
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

/**
 * Email provider types supported by Storyhouse.
 */
export type EmailProvider = "lovable" | "supabase" | "resend" | "postmark" | "smtp" | "none";

/**
 * Configuration for SMTP email provider.
 */
export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  username?: string;
  password?: string;
}

/**
 * Get the configured email provider from environment variables.
 */
function getEmailProvider(): EmailProvider {
  const provider = (process.env["EMAIL_PROVIDER"] ?? "").toLowerCase() as EmailProvider;
  
  // In production, default to lovable if using Lovable hosting
  if (import.meta.env.PROD && !provider) {
    return "lovable";
  }
  
  return provider || "none";
}

/**
 * Check if we're in development mode.
 */
function isDevelopment(): boolean {
  return !import.meta.env.PROD;
}

/**
 * Validate email address format.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Send a one-time sign-in code to a reader.
 *
 * In development mode without email configured, this returns the code
 * so it can be displayed in the UI.
 *
 * @param recipient - The email address to send the code to
 * @param code - The 6-digit sign-in code
 * @returns Promise that resolves when email is sent (or in dev mode, returns the code)
 * @throws EmailNotConfiguredError if email is not configured in production
 * @throws EmailDeliveryError if email sending fails
 */
export async function sendLoginCode(
  recipient: string,
  code: string
): Promise<{ delivered: boolean; devCode?: string }> {
  // Validate inputs
  if (!recipient || !code) {
    throw new EmailDeliveryError("Recipient email and code are required");
  }

  if (!isValidEmail(recipient)) {
    throw new EmailDeliveryError(`Invalid email address: ${recipient}`);
  }

  if (!/^\d{6}$/.test(code)) {
    throw new EmailDeliveryError("Code must be a 6-digit number");
  }

  const provider = getEmailProvider();

  // Development mode: return the code to display in UI
  if (isDevelopment() && provider === "none") {
    console.log(`[DEV] Login code for ${recipient}: ${code}`);
    return { delivered: false, devCode: code };
  }

  // Production mode: require email configuration
  if (import.meta.env.PROD && provider === "none") {
    throw new EmailNotConfiguredError(
      "Email delivery is not configured. Set EMAIL_PROVIDER environment variable."
    );
  }

  try {
    switch (provider) {
      case "lovable":
        return await sendWithLovable(recipient, code);

      case "supabase":
        return await sendWithSupabase(recipient, code);

      case "resend":
        return await sendWithResend(recipient, code);

      case "postmark":
        return await sendWithPostmark(recipient, code);

      case "smtp":
        return await sendWithSmtp(recipient, code);

      case "none":
      default:
        // In development, still return the code
        if (isDevelopment()) {
          console.log(`[DEV] Login code for ${recipient}: ${code}`);
          return { delivered: false, devCode: code };
        }
        throw new EmailNotConfiguredError(
          "No email provider configured. Set EMAIL_PROVIDER environment variable."
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown email delivery error";
    console.error(`[Email] Failed to send code to ${recipient}:`, error);
    throw new EmailDeliveryError(errorMessage, error instanceof Error ? error : undefined);
  }
}

/**
 * Send email using Lovable's managed email service.
 */
async function sendWithLovable(
  recipient: string,
  code: string
): Promise<{ delivered: boolean; devCode?: string }> {
  // Lovable's email service is automatically available in Lovable-hosted projects
  // The email template should be scaffolded in the Lovable editor
  
  try {
    // Try to use Lovable's email API
    // This is a placeholder - Lovable's actual email API will be available
    // when the project is deployed on Lovable
    const response = await fetch(
      `https://api.lovable.dev/projects/${process.env["LOVABLE_PROJECT_ID"]}/emails/send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
        },
        body: JSON.stringify({
          template: "login-code",
          to: recipient,
          data: { code },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Lovable email API error: ${response.status} ${JSON.stringify(errorData)}`
      );
    }

    console.log(`[Lovable Email] Code sent to ${recipient}`);
    return { delivered: true };
  } catch (error) {
    // In development on Lovable, we might not have the API available
    // Fall back to displaying the code
    if (isDevelopment()) {
      console.log(`[DEV/Lovable] Login code for ${recipient}: ${code}`);
      return { delivered: false, devCode: code };
    }
    throw error;
  }
}

/**
 * Send email using Supabase's email service.
 */
async function sendWithSupabase(
  recipient: string,
  code: string
): Promise<{ delivered: boolean }> {
  const { createClient } = await import("@supabase/supabase-js");
  
  const supabase = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_ANON_KEY"]!,
    {
      db: { schema: "extensions" },
    }
  );

  const fromEmail = process.env["EMAIL_FROM"] || "storyhouse@your-domain.com";
  
  const { error } = await supabase.rpc("send_login_code_email", {
    to_email: recipient,
    code,
    from_email: fromEmail,
  });

  if (error) {
    throw new Error(`Supabase email error: ${error.message}`);
  }

  console.log(`[Supabase Email] Code sent to ${recipient}`);
  return { delivered: true };
}

/**
 * Send email using Resend.
 */
async function sendWithResend(
  recipient: string,
  code: string
): Promise<{ delivered: boolean }> {
  const apiKey = process.env["RESEND_API_KEY"];
  const fromEmail = process.env["EMAIL_FROM"] || "storyhouse@your-domain.com";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is required");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipient,
      subject: "Your Storyhouse sign-in code",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Your Storyhouse sign-in code</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #20231f; font-size: 24px; margin-bottom: 20px;">Your Storyhouse sign-in code</h1>
            <p style="margin-bottom: 20px;">Here is your one-time sign-in code:</p>
            <div style="background: #f6f3ec; border: 1px solid #ded9ce; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #20231f;">${code}</span>
            </div>
            <p style="margin-bottom: 20px; color: #777a72; font-size: 14px;">
              This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
            </p>
            <p style="margin-bottom: 5px; color: #777a72; font-size: 12px;">
              Stories that stay with you, kept on a quiet shelf.
            </p>
            <p style="color: #777a72; font-size: 12px;">
              Storyhouse
            </p>
          </body>
        </html>
      `,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Resend API error: ${response.status} ${JSON.stringify(errorData)}`
    );
  }

  console.log(`[Resend] Code sent to ${recipient}`);
  return { delivered: true };
}

/**
 * Send email using Postmark.
 */
async function sendWithPostmark(
  recipient: string,
  code: string
): Promise<{ delivered: boolean }> {
  const apiKey = process.env["POSTMARK_API_KEY"];
  const fromEmail = process.env["EMAIL_FROM"] || "storyhouse@your-domain.com";

  if (!apiKey) {
    throw new Error("POSTMARK_API_KEY environment variable is required");
  }

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": apiKey,
    },
    body: JSON.stringify({
      From: fromEmail,
      To: recipient,
      Subject: "Your Storyhouse sign-in code",
      HtmlBody: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #20231f; font-size: 24px; margin-bottom: 20px;">Your Storyhouse sign-in code</h1>
            <p style="margin-bottom: 20px;">Here is your one-time sign-in code:</p>
            <div style="background: #f6f3ec; border: 1px solid #ded9ce; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #20231f;">${code}</span>
            </div>
            <p style="margin-bottom: 20px; color: #777a72; font-size: 14px;">
              This code will expire in 10 minutes.
            </p>
            <p style="color: #777a72; font-size: 12px;">
              Storyhouse - Stories that stay
            </p>
          </body>
        </html>
      `,
      TextBody: `Your Storyhouse sign-in code is: ${code}\n\nThis code will expire in 10 minutes.\n\nStories that stay with you, kept on a quiet shelf.\nStoryhouse`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Postmark API error: ${response.status} ${JSON.stringify(errorData)}`
    );
  }

  console.log(`[Postmark] Code sent to ${recipient}`);
  return { delivered: true };
}

/**
 * Send email using SMTP.
 */
async function sendWithSmtp(
  _recipient: string,
  _code: string
): Promise<{ delivered: boolean }> {
  throw new EmailNotConfiguredError("SMTP delivery is not implemented. Configure Resend or Postmark.");
}

/**
 * Generate the email subject for login codes.
 */
export function getLoginCodeSubject(): string {
  return "Your Storyhouse sign-in code";
}

/**
 * Generate the HTML body for login code emails.
 */
export function getLoginCodeHtmlBody(code: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Your Storyhouse sign-in code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #20231f; font-size: 24px; margin-bottom: 20px;">Your Storyhouse sign-in code</h1>
        <p style="margin-bottom: 20px;">Here is your one-time sign-in code:</p>
        <div style="background: #f6f3ec; border: 1px solid #ded9ce; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #20231f;">${code}</span>
        </div>
        <p style="margin-bottom: 20px; color: #777a72; font-size: 14px;">
          This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
        </p>
        <p style="margin-bottom: 5px; color: #777a72; font-size: 12px;">
          Stories that stay with you, kept on a quiet shelf.
        </p>
        <p style="color: #777a72; font-size: 12px;">
          Storyhouse
        </p>
      </body>
    </html>
  `;
}

/**
 * Generate the plain text body for login code emails.
 */
export function getLoginCodeTextBody(code: string): string {
  return `Your Storyhouse sign-in code is: ${code}

This code will expire in 10 minutes. If you didn't request this code, please ignore this email.

Stories that stay with you, kept on a quiet shelf.
Storyhouse`;
}
