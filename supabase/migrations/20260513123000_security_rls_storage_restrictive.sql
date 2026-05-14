CREATE OR REPLACE FUNCTION public.prevent_user_sensitive_field_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND COALESCE(current_setting('app.allow_sensitive_user_update', true), 'off') <> 'on'
  THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.family_id IS DISTINCT FROM OLD.family_id
      OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.password_hash IS DISTINCT FROM OLD.password_hash
      OR NEW.role IS DISTINCT FROM OLD.role
      OR NEW.super_admin IS DISTINCT FROM OLD.super_admin
      OR NEW.phone_number IS DISTINCT FROM OLD.phone_number
      OR NEW.phone_number_pending IS DISTINCT FROM OLD.phone_number_pending
      OR NEW.phone_verification_code IS DISTINCT FROM OLD.phone_verification_code
      OR NEW.phone_verification_expires_at IS DISTINCT FROM OLD.phone_verification_expires_at
      OR NEW.phone_verification_attempts IS DISTINCT FROM OLD.phone_verification_attempts
      OR NEW.phone_otp_sent_at IS DISTINCT FROM OLD.phone_otp_sent_at
      OR NEW.phone_otp_hour_count IS DISTINCT FROM OLD.phone_otp_hour_count
      OR NEW.phone_otp_hour_start IS DISTINCT FROM OLD.phone_otp_hour_start
    THEN
      RAISE EXCEPTION 'not allowed to update protected user fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_sensitive_field_update ON public.users;
CREATE TRIGGER trg_prevent_user_sensitive_field_update
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_sensitive_field_update();

CREATE OR REPLACE FUNCTION public.prevent_family_sensitive_field_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND COALESCE(current_setting('app.allow_sensitive_family_update', true), 'off') <> 'on'
  THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.created_by IS DISTINCT FROM OLD.created_by
      OR NEW.trial_expires_at IS DISTINCT FROM OLD.trial_expires_at
      OR NEW.lifetime_access IS DISTINCT FROM OLD.lifetime_access
      OR NEW.founders_enabled IS DISTINCT FROM OLD.founders_enabled
      OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    THEN
      RAISE EXCEPTION 'not allowed to update protected family fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_family_sensitive_field_update ON public.families;
CREATE TRIGGER trg_prevent_family_sensitive_field_update
BEFORE UPDATE ON public.families
FOR EACH ROW
EXECUTE FUNCTION public.prevent_family_sensitive_field_update();

DROP POLICY IF EXISTS "users_insert_self" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "users_select_family" ON public.users;

REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.users FROM authenticated;

GRANT SELECT (
  id,
  family_id,
  name,
  email,
  avatar_url,
  role,
  created_at,
  billing_cycle_day,
  insights_enabled,
  insight_interval_days,
  insight_channels
) ON public.users TO authenticated;

GRANT UPDATE (
  name,
  avatar_url,
  billing_cycle_day,
  insights_enabled,
  insight_interval_days,
  insight_channels
) ON public.users TO authenticated;

CREATE POLICY "users_select_family_safe_columns"
ON public.users
FOR SELECT
TO authenticated
USING (family_id = public.current_family_id());

CREATE POLICY "users_update_self_profile_only"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "families_insert_auth" ON public.families;
DROP POLICY IF EXISTS "families_insert_authenticated" ON public.families;
DROP POLICY IF EXISTS "families_insert_own" ON public.families;
DROP POLICY IF EXISTS "families_select_own" ON public.families;
DROP POLICY IF EXISTS "families_update_own" ON public.families;

REVOKE ALL ON public.families FROM anon;
REVOKE ALL ON public.families FROM authenticated;

GRANT SELECT (
  id,
  name,
  created_at,
  trial_expires_at,
  lifetime_access,
  founders_enabled
) ON public.families TO authenticated;

CREATE POLICY "families_select_current_member"
ON public.families
FOR SELECT
TO authenticated
USING (id = public.current_family_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "invites_family" ON public.invites;

REVOKE ALL ON public.invites FROM anon;
REVOKE ALL ON public.invites FROM authenticated;

GRANT SELECT (
  id,
  family_id,
  email,
  accepted,
  created_at,
  expires_at
) ON public.invites TO authenticated;

CREATE POLICY "invites_select_family_without_token"
ON public.invites
FOR SELECT
TO authenticated
USING (family_id = public.current_family_id());

DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_update_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_family" ON public.categories;

CREATE POLICY "categories_select_family"
ON public.categories
FOR SELECT
TO authenticated
USING (family_id = public.current_family_id());

CREATE POLICY "categories_insert_family"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (family_id = public.current_family_id());

CREATE POLICY "categories_update_family"
ON public.categories
FOR UPDATE
TO authenticated
USING (family_id = public.current_family_id())
WITH CHECK (family_id = public.current_family_id());

CREATE POLICY "categories_delete_non_system_family"
ON public.categories
FOR DELETE
TO authenticated
USING (family_id = public.current_family_id() AND NOT is_system);

UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'attachments';

DROP POLICY IF EXISTS "Public can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update attachments" ON storage.objects;
DROP POLICY IF EXISTS "attachments_family_select" ON storage.objects;
DROP POLICY IF EXISTS "attachments_family_insert_images" ON storage.objects;
DROP POLICY IF EXISTS "attachments_family_update_images" ON storage.objects;

CREATE POLICY "attachments_family_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = public.current_family_id()::text
);

CREATE POLICY "attachments_family_insert_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = public.current_family_id()::text
  AND lower(name) ~ '\.(jpg|jpeg|png|webp)$'
  AND lower(coalesce(metadata->>'mimetype', metadata->>'mimeType', '')) IN ('image/jpeg', 'image/png', 'image/webp')
);

CREATE POLICY "attachments_family_update_images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = public.current_family_id()::text
)
WITH CHECK (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = public.current_family_id()::text
  AND lower(name) ~ '\.(jpg|jpeg|png|webp)$'
  AND lower(coalesce(metadata->>'mimetype', metadata->>'mimeType', '')) IN ('image/jpeg', 'image/png', 'image/webp')
);

UPDATE storage.buckets
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'avatars';

DROP POLICY IF EXISTS "Users can upload their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their avatar" ON storage.objects;
DROP POLICY IF EXISTS "users_can_upload_own_avatar_image" ON storage.objects;
DROP POLICY IF EXISTS "users_can_update_own_avatar_image" ON storage.objects;

CREATE POLICY "users_can_upload_own_avatar_image"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(name) ~ '\.(jpg|jpeg|png|webp)$'
  AND lower(coalesce(metadata->>'mimetype', metadata->>'mimeType', '')) IN ('image/jpeg', 'image/png', 'image/webp')
);

CREATE POLICY "users_can_update_own_avatar_image"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(name) ~ '\.(jpg|jpeg|png|webp)$'
  AND lower(coalesce(metadata->>'mimetype', metadata->>'mimeType', '')) IN ('image/jpeg', 'image/png', 'image/webp')
);
