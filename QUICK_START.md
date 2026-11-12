# 
# Storyhouse Quick Start Guide

Get your Storyhouse app live on Netlify in **10-15 minutes**!

## 
 What You Need

- [x] GitHub repository (ready!)
- [ ] Supabase account (free)
- [ ] Netlify account (free)
- [ ] Email provider (Resend, Postmark, or Supabase - free tiers available)

## 
 Step-by-Step Deployment

### 
 1. Create Supabase Project (3 minutes)

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"New Project"** 
3. Enter name: `storyhouse`
4. Select region and create
5. Wait 2-3 minutes for initialization

**Get your connection details:**
- Go to **Project Settings > API**
- Copy:
  - `Project URL` → `SUPABASE_URL`
  - `anon` key → `SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

**Create database tables:**
- Go to **SQL Editor > New Query**
- Paste and run the SQL from `supabase/init.sql`

---

### 
 2. Set Up Email Provider (3 minutes)

**Option A: Resend (Recommended)**
1. Go to [https://resend.com](https://resend.com)
2. Sign up and get your API key
3. Add domain: Settings > Domains > Add Domain
4. Enter: `your-site.netlify.app`
5. Add DNS records and verify

**Option B: Postmark**
1. Go to [https://postmarkapp.com](https://postmarkapp.com)
2. Sign up and get Server Token
3. Add and verify your domain

---

### 
 3. Deploy to Netlify (2 minutes)

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click **"Add new site" > "Import an existing project"**
3. Select **GitHub**
4. Choose repository: `Aztechnor/let-s-get-started`
5. Click **"Deploy site"**

**Netlify will auto-detect:**
- Build command: `bun run build` (from netlify.toml)
- Publish directory: `dist` (from netlify.toml)

---

### 
 4. Set Environment Variables (5 minutes)

Go to: **Site settings > Environment variables > Add a variable**

**Required variables:**

```
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-strong-password
SESSION_SECRET=openssl-rand-hex-32
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EMAIL_PROVIDER=resend
EMAIL_FROM=storyhouse@your-domain.com
RESEND_API_KEY=re_your-api-key
```

**To generate SESSION_SECRET:**
```bash
openssl rand -hex 32
```

**Important:** Check **"Show this variable in the Netlify UI"** for each variable.

After adding all variables, click **"Trigger deploy" > "Deploy site"**

---

### 
 5. Test Your Live App (2 minutes)

1. Wait for deploy to complete (~2-3 minutes)
2. Visit: `https://your-site-name.netlify.app`

**Test Admin Access:**
1. Go to `/admin`
2. Sign in with your ADMIN_EMAIL and ADMIN_PASSWORD
3. ✅ You should see the admin dashboard

**Add Yourself as Reader:**
1. In admin dashboard, use **"Add Reader"**
2. Add your email
3. ✅ You should see yourself in the list

**Test Reader Sign-In:**
1. Go to `/read`
2. Enter your email, click **"Send my code"**
3. **If email configured:** Check inbox for code
4. **If NOT configured:** Code appears in UI (dev mode)
5. Enter code and sign in
6. ✅ You should be able to read books

---

## 
 Troubleshooting

### Build Fails
- **Error:** "bun: command not found"
- **Fix:** In Netlify, change build command to `npm run build`

### Can't Sign In
- **Error:** "Email or password is incorrect"
- **Fix:** Double-check ADMIN_EMAIL and ADMIN_PASSWORD (case-sensitive!)

### Email Not Sending
- **Error:** No email received
- **Fix:** 
  1. Verify EMAIL_PROVIDER is set
  2. Check domain is verified with email provider
  3. In dev mode (no email config), codes show in UI

### Database Errors
- **Error:** "relation does not exist"
- **Fix:** Verify all 4 tables exist in Supabase

---

## 
 Success Checklist

- [ ] Supabase project created
- [ ] Database tables created
- [ ] Site deployed on Netlify
- [ ] Environment variables configured
- [ ] Admin sign-in works
- [ ] Reader sign-in works
- [ ] Reading progress saves
- [ ] Quote studio works

---

## 
 Need Help?

If you get stuck, tell me:
1. **What step you're on**
2. **What error you're seeing**

I'll help you solve it!

---

## 
 Files to Reference

- `NETLIFY_DEPLOY.md` - Detailed deployment guide
- `DEPLOYMENT.md` - General deployment options
- `.env.example` - Environment variables template
- `netlify.toml` - Netlify configuration
- `supabase/init.sql` - Database schema

---

## 
 You're Ready! 

Your code is pushed to GitHub and ready to deploy. 
The netlify.toml file is configured, so Netlify will know how to build your app.

**Next step:** Go to [Netlify](https://app.netlify.com) and follow the steps above!

---

**Estimated time: 10-15 minutes**

