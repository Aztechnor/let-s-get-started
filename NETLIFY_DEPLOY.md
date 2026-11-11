# Storyhouse Deployment on Netlify

Complete step-by-step guide to deploy Storyhouse on Netlify in 10-15 minutes.

---

## Step 1: Prepare Your Repository

✅ **Already done!** Your code is ready in the `let-s-get-started` repository.

---

## Step 2: Set Up Supabase Database

### 2.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Enter a name: `storyhouse`
4. Select a region (choose one close to your users)
5. Click **"Create Project"** (wait 2-3 minutes for initialization)

### 2.2 Get Your Connection Details

Once the project is ready:
1. Go to **Project Settings** → **API**
2. Copy these values (you'll need them for Netlify):
   - `Project URL` → This is your `SUPABASE_URL`
   - `anon` (public) → This is your `SUPABASE_ANON_KEY`
   - `service_role` (secret) → This is your `SUPABASE_SERVICE_ROLE_KEY`

### 2.3 Create Database Tables

1. In Supabase, go to **SQL Editor** → **New Query**
2. Paste and run this SQL:

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reading_progress_email ON reading_progress(email);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_email);
```

3. Click **"Run"** to create all tables

### 2.4 Disable Row Level Security (RLS)

For the service role key to work properly:
1. Go to **Authentication** → **Policies**
2. Make sure RLS is **disabled** for all tables (or create policies that allow service role access)

---

## Step 3: Set Up Email Provider

Choose one email provider. **Resend** is recommended (free tier, easy setup).

### Option A: Resend (Recommended)

1. Go to [https://resend.com](https://resend.com) and sign up
2. Get your API key from the dashboard
3. Verify your domain:
   - Go to **Domains** → **Add Domain**
   - Enter your domain (e.g., `your-site.netlify.app` or your custom domain)
   - Add the DNS records to your domain provider
   - Wait for verification (usually instant to a few minutes)

### Option B: Postmark

1. Go to [https://postmarkapp.com](https://postmarkapp.com) and sign up
2. Get your Server Token (API key)
3. Add and verify your domain

### Option C: Supabase Email (if you have it enabled)

1. In Supabase, enable Email service
2. Set up your domain

---

## Step 4: Deploy to Netlify

### 4.1 Create a New Site on Netlify

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **GitHub** (authorize if needed)
4. Select your repository: `Aztechnor/let-s-get-started`
5. Click **"Deploy site"**

### 4.2 Configure Build Settings

In the deploy configuration:
- **Build command:** `bun run build` (or `npm run build`)
- **Publish directory:** `dist`
- **Node version:** `18` (or `20`)

Click **"Deploy site"**

---

## Step 5: Set Environment Variables in Netlify

### 5.1 Required Variables

Go to your Netlify site → **Site settings** → **Environment variables** → **Add a variable**

Add these **one by one**:

```
# 1. Admin Credentials
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-strong-password-here

# 2. Session Secret (generate with: openssl rand -hex 32)
SESSION_SECRET=your-32-character-random-secret-here

# 3. Supabase Connection
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 4. Email Configuration (choose one)

# For Resend:
EMAIL_PROVIDER=resend
EMAIL_FROM=storyhouse@your-domain.com
RESEND_API_KEY=re_your-api-key-here

# OR for Postmark:
# EMAIL_PROVIDER=postmark
# EMAIL_FROM=storyhouse@your-domain.com
# POSTMARK_API_KEY=your-postmark-key-here

# OR for Supabase Email:
# EMAIL_PROVIDER=supabase
# EMAIL_FROM=storyhouse@your-domain.com
```

**Important:** Make sure to check **"Show this variable in the Netlify UI"** so you can edit it later if needed.

### 5.2 Save and Redeploy

After adding all variables:
1. Go to **Deploys** tab
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for the build to complete (2-3 minutes)

---

## Step 6: Test Your Live App

### 6.1 Find Your App URL

Your app will be live at: `https://your-site-name.netlify.app`

### 6.2 Test Admin Access

1. Visit `https://your-site-name.netlify.app/admin`
2. Sign in with:
   - Email: `your-email@example.com` (from ADMIN_EMAIL)
   - Password: `your-strong-password-here` (from ADMIN_PASSWORD)
3. ✅ You should see the admin dashboard

### 6.3 Add Yourself as a Reader

1. In the admin dashboard, use **"Add Reader"** or **"Bulk Invite"**
2. Add your email address
3. ✅ You should see yourself in the reader list

### 6.4 Test Reader Sign-In

1. Visit `https://your-site-name.netlify.app/read`
2. Enter your email and click **"Send my code"**
3. **If email is configured:** Check your inbox for the code
4. **If email is NOT configured:** The code will appear in the UI (development mode)
5. Enter the code and sign in
6. ✅ You should be able to browse and read the books

### 6.5 Test Reading Progress

1. Start reading a chapter
2. Navigate to another page or refresh
3. Return to `/read`
4. ✅ You should continue from where you left off

### 6.6 Test Quote Studio

1. Visit `https://your-site-name.netlify.app/cards`
2. Select a quote and design
3. Click **"Download PNG"**
4. ✅ A beautiful quote card should download

---

## Step 7: Set Up Custom Domain (Optional)

If you want to use your own domain:

1. In Netlify, go to **Domain settings**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `storyhouse.your-domain.com`)
4. Follow the DNS verification steps
5. Update your email configuration to use the new domain

---

## Step 8: Enable HTTPS

✅ **Automatic!** Netlify enables HTTPS by default for all sites.

---

## Troubleshooting

### Problem: Build Fails

**Error:** "bun: command not found"

**Solution:** Change build command to `npm run build` in Netlify settings

---

**Error:** "Environment variable not found"

**Solution:** Double-check all environment variables are added in Netlify → Site settings → Environment variables

---

### Problem: Can't Sign In as Admin

**Error:** "Admin sign-in required" or "Email or password is incorrect"

**Solution:**
1. Verify ADMIN_EMAIL and ADMIN_PASSWORD match exactly
2. Check for typos (case-sensitive!)
3. Try resetting the password by updating the environment variable

---

### Problem: Email Not Sending

**Error:** No email received, no code shown

**Solution:**
1. Check that EMAIL_PROVIDER is set correctly
2. Verify your domain is verified with your email provider
3. Check the Netlify function logs for errors
4. In development mode (without email configured), codes appear in the UI

---

### Problem: Database Errors

**Error:** "relation does not exist" or "permission denied"

**Solution:**
1. Verify all 4 tables exist in Supabase
2. Check that SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are correct
3. Make sure RLS is disabled or proper policies are in place

---

## Success Checklist

- [ ] Supabase project created
- [ ] Database tables created
- [ ] Site deployed on Netlify
- [ ] Environment variables configured
- [ ] Admin sign-in works
- [ ] Reader sign-in works
- [ ] Reading progress saves
- [ ] Quote studio works
- [ ] Email delivery works (or codes show in UI)

---

## Need Help?

If you get stuck on any step, just tell me:
1. **What step you're on**
2. **What error or issue you're seeing**

And I'll help you solve it!

---

## Estimated Timeline

| Task | Time |
|------|------|
| Create Supabase project | 5 min |
| Create database tables | 2 min |
| Deploy to Netlify | 5 min |
| Set environment variables | 5 min |
| Test the app | 5 min |
| **Total** | **22 min** |

You can do this! 🚀
