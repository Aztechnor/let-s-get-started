# Storyhouse migration roadmap

1. [x] Inspect archive, decide architecture with user (rebuild + keep email-code invites)
2. [x] Migration: reader tables (allowed_readers, login_codes, audit_log, reading_progress) in Lovable Cloud
3. [x] Assets: cover images via Lovable Assets; PDFs into private storage bucket
4. [x] Server layer: session cookies (HMAC), auth fns, library/chapter/search, admin CRUD, PDF server route
5. [x] Design port: storyhouse.css into styles pipeline
6. [x] Pages: home (/), reader (/read), quote studio (/cards), admin (/admin) with original design
7. [x] Admin secrets: ADMIN_EMAIL / ADMIN_PASSWORD / SESSION_SECRET saved
8. [ ] Email: wait for user email-domain setup, scaffold transactional templates, wire send-code
9. [x] Verify: build clean, reader code sign-in, chapter reading, progress save + restore on return
      (search, admin dashboard, and PDF access still to spot-check)
10. [ ] Handoff: request existing reader list export (SQLite allowed_readers)
11. [x] Admin dashboard: add bulk reader invitations with per-address results
