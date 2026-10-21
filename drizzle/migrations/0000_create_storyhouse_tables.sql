CREATE TABLE public.allowed_readers (
  email TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  added_by TEXT NOT NULL DEFAULT '',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);
GRANT ALL ON public.allowed_readers TO service_role;

CREATE TABLE public.login_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
GRANT ALL ON public.login_codes TO service_role;

CREATE TABLE public.audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_email TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.allowed_readers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;