
REVOKE EXECUTE ON FUNCTION public.admin_user_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_platform_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;

-- Wrap with auth check inside (already filter via has_role, but ensure anon cannot call)
-- Note: has_role check already protects, just revoking from anon.
