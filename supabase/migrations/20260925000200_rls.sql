-- =============================================================================
-- ViFinance — Row Level Security
--
-- Regla general: cada quien ve y escribe exactamente sus propias filas. Los
-- catálogos (instituciones, parámetros fiscales, categorías del sistema) son de
-- lectura pública y nadie los escribe desde la API.
--
-- Dos detalles que suelen fallar en silencio y que aquí están cubiertos:
--
-- 1. Toda política de UPDATE lleva `using` **y** `with check`. Sin `with check`
--    un usuario podría reasignar el `user_id` de una fila suya a otra persona.
-- 2. `(select auth.uid())` va entre paréntesis para que Postgres lo evalúe una
--    sola vez por consulta en lugar de una vez por fila.
--
-- Modo demo: el perfil marcado `is_demo` se puede LEER sin sesión, para que
-- cualquiera vea la app funcionando con datos realistas. Ninguna política de
-- escritura lo incluye, así que la demo es de solo lectura a nivel de base de
-- datos y no depende de que la interfaz esconda los botones.
-- =============================================================================

-- Esquema privado: no se expone en la API, así que sus funciones no son
-- endpoints. Aquí vive el identificador del usuario de demostración.
create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to anon, authenticated;

create or replace function private.demo_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.profiles where is_demo limit 1;
$$;

grant execute on function private.demo_user_id() to anon, authenticated;

comment on function private.demo_user_id is
  'Id del usuario de demostración pública. SECURITY DEFINER porque las políticas de lectura anónima necesitan resolverlo antes de que el RLS de profiles aplique; vive en un esquema no expuesto y no recibe parámetros, así que no puede usarse para filtrar datos ajenos.';

-- -----------------------------------------------------------------------------
-- Catálogos públicos
-- -----------------------------------------------------------------------------

alter table public.institutions enable row level security;
alter table public.tax_parameters enable row level security;

create policy "catalogo_publico_lectura" on public.institutions
  for select to anon, authenticated using (true);

create policy "parametros_fiscales_lectura" on public.tax_parameters
  for select to anon, authenticated using (true);

-- -----------------------------------------------------------------------------
-- Perfiles
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "perfil_propio_lectura" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or is_demo);

create policy "perfil_demo_lectura_anonima" on public.profiles
  for select to anon
  using (is_demo);

create policy "perfil_propio_insercion" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id and not is_demo);

create policy "perfil_propio_actualizacion" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id and not is_demo)
  with check ((select auth.uid()) = id and not is_demo);

-- -----------------------------------------------------------------------------
-- Categorías
-- -----------------------------------------------------------------------------

alter table public.categories enable row level security;

create policy "categorias_lectura" on public.categories
  for select to anon, authenticated
  using (
    user_id is null
    or user_id = (select auth.uid())
    or user_id = private.demo_user_id()
  );

create policy "categorias_propias_insercion" on public.categories
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "categorias_propias_actualizacion" on public.categories
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "categorias_propias_borrado" on public.categories
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Tablas con dueño directo
--
-- Todas siguen el mismo patrón; se generan en bucle para que agregar una tabla
-- nueva no signifique olvidar una política.
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'transactions', 'budgets', 'recurring_rules', 'msi_plans'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    -- Lectura: propia, o la del usuario demo (que cualquiera puede mirar).
    execute format($f$
      create policy "%1$s_lectura" on public.%1$I
        for select to anon, authenticated
        using (user_id = (select auth.uid()) or user_id = private.demo_user_id())
    $f$, t);

    -- Escritura: sólo lo propio, y nunca sobre la cuenta demo.
    execute format($f$
      create policy "%1$s_insercion" on public.%1$I
        for insert to authenticated
        with check (
          user_id = (select auth.uid())
          and user_id is distinct from private.demo_user_id()
        )
    $f$, t);

    execute format($f$
      create policy "%1$s_actualizacion" on public.%1$I
        for update to authenticated
        using (
          user_id = (select auth.uid())
          and user_id is distinct from private.demo_user_id()
        )
        with check (
          user_id = (select auth.uid())
          and user_id is distinct from private.demo_user_id()
        )
    $f$, t);

    execute format($f$
      create policy "%1$s_borrado" on public.%1$I
        for delete to authenticated
        using (
          user_id = (select auth.uid())
          and user_id is distinct from private.demo_user_id()
        )
    $f$, t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tablas que heredan el dueño de la cuenta
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'account_yield_config', 'account_credit_config', 'account_rate_history'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format($f$
      create policy "%1$s_lectura" on public.%1$I
        for select to anon, authenticated
        using (exists (
          select 1 from public.accounts a
          where a.id = %1$I.account_id
            and (a.user_id = (select auth.uid()) or a.user_id = private.demo_user_id())
        ))
    $f$, t);

    execute format($f$
      create policy "%1$s_insercion" on public.%1$I
        for insert to authenticated
        with check (exists (
          select 1 from public.accounts a
          where a.id = %1$I.account_id and a.user_id = (select auth.uid())
        ))
    $f$, t);

    execute format($f$
      create policy "%1$s_actualizacion" on public.%1$I
        for update to authenticated
        using (exists (
          select 1 from public.accounts a
          where a.id = %1$I.account_id and a.user_id = (select auth.uid())
        ))
        with check (exists (
          select 1 from public.accounts a
          where a.id = %1$I.account_id and a.user_id = (select auth.uid())
        ))
    $f$, t);

    execute format($f$
      create policy "%1$s_borrado" on public.%1$I
        for delete to authenticated
        using (exists (
          select 1 from public.accounts a
          where a.id = %1$I.account_id and a.user_id = (select auth.uid())
        ))
    $f$, t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de la Data API
--
-- El RLS decide qué FILAS se ven; el GRANT decide si la TABLA es alcanzable.
-- Hacen falta los dos.
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on
  public.institutions,
  public.tax_parameters,
  public.categories,
  public.profiles,
  public.accounts,
  public.account_yield_config,
  public.account_credit_config,
  public.account_rate_history,
  public.transactions,
  public.budgets,
  public.recurring_rules,
  public.msi_plans,
  public.account_totals,
  public.liquidity_summary,
  public.budget_progress
to anon, authenticated;

grant insert, update, delete on
  public.categories,
  public.profiles,
  public.accounts,
  public.account_yield_config,
  public.account_credit_config,
  public.account_rate_history,
  public.transactions,
  public.budgets,
  public.recurring_rules,
  public.msi_plans
to authenticated;
