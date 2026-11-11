# Storyhouse

> A private digital reading room for stories that stay with you.

Storyhouse is a secure, invite-only platform for sharing and reading collections of stories. Currently hosting **Under Blue Skies** and **SPOOK** by Blex Wakabi.

## Features

- **Invite-only access**: Readers join with one-time email codes
- **Reading progress**: Track your place across multiple books and chapters
- **Full-text search**: Search every story in the collection
- **Quote studio**: Create beautiful, shareable quote cards
- **Admin dashboard**: Manage readers, view activity, and send bulk invitations
- **PDF access**: Read the full book PDFs

## Quick Start

### Prerequisites

- Node.js 22+ (recommended: use [nvm](https://github.com/nvm-sh/nvm)) or Bun
- Bun is used for the committed lockfile and CI
- Supabase project (for production)

### Installation

```bash
# Clone the repository
git clone https://github.com/Aztechnor/let-s-get-started.git
cd let-s-get-started

# Install dependencies
bun install

# Start the development server
bun run dev
```

The app will be available at `http://localhost:3000` (or the port specified by Vite).

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and fill in the values locally. **Never commit `.env` or production credentials.**

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

# Application administration and sessions
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-long-unique-password
SESSION_SECRET=generate-at-least-32-random-bytes

# Transactional email: choose resend or postmark
EMAIL_PROVIDER=resend
EMAIL_FROM=reader@your-verified-domain.com
RESEND_API_KEY=your-resend-api-key
# For Postmark instead, use EMAIL_PROVIDER=postmark and POSTMARK_API_KEY.
```

Generate a session secret with `openssl rand -hex 32`. The application fails closed if `SESSION_SECRET` is missing or shorter than 32 bytes.

The production email integration supports Resend and Postmark. SMTP, the old Lovable placeholder, and the old Supabase RPC example are not treated as working providers. A provider must accept the message before the application reports successful delivery.

### Development Mode

In development mode without configured email, the sign-in flow will display the code directly in the UI for testing purposes.

## Project Structure

```
let-s-get-started/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── site-chrome.tsx   # Header, footer, branding
│   │   └── ui/               # Radix UI components
│   ├── routes/               # Page routes
│   │   ├── index.tsx         # Home page with library
│   │   ├── read.tsx          # Reader access & reading interface
│   │   ├── cards.tsx         # Quote studio
│   │   └── admin.tsx         # Admin dashboard
│   ├── lib/                  # Server utilities
│   │   ├── storyhouse.functions.ts  # Server functions (API)
│   │   ├── storyhouse-db.server.ts # Database utilities
│   │   ├── session.server.ts # Session management
│   │   ├── email.server.ts   # Email delivery
│   │   └── bulk-invitations.ts # Bulk invite parsing
│   ├── server/               # Server-side data
│   │   ├── books.json        # Book metadata
│   │   └── storyhouse-data.ts # Data access layer
│   ├── integrations/         # Third-party integrations
│   │   └── supabase/         # Supabase client setup
│   ├── styles.css           # Tailwind CSS + custom styles
│   └── storyhouse.css       # Legacy Storyhouse styles
├── supabase/                 # Supabase configuration
│   └── config.toml           # Supabase storage config
├── public/                  # Static assets
├── package.json
├── tsconfig.json
└── README.md
```

## Email Setup

Storyhouse uses email to deliver one-time sign-in codes to readers. You have several options:

### Option 1: Lovable Email (Recommended for Lovable-hosted projects)

Lovable provides managed transactional email. To enable:

1. Configure your sending domain in Lovable settings
2. The email templates will be automatically scaffolded
3. No code changes needed - the integration is automatic

### Option 2: Supabase Email (Self-hosted)

If using Supabase, you can use their email service:

```env
EMAIL_PROVIDER=supabase
```

Then update `src/lib/email.server.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export async function sendLoginCode(recipient: string, code: string): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )
  
  await supabase.rpc('send_login_code', {
    to_email: recipient,
    code
  })
}
```

### Option 3: Custom Email Provider

You can integrate with any email service (Resend, Postmark, SendGrid, etc.):

```typescript
// Example with Resend
export async function sendLoginCode(recipient: string, code: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: recipient,
      subject: 'Your Storyhouse sign-in code',
      html: `<p>Your sign-in code is: <strong>${code}</strong></p>`
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to send email')
  }
}
```

## Database Setup

### Local Development

For local development, you can use the Supabase local development tools:

```bash
# Install Supabase CLI
bun add --global supabase

# Start local Supabase
supabase start
```

### Production Database Schema

The database requires the following tables:

```sql
-- Readers who have access
CREATE TABLE allowed_readers (
  email TEXT PRIMARY KEY,
  display_name TEXT DEFAULT '',
  note TEXT DEFAULT '',
  active BOOLEAN DEFAULT TRUE,
  added_by TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- One-time sign-in codes
CREATE TABLE login_codes (
  email TEXT PRIMARY KEY REFERENCES allowed_readers(email),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0
);

-- Reading progress tracking
CREATE TABLE reading_progress (
  email TEXT NOT NULL REFERENCES allowed_readers(email),
  book_id TEXT NOT NULL,
  chapter_index INTEGER NOT NULL,
  chapter_count INTEGER NOT NULL,
  furthest_index INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (email, book_id)
);

-- Audit log for tracking actions
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_email TEXT DEFAULT '',
  detail TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_reading_progress_email ON reading_progress(email);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_email);
```

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run build:dev` | Build with development mode |
| `bun run preview` | Preview production build |
| `bun run lint` | Run ESLint |
| `bun run format` | Format code with Prettier |
| `bun run test` | Run all tests |
| `bun run test:watch` | Run tests in watch mode |

## Testing

The project uses [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run specific test file
bun run test src/test/bulk-invitations.test.ts
```

## Deployment

### With Lovable

1. Push changes to the connected branch
2. Changes automatically sync to Lovable
3. Deploy from the Lovable editor

### Self-hosted

1. Build the project:
   ```bash
   bun run build
   ```

2. The output will be in the `dist/` directory

3. Deploy to your hosting provider (Vercel, Netlify, Cloudflare Pages, etc.)

### Docker

Create a Dockerfile:

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "preview", "--host", "0.0.0.0"]
```

Build and run (provide the remaining application environment variables through your deployment secret manager):

```bash
docker build -t storyhouse .
docker run -p 3000:3000 --env-file .env storyhouse
```

## Admin Guide

### First Admin Setup

1. Set the `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables
2. Visit `/admin` and sign in with those credentials
3. Use the dashboard to invite readers

### Managing Readers

- **Add single reader**: Use the "Add Reader" form in the admin dashboard
- **Bulk invite**: Paste multiple email addresses (comma or newline separated) in the bulk invite form
- **Revoke access**: Toggle the "Active" status or click "Remove"
- **View progress**: The reader list shows each reader's current reading progress

### Bulk Invitation Statuses

When inviting readers in bulk, each email receives one of these statuses:

| Status | Meaning |
|--------|---------|
| `invited` | New reader added to the list |
| `reactivated` | Previously deactivated reader reactivated |
| `already_active` | Reader was already active |
| `invalid` | Invalid email address format |
| `admin_account` | Cannot invite the admin email |
| `failed` | Error adding the reader |

## Security

### Session Management

- Sessions use HMAC-signed cookies
- Session secret is configured via `SESSION_SECRET` environment variable
- Reader sessions are validated against the allowed_readers table on each request

### Rate Limiting

- Sign-in codes expire after 10 minutes
- Code resend cooldown: 45 seconds
- Maximum attempts per code: 5

### Recommendations

1. **Use HTTPS**: Always deploy with HTTPS enabled
2. **Strong secrets**: Use cryptographically random secrets for `SESSION_SECRET`
3. **Rotate credentials**: Rotate `ADMIN_PASSWORD`, `SESSION_SECRET`, and Supabase keys using a coordinated deployment
4. **Audit logs**: Review the audit log in the admin dashboard regularly

## Troubleshooting

### Email not sending

1. Verify your email provider is configured correctly
2. Check that environment variables are set
3. In development, codes are displayed in the UI (no email needed)

### Readers can't sign in

1. Verify the reader's email is in the `allowed_readers` table
2. Check that the reader's `active` status is `TRUE`
3. Ensure the sign-in code hasn't expired (10 minute TTL)

### Build errors

1. Run `bun install` to ensure all dependencies are installed
2. Check Node.js version (requires 22+ if not using Bun)
3. Clear node_modules and reinstall: `rm -rf node_modules && bun install`

## Technology Stack

- **Framework**: [TanStack React Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + [Tailwind CSS v4](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **State Management**: [TanStack Query](https://tanstack.com/query)
- **Testing**: [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)
- **Styling**: Tailwind CSS with custom Storyhouse design system

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests and lint: `bun run test && bun run lint`
5. Commit your changes (`git commit -m 'Add some feature'`)
6. Push to the branch (`git push origin feature/your-feature`)
7. Open a Pull Request

## License

Private project - all rights reserved.

## Credits

- Built with [Lovable](https://lovable.dev)
- Books by [Blex Wakabi](https://blexwakabi.com)
- Design inspired by the Library of Alexandria

---

For questions or support, please contact the project maintainer.


## Production Hardening Notes

Before deploying this branch, apply `drizzle/migrations/0002_auth_and_reader_hardening.sql` to Supabase. It creates an atomic database-backed rate limiter for code requests, code verification and administrator login, and adds cascading reader foreign keys for login codes and reading progress.

Rate-limit keys are HMACs of account identifiers, so the database does not store raw email addresses as rate-limit keys. These are per-account limits; configure a trusted edge/IP rate limiter at the hosting layer for broader abuse protection.

The PDF route checks current whitelist status on every request. Removing or deactivating a reader therefore blocks PDF access immediately, even if the browser still holds an unexpired session cookie.

The CI workflow runs tests, lint and a production build using the repository's Bun lockfile.
