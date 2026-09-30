-- =============================================================================
-- ViFinance — Endurecer permisos de funciones SECURITY DEFINER
--
-- El linter de Supabase detectó dos hallazgos legítimos:
--
-- 1. `handle_new_user()` es un trigger que corre cuando Supabase inserta en
--    `auth.users`, no un endpoint. Estar expuesta en `/rest/v1/rpc/` permitiría
--    que alguien la llamara con un `new` inventado y forzara la inserción de un
--    perfil.
--
-- 2. `accrual_runs` es una bitácora operativa que sólo escribe el job de
--    devengo. Tenía RLS activo pero sin políticas. Añadir una política que
--    niega todo hace explícita la intención.
-- =============================================================================

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create policy "accrual_runs_sin_acceso_publico" on public.accrual_runs
  for all to anon, authenticated
  using (false) with check (false);
