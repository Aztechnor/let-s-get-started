# Storyhouse Deployment Guide

This guide will help you deploy Storyhouse to production.

## Quick Start Checklist

- [ ] Set required environment variables
- [ ] Configure email delivery
- [ ] Verify database tables exist
- [ ] Deploy to your hosting platform

---

## Option 1: Deploy on Lovable (Recommended)

Since this project was built with Lovable, this is the easiest path.

### Step 1: Set Environment Variables in Lovable

1. Go to [Lovable Editor](https://lovable.dev/projects/b2dbc748-1d54-48d4-a0f4-49120915c407)
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:

```
# Required for all environments
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password-here
SESSION_SECRET=generate-32-random-characters-here

# Email configuration (choose one provider)
EMAIL_PROVIDER=lovable
EMAIL_FROM=storyhouse@your-domain.com
```

**How to generate SESSION_SECRET:**
```bash
# On Linux/Mac:
openssl rand -hex 32

# Or use this random one (but generate your own for production):
SESSION_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

### Step 2: Configure Email Domain

1. In Lovable, go to **Settings** → **Email**
2. Add your domain (e.g., `your-domain.com` or a subdomain like `mail.your-domain.com`)
3. Follow the verification steps (add DNS records to your domain)
4. Once verified, Lovable will automatically scaffold the email templates

**Note:** Until email is configured, sign-in codes will be displayed in the UI in development mode.

### Step 3: Verify Database

Lovable projects come with a built-in Supabase database. Check if the tables exist:

1. In Lovable, go to **Database** or **Supabase** section
2. Verify these tables exist:
   - `allowed_readers`
   - `login_codes`
   - `reading_progress`
   - `audit_log`

If they don't exist, you can create them using the SQL from this file.

### Step 4: Deploy

1. Push your changes to the connected branch (already done ✅)
2. In Lovable, click **Deploy** or **Publish**
3. Your app will be live at your Lovable project URL

---

## Option 2: Self-Hosted Deployment

### Step 1: Set Up Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Get your connection details:
   - Project URL (SUPABASE_URL)
   - Anon key (SUPABASE_ANON_KEY)
   - Service role key (SUPABASE_SERVICE_ROLE_KEY)

### Step 2: Create Database Tables

Run this SQL in your Supabase SQL editor:

```sql
-- Readers who have access
CREATE TABLE IF NOT EXISTS allowed_readers (
  email TEXT PRIMARY KEY,
  display_name TEXT DEFAULT '',
  note TEXT DEFAULT '',
  active BOOLEAN DEFAULT TRUE,
  added_by TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- One-time sign-in codes
CREATE TABLE IF NOT EXISTS login_codes (
  email TEXT PRIMARY KEY REFERENCES allowed_readers(email) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0
);

-- Reading progress tracking
CREATE TABLE IF NOT EXISTS reading_progress (
  email TEXT NOT NULL REFERENCES allowed_readers(email) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter_index INTEGER NOT NULL,
  chapter_count INTEGER NOT NULL,
  furthest_index INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (email, book_id)
);

-- Audit log for tracking actions
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_email TEXT DEFAULT '',
  detail TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reading_progress_email ON reading_progress(email);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_email);
```

### Step 3: Set Environment Variables

Create a `.env` file or set in your hosting provider:

```env
# Required
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password
SESSION_SECRET=your-32-character-secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (choose one)
EMAIL_PROVIDER=resend  # or postmark, smtp
EMAIL_FROM=storyhouse@your-domain.com

# For Resend
RESEND_API_KEY=your-resend-api-key

# For Postmark
POSTMARK_API_KEY=your-postmark-api-key

# For SMTP
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USERNAME=your-username
SMTP_PASSWORD=your-password
SMTP_SECURE=false
```

### Step 4: Deploy to Hosting Provider

#### Vercel:
```bash
npm install -g vercel
vercel
# Follow prompts, set environment variables in Vercel dashboard
```

#### Netlify:
```bash
npm install -g netlify-cli
netlify deploy
# Set environment variables in Netlify site settings
```

#### Cloudflare Pages:
- Connect your GitHub repo
- Set build command: `bun run build`
- Set environment variables in project settings

#### Docker:
```bash
docker build -t storyhouse .
docker run -p 3000:3000 \
  -e ADMIN_EMAIL \
  -e ADMIN_PASSWORD \
  -e SESSION_SECRET \
  -e SUPABASE_URL \
  -e SUPABASE_ANON_KEY \
  -e SUPABASE_SERVICE_ROLE_KEY \
  -e EMAIL_PROVIDER \
  storyhouse
```

---

## Post-Deployment Checklist

Once deployed:

1. **Test Admin Access**
   - Visit `/admin`
   - Sign in with your ADMIN_EMAIL and ADMIN_PASSWORD
   - Verify you can see the dashboard

2. **Test Reader Flow**
   - Add your email as a reader via admin dashboard
   - Visit `/read` and request a sign-in code
   - Verify you receive the code (or see it in UI if email not configured)
   - Sign in and verify you can read books

3. **Test Reading Progress**
   - Read a chapter
   - Refresh the page
   - Verify you can continue from where you left off

4. **Test Quote Studio**
   - Visit `/cards`
   - Create and download a quote card

5. **Test Bulk Invitations**
   - In admin dashboard, invite multiple readers at once
   - Verify they receive invitations

---

## Troubleshooting

### Email not sending
- Verify EMAIL_PROVIDER is set correctly
- Check that your domain is verified
- In development, codes appear in the UI

### Can't sign in as admin
- Verify ADMIN_EMAIL and ADMIN_PASSWORD match exactly
- Check for typos in environment variables
- Try resetting the password

### Database errors
- Verify all tables exist
- Check that SUPABASE_URL and keys are correct
- Verify Row Level Security (RLS) is disabled for service role

### Build errors
- Run `bun install` or `npm install`
- Verify Node.js version (18+)
- Check for missing environment variables

---

## Security Checklist

Before going live:

- [ ] Use HTTPS (enforced by all major hosting providers)
- [ ] SESSION_SECRET is 32+ random characters
- [ ] ADMIN_PASSWORD is strong (12+ characters, mixed case, numbers, symbols)
- [ ] Database connection uses SSL
- [ ] Email domain is verified
- [ ] All environment variables are set
- [ ] No secrets in code or git history

---

## Need Help?

If you encounter any issues during deployment:

1. Check the console logs
2. Review the environment variables
3. Verify database connectivity
4. Test email configuration separately

The code is production-ready - it's just a matter of configuration!
