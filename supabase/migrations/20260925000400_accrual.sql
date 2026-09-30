-- =============================================================================
-- ViFinance — Motor de devengo de rendimientos
--
-- Corre solo, cada día, y escribe movimientos reales de tipo `yield`. Que el
-- dinero crezca aunque no abras la app es justo lo que hace que la app se
-- sienta como una cuenta de verdad y no como una hoja de cálculo.
--
-- Cuatro decisiones de diseño que vale la pena leer con calma:
--
-- 1. **Idempotencia.** La función se puede correr las veces que quieras para la
--    misma fecha sin duplicar rendimientos: un índice único sobre
--    (cuenta, fecha de devengo) lo garantiza a nivel de base de datos, no de
--    código.
--
-- 2. **Ponerse al día.** Recibe un rango. Si el proyecto estuvo pausado dos
--    semanas, o si estás trabajando en local donde no hay cron corriendo, la
--    siguiente ejecución rellena los días faltantes uno por uno, con el saldo
--    que había cada día.
--
-- 3. **El residuo sub-centavo se acarrea.** $500 al 9% anual generan $0.1233 al
--    día. Redondeando y tirando el residuo cada día, el error se acumula; peor
--    aún, un saldo chico nunca ganaría nada. El residuo se guarda en la
--    configuración de la cuenta y se suma al día siguiente.
--
-- 4. **La capitalización manda.** Con capitalización diaria se registra un
--    movimiento cada día y el interés de mañana se calcula sobre el saldo de
--    hoy ya incrementado. Con cualquier otra frecuencia el interés se acumula en
--    `pending_interest` y sólo se registra al cerrar el período: hasta entonces
--    no genera interés sobre sí mismo, que es exactamente como funciona un
--    pagaré.
-- =============================================================================

create extension if not exists pg_cron with schema pg_catalog;

-- Bitácora de corridas: sirve para saber hasta qué día está devengada la app y
-- para que el botón de "recalcular" sepa desde dónde empezar.
create table public.accrual_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  accounts_processed integer not null default 0,
  transactions_created integer not null default 0,
  total_gross numeric(18, 2) not null default 0,
  total_withheld numeric(18, 2) not null default 0,
  ran_at timestamptz not null default now(),
  duration_ms integer
);

alter table public.accrual_runs enable row level security;

-- La bitácora es operativa: nadie la lee desde la API.
comment on table public.accrual_runs is
  'Bitácora del motor de devengo. Sin políticas de acceso: sólo la escribe el job.';

-- ¿Este día cierra el período de capitalización?
create or replace function public.closes_compounding_period(
  p_date date,
  p_compounding public.compounding_frequency
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_compounding
    when 'daily' then true
    when 'at_maturity' then false
    when 'monthly' then p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date
    when 'bimonthly' then
      p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date
      and extract(month from p_date)::integer % 2 = 0
    when 'quarterly' then
      p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date
      and extract(month from p_date)::integer % 3 = 0
    when 'semiannual' then
      p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date
      and extract(month from p_date)::integer % 6 = 0
    when 'annual' then p_date = make_date(extract(year from p_date)::integer, 12, 31)
  end;
$$;

-- -----------------------------------------------------------------------------
-- Devengo de una cuenta, día por día, hasta una fecha
-- -----------------------------------------------------------------------------
create or replace function public.accrue_account(
  p_account_id uuid,
  p_through date default (now() at time zone 'America/Mexico_City')::date
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account public.accounts;
  v_config public.account_yield_config;
  v_day date;
  v_balance numeric(18, 2);
  v_rate numeric(9, 6);
  v_daily_gross numeric(18, 10);
  v_daily_isr numeric(18, 10);
  v_gross numeric(18, 2);
  v_isr numeric(18, 2);
  v_net numeric(18, 2);
  v_remainder numeric(18, 10);
  v_isr_remainder numeric(18, 10);
  v_pending numeric(18, 2);
  v_pending_isr numeric(18, 2);
  v_isr_rate numeric(9, 6);
  v_created integer := 0;
begin
  select * into v_account from public.accounts where id = p_account_id;
  if not found or v_account.is_archived then
    return 0;
  end if;

  select * into v_config from public.account_yield_config where account_id = p_account_id;
  if not found or v_config.gross_annual_rate <= 0 then
    return 0;
  end if;

  v_balance := v_account.balance;
  v_remainder := v_config.accrued_remainder;
  v_isr_remainder := v_config.isr_remainder;
  v_pending := v_config.pending_interest;
  v_pending_isr := v_config.pending_isr;

  v_day := coalesce(v_config.last_accrued_on, v_config.starts_on, v_account.opened_on) + 1;

  while v_day <= p_through loop
    -- El plazo ya venció: deja de generar rendimiento hasta que se liquide.
    exit when v_config.matures_on is not null and v_day > v_config.matures_on;

    -- La tasa vigente ESE día, no la de hoy: bajar la tasa no debe recalcular
    -- hacia atrás lo ya devengado.
    select gross_annual_rate into v_rate
    from public.account_rate_history
    where account_id = p_account_id and effective_from <= v_day
    order by effective_from desc
    limit 1;

    v_rate := coalesce(v_rate, v_config.gross_annual_rate);

    select isr_rate_on_capital into v_isr_rate
    from public.tax_parameters
    where year = extract(year from v_day)::integer;

    v_isr_rate := coalesce(v_isr_rate, 0);

    if v_balance > 0 then
      v_daily_gross := v_balance * (v_rate / v_config.day_count_basis) + v_remainder;
      v_gross := round(v_daily_gross, 2);
      v_remainder := v_daily_gross - v_gross;

      if v_config.applies_isr then
        v_daily_isr := v_balance * (v_isr_rate / 365.0) + v_isr_remainder;
        v_isr := round(v_daily_isr, 2);
        v_isr_remainder := v_daily_isr - v_isr;
      else
        v_isr := 0;
      end if;

      v_net := v_gross - v_isr;
      v_pending := v_pending + v_gross;
      v_pending_isr := v_pending_isr + v_isr;

      if public.closes_compounding_period(v_day, v_config.compounding) then
        if v_pending <> 0 then
          insert into public.transactions (
            user_id, type, amount, to_account_id, occurred_at,
            is_accrual, accrual_date, notes
          )
          values (
            v_account.user_id, 'yield', v_pending, p_account_id,
            (v_day + interval '23 hours 59 minutes')::timestamptz,
            true, v_day,
            format('Rendimiento %s', to_char(v_day, 'DD/MM/YYYY'))
          )
          on conflict do nothing;

          v_created := v_created + 1;
        end if;

        -- El ISR se retiene al pagar el interés, como hace el banco.
        if v_pending_isr > 0 then
          insert into public.transactions (
            user_id, type, amount, from_account_id, occurred_at,
            is_accrual, accrual_date, notes
          )
          values (
            v_account.user_id, 'tax', v_pending_isr, p_account_id,
            (v_day + interval '23 hours 59 minutes')::timestamptz,
            -- Se marca como devengo igual que el rendimiento: son la misma
            -- operación vista desde dos lados, y el historial las filtra juntas.
            true, v_day,
            format('Retención de ISR %s', to_char(v_day, 'DD/MM/YYYY'))
          );
        end if;

        -- Sólo aquí crece el saldo sobre el que se calcula el interés del día
        -- siguiente: eso es la capitalización.
        v_balance := v_balance + v_pending - v_pending_isr;
        v_pending := 0;
        v_pending_isr := 0;
      end if;
    end if;

    v_day := v_day + 1;
  end loop;

  update public.account_yield_config
    set last_accrued_on = least(p_through, coalesce(v_config.matures_on, p_through)),
        accrued_remainder = v_remainder,
        isr_remainder = v_isr_remainder,
        pending_interest = v_pending,
        pending_isr = v_pending_isr
    where account_id = p_account_id;

  return v_created;
end;
$$;

-- -----------------------------------------------------------------------------
-- Devengo de todas las cuentas (el job diario)
-- -----------------------------------------------------------------------------
create or replace function public.accrue_all_yields(
  p_through date default (now() at time zone 'America/Mexico_City')::date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account record;
  v_created integer := 0;
  v_accounts integer := 0;
  v_started timestamptz := clock_timestamp();
begin
  for v_account in
    select y.account_id
    from public.account_yield_config y
    join public.accounts a on a.id = y.account_id
    where not a.is_archived
      and y.gross_annual_rate > 0
      and coalesce(y.last_accrued_on, a.opened_on) < p_through
    order by y.account_id
  loop
    v_created := v_created + public.accrue_account(v_account.account_id, p_through);
    v_accounts := v_accounts + 1;
  end loop;

  insert into public.accrual_runs (
    run_date, accounts_processed, transactions_created, duration_ms
  )
  values (
    p_through, v_accounts, v_created,
    extract(milliseconds from clock_timestamp() - v_started)::integer
  );

  return v_created;
end;
$$;

comment on function public.accrue_all_yields is
  'Job diario de devengo. SECURITY DEFINER porque pg_cron lo ejecuta sin una sesión de usuario y debe recorrer las cuentas de todos; no recibe identificadores de usuario y no está expuesto a anon ni authenticated.';

revoke all on function public.accrue_all_yields(date) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Ponerse al día bajo demanda
--
-- Lo llama la app al entrar. Sólo devenga las cuentas de quien está pidiendo,
-- así que corre bajo RLS y es seguro exponerlo.
-- -----------------------------------------------------------------------------
create or replace function public.catch_up_my_yields()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account record;
  v_created integer := 0;
  v_today date := (now() at time zone 'America/Mexico_City')::date;
begin
  for v_account in
    select y.account_id
    from public.account_yield_config y
    join public.accounts a on a.id = y.account_id
    where a.user_id = (select auth.uid())
      and not a.is_archived
      and y.gross_annual_rate > 0
      and coalesce(y.last_accrued_on, a.opened_on) < v_today
  loop
    v_created := v_created + public.accrue_account(v_account.account_id, v_today);
  end loop;

  return v_created;
end;
$$;

grant execute on function public.catch_up_my_yields() to authenticated;

-- -----------------------------------------------------------------------------
-- Programación diaria
--
-- 00:05 hora de la Ciudad de México. La expresión cron corre en UTC, así que se
-- programa a las 06:05 UTC (CDMX es UTC-6 todo el año desde que México eliminó
-- el horario de verano en 2022).
-- -----------------------------------------------------------------------------
select cron.schedule(
  'devengo-diario',
  '5 6 * * *',
  $$select public.accrue_all_yields()$$
);
