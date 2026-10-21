# Storyhouse migration roadmap

1. [x] Inspect archive, decide architecture with user (rebuild + keep email-code invites)
2. [ ] Migration: reader tables (allowed_readers, login_codes, audit_log) in Lovable Cloud
3. [ ] Assets: cover images via Lovable Assets; PDFs into private storage bucket
4. [ ] Server layer: session cookies (HMAC), auth fns (request/verify code, admin login, logout, me), library/chapter/search fns, admin CRUD fns, PDF server route
5. [ ] Design port: storyhouse.css into styles pipeline
6. [ ] Pages: home (/), reader (/read), quote studio (/cards), admin (/admin) with original design
7. [ ] Email: wait for user email-domain setup, scaffold transactional templates, wire send-code
8. [ ] Admin secrets: request ADMIN_EMAIL / ADMIN_PASSWORD via secure form
9. [ ] Verify: build, reader sign-in flow, chapter read, search, admin dashboard, PDF access
10. [ ] Handoff: request existing reader list export (SQLite allowed_readers)
