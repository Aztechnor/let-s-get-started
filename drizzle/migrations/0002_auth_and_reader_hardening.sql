-- Storyhouse authentication and referential-integrity hardening.
-- Apply this migration before deploying code that calls consume_auth_rate_limit.

CREATE TABLE public.auth_rate_limits (
  key_hash TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.auth_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_auth_rate_limit(
  p_key_hash TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_attempt_count INTEGER;
  v_window_started_at TIMESTAMPTZ;
BEGIN
  IF p_key_hash IS NULL OR pg_catalog.length(p_key_hash) <> 64 OR p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid authentication rate-limit arguments';
  END IF;

  INSERT INTO public.auth_rate_limits (key_hash, attempt_count, window_started_at, updated_at)
  VALUES (p_key_hash, 0, pg_catalog.now(), pg_catalog.now())
  ON CONFLICT (key_hash) DO NOTHING;

  SELECT attempt_count, window_started_at
    INTO v_attempt_count, v_window_started_at
    FROM public.auth_rate_limits
    WHERE key_hash = p_key_hash
    FOR UPDATE;

  IF v_window_started_at <= pg_catalog.now() - pg_catalog.make_interval(secs => p_window_seconds) THEN
    UPDATE public.auth_rate_limits
       SET attempt_count = 1, window_started_at = pg_catalog.now(), updated_at = pg_catalog.now()
     WHERE key_hash = p_key_hash;
    RETURN TRUE;
  END IF;

  IF v_attempt_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE public.auth_rate_limits
     SET attempt_count = attempt_count + 1, updated_at = pg_catalog.now()
   WHERE key_hash = p_key_hash;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_auth_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_auth_rate_limit(TEXT, INTEGER, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_auth_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- NOT VALID leaves time to inspect old rows while enforcing new writes.
ALTER TABLE public.login_codes
  ADD CONSTRAINT login_codes_allowed_reader_fk
  FOREIGN KEY (email) REFERENCES public.allowed_readers(email)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE public.reading_progress
  ADD CONSTRAINT reading_progress_allowed_reader_fk
  FOREIGN KEY (email) REFERENCES public.allowed_readers(email)
  ON DELETE CASCADE NOT VALID;
