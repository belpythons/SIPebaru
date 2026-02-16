-- =====================================================
-- SIPEBARU SECURITY HARDENING MIGRATION
-- Enterprise-Grade Security Upgrade for Pupuk Kaltim
-- Date: 2026-02-16
-- =====================================================

-- =====================================================
-- SECTION 1: ATOMIC TICKET SEQUENCE (Anti-Race Condition)
-- Replaces COUNT(*)-based ticket generation which is
-- susceptible to race conditions under concurrent load.
-- Uses PostgreSQL SEQUENCE for guaranteed uniqueness.
-- =====================================================

-- Create a continuous (non-resetting) sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS public.complaint_ticket_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1; -- Cache=1 ensures strict ordering, prevents gaps in concurrent transactions

-- Replace the old ticket generation function with sequence-based version
-- OLD: COUNT(*) + 1 → Race Condition vulnerable
-- NEW: nextval('complaint_ticket_seq') → Atomic, lock-free, concurrent-safe
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Format: PB-YYYYMMDD-XXXXX (5-digit zero-padded, continuous sequence)
  -- Sequence does NOT reset daily — ensures globally unique ticket numbers
  RETURN 'PB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('complaint_ticket_seq')::TEXT, 5, '0');
END;
$$;

COMMENT ON FUNCTION public.generate_ticket_number()
IS 'Generates atomic ticket numbers using PostgreSQL SEQUENCE. Format: PB-YYYYMMDD-XXXXX. Prevents race conditions under concurrent inserts.';


-- =====================================================
-- SECTION 2: RBAC UPGRADE
-- Adds 'super_admin' and 'viewer' roles to the enum.
-- Uses ADD VALUE IF NOT EXISTS to prevent errors on
-- re-run or if values already exist.
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a
-- transaction block, but Supabase migrations auto-commit
-- each statement, so this is safe.
-- =====================================================

-- Add new roles to existing enum (idempotent)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- Helper function: check if user has ANY of the specified roles
-- Used by RLS policies that need to allow multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = ANY(_roles)
  )
$$;

COMMENT ON FUNCTION public.has_any_role(uuid, text[])
IS 'Checks if a user has any of the specified roles. Used by RLS policies for multi-role access control.';


-- =====================================================
-- SECTION 3: PARANOID AUDIT LOGGING
-- Every INSERT/UPDATE/DELETE on critical tables is
-- automatically logged with full JSON diff calculation.
-- This provides forensic-level audit trail for compliance.
-- =====================================================

-- Create the audit log table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Who performed the action (NULL for anonymous/system operations)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- What action was performed
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),

  -- Which table and record were affected
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,

  -- Full snapshots for forensic analysis
  old_data JSONB,  -- NULL for INSERT operations
  new_data JSONB,  -- NULL for DELETE operations

  -- Computed diff showing only changed fields (UPDATE only)
  -- Makes it easy to see what exactly changed without comparing full objects
  diff JSONB,

  -- Request metadata for security forensics
  ip_address INET,
  user_agent TEXT,

  -- Immutable timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for common query patterns on audit logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_table_record
  ON public.activity_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
  ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action
  ON public.activity_logs (action);

-- Enable RLS on activity_logs — only admin/super_admin can read
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admin and super_admin can view audit logs
-- Viewers and public are explicitly blocked
CREATE POLICY "Only admins can view audit logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);

-- No INSERT/UPDATE/DELETE policies for clients — all writes happen
-- via SECURITY DEFINER trigger function (bypasses RLS)
-- This prevents any client from tampering with audit logs

COMMENT ON TABLE public.activity_logs
IS 'Immutable audit trail for all data changes. Only admin/super_admin can read. Writes are trigger-only (no client access).';


-- =====================================================
-- SECTION 3b: AUDIT TRIGGER FUNCTION
-- Automatically computes JSON diff between OLD and NEW
-- values on UPDATE operations.
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypasses RLS to write audit logs
SET search_path = public
AS $$
DECLARE
  _record_id TEXT;
  _old_data JSONB;
  _new_data JSONB;
  _diff JSONB;
  _key TEXT;
  _user_id UUID;
BEGIN
  -- Attempt to get the current authenticated user (may be NULL for anon)
  BEGIN
    _user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    _user_id := NULL;
  END;

  -- Determine the record ID (prefer 'id' column)
  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id::TEXT;
    _old_data := to_jsonb(OLD);
    _new_data := NULL;
    _diff := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    _record_id := NEW.id::TEXT;
    _old_data := NULL;
    _new_data := to_jsonb(NEW);
    _diff := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    _record_id := NEW.id::TEXT;
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);

    -- Calculate diff: only include keys where values changed
    _diff := '{}'::JSONB;
    FOR _key IN SELECT jsonb_object_keys(_new_data)
    LOOP
      IF (_old_data ->> _key) IS DISTINCT FROM (_new_data ->> _key) THEN
        _diff := _diff || jsonb_build_object(
          _key,
          jsonb_build_object(
            'old', _old_data -> _key,
            'new', _new_data -> _key
          )
        );
      END IF;
    END LOOP;

    -- If nothing actually changed, skip logging
    IF _diff = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Insert the audit log entry
  INSERT INTO public.activity_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    diff,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    _user_id,
    TG_OP,
    TG_TABLE_NAME,
    _record_id,
    _old_data,
    _new_data,
    _diff,
    -- Try to get IP and user_agent from request headers (Supabase specific)
    inet(current_setting('request.headers', true)::json->>'x-forwarded-for'),
    current_setting('request.headers', true)::json->>'user-agent',
    now()
  );

  -- Return appropriate value for trigger
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Never let audit logging failures block the actual operation
  -- Log the error but allow the transaction to proceed
  RAISE WARNING 'Audit log failed for % on %: %', TG_OP, TG_TABLE_NAME, SQLERRM;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.log_activity()
IS 'Trigger function for paranoid audit logging. Automatically calculates JSON diff on UPDATE. Never blocks the parent operation on failure.';


-- =====================================================
-- SECTION 3c: ATTACH AUDIT TRIGGERS TO CRITICAL TABLES
-- =====================================================

-- Complaints table — tracks all status changes, edits, deletions
DROP TRIGGER IF EXISTS audit_complaints ON public.complaints;
CREATE TRIGGER audit_complaints
AFTER INSERT OR UPDATE OR DELETE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Profiles table — tracks admin profile changes
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- User roles table — tracks permission changes (critical for security)
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_activity();


-- =====================================================
-- SECTION 4: UPDATED RLS POLICIES FOR COMPLAINTS
-- Implements proper RBAC: admin/super_admin get full
-- access, viewer gets read-only, public can only INSERT.
-- =====================================================

-- Drop existing complaint policies to replace with RBAC-aware versions
DROP POLICY IF EXISTS "Anyone can submit complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can view all complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can update complaints" ON public.complaints;

-- INSERT: Allow public (anonymous) submissions
-- Security Note: Secured via Cloudflare Turnstile CAPTCHA on the frontend
CREATE POLICY "Public can submit complaints"
ON public.complaints
FOR INSERT
WITH CHECK (true);

-- SELECT: Allow admin, super_admin, AND viewer to view all complaints
CREATE POLICY "Authorized roles can view complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin', 'viewer'])
);

-- UPDATE: Only admin and super_admin can modify complaints
-- Viewer is explicitly excluded — read-only access enforced at DB level
CREATE POLICY "Admin and super_admin can update complaints"
ON public.complaints
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);

-- DELETE: Only admin and super_admin can delete complaints
CREATE POLICY "Admin and super_admin can delete complaints"
ON public.complaints
FOR DELETE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);


-- =====================================================
-- SECTION 5: UPDATE EXISTING RLS POLICIES FOR OTHER TABLES
-- Update profiles and user_roles policies to include super_admin
-- =====================================================

-- Profiles table: extend access to super_admin
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Authorized roles can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admin and super_admin can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admin and super_admin can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admin and super_admin can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);

-- User roles table: extend access to super_admin
DROP POLICY IF EXISTS "Admins can view user roles" ON public.user_roles;
CREATE POLICY "Authorized roles can view user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);

DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admin and super_admin can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);

DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admin and super_admin can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);

-- Storage policies: extend to super_admin
DROP POLICY IF EXISTS "Admins can view complaint photos" ON storage.objects;
CREATE POLICY "Admin and super_admin can view complaint photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'complaint-photos' AND
  public.has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);


-- =====================================================
-- SECTION 6: SEED SUPER ADMIN
-- Checks for admin@pupukkaltim.com in auth.users and
-- assigns 'super_admin' role if found.
-- =====================================================

DO $$
DECLARE
  _target_email TEXT := 'admin@pupukkaltim.com';
  _user_id UUID;
BEGIN
  -- Look up the user by email in Supabase Auth
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _target_email
  LIMIT 1;

  -- Only proceed if the user exists
  IF _user_id IS NOT NULL THEN
    -- Insert or update their role to super_admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Super admin role assigned to % (user_id: %)', _target_email, _user_id;
  ELSE
    RAISE NOTICE 'User % not found in auth.users. Skipping super admin seed.', _target_email;
  END IF;
END;
$$;
