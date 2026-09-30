-- =============================================================================
-- ViFinance — Esquema base
--
-- Modelo de saldos: la tabla `transactions` es el registro histórico y sólo
-- crece (para corregir se emite un movimiento de reversa, nunca se edita). La
-- columna `accounts.balance` la mantiene un trigger dentro de la misma
-- transacción de Postgres, así que leer un saldo es instantáneo pero siempre es
-- reconstruible desde los movimientos.
--
-- Signo de los movimientos: no depende del tipo de movimiento sino de la
-- naturaleza de la cuenta. Una cuenta de activo sube cuando recibe y baja
-- cuando entrega; una cuenta de pasivo (tarjeta, préstamo) hace lo contrario,
-- porque su saldo representa deuda. Con esa única regla, un gasto pagado con
-- tarjeta aumenta la deuda y un pago de tarjeta la reduce, sin casos especiales.
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------

create type public.account_nature as enum ('asset', 'liability');

create type public.account_kind as enum (
  'checking',      -- cuenta de uso diario (Nu, Mercado Pago, BBVA)
  'savings',       -- cuenta de ahorro con rendimiento a la vista
  'vault',         -- apartado / cajita / bóveda, subcuenta de otra cuenta
  'term_deposit',  -- plazo fijo: pagaré, inversión a plazo de SOFIPO, CETES
  'cash',          -- efectivo
  'investment',    -- fondos, casa de bolsa
  'credit_card',
  'loan'
);

create type public.institution_kind as enum (
  'banco', 'neobanco', 'sofipo', 'fintech', 'casa_bolsa', 'gobierno', 'efectivo', 'otro'
);

create type public.compounding_frequency as enum (
  'daily', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual', 'at_maturity'
);

-- Qué se hace con el rendimiento generado por un apartado.
create type public.yield_destination as enum (
  'capitalize',  -- se queda en el apartado y genera más rendimiento
  'to_parent'    -- se deposita en la cuenta padre
);

-- Qué tan atrapado está el dinero de un apartado a plazo.
create type public.lock_type as enum (
  'none',  -- se puede retirar cuando sea
  'soft',  -- se puede retirar, pero se pierde el rendimiento acumulado
  'hard'   -- no se puede retirar antes del vencimiento
);

create type public.transaction_type as enum (
  'income', 'expense', 'transfer', 'yield', 'fee', 'tax',
  'adjustment', 'credit_charge', 'credit_payment'
);

create type public.category_kind as enum ('expense', 'income');

create type public.recurrence_frequency as enum (
  'weekly', 'biweekly', 'semimonthly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual'
);

-- -----------------------------------------------------------------------------
-- Catálogos públicos (sin dueño: los lee cualquiera, no los escribe nadie)
-- -----------------------------------------------------------------------------

-- Instituciones financieras mexicanas, con su identidad visual y la tasa que
-- suelen ofrecer. La tasa es una sugerencia con fecha para prellenar el alta de
-- una cuenta; la tasa que manda siempre es la que el usuario captura.
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind public.institution_kind not null,
  brand_color text not null,
  short_name text,
  -- Tasa de referencia informativa y la fecha en que se registró.
  reference_rate numeric(9, 6),
  reference_rate_note text,
  reference_rate_as_of date,
  -- Si está o no respaldada por el IPAB (bancos) o el fondo de protección de
  -- SOFIPOs: información que cambia la decisión de dónde guardar el dinero.
  protection_scheme text,
  protection_limit_udis integer,
  website text,
  display_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.institutions is
  'Catálogo de instituciones financieras mexicanas. Público y de solo lectura.';

-- Parámetros fiscales por año. La retención de ISR sobre intereses la fija el
-- Congreso cada año en la Ley de Ingresos de la Federación y se aplica sobre el
-- CAPITAL, no sobre el interés ganado.
create table public.tax_parameters (
  year integer primary key,
  isr_rate_on_capital numeric(9, 6) not null,
  iva_rate numeric(9, 6) not null default 0.16,
  estimated_inflation numeric(9, 6) not null,
  uma_daily numeric(18, 2),
  source text,
  created_at timestamptz not null default now()
);

comment on column public.tax_parameters.isr_rate_on_capital is
  'Tasa anual de retención de ISR aplicada sobre el capital que genera intereses (Art. 54 y 135 LISR, tasa fijada en la LIF de cada año).';

-- -----------------------------------------------------------------------------
-- Perfil del usuario
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  currency text not null default 'MXN',
  time_zone text not null default 'America/Mexico_City',
  -- Marca la cuenta de demostración pública: puede leerse sin sesión y ninguna
  -- política de escritura la incluye.
  is_demo boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Crea el perfil en cuanto alguien entra con Google, sin un paso extra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Categorías
-- -----------------------------------------------------------------------------

-- `user_id` nulo = categoría del catálogo global, visible para todos.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  parent_id uuid references public.categories (id) on delete cascade,
  name text not null,
  kind public.category_kind not null default 'expense',
  icon text not null default 'circle',
  color text not null default '#64748b',
  display_order integer not null default 100,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index categories_user_idx on public.categories (user_id) where user_id is not null;
create unique index categories_global_slug_idx
  on public.categories (name, kind) where user_id is null;

-- -----------------------------------------------------------------------------
-- Cuentas y apartados
-- -----------------------------------------------------------------------------

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution_id uuid references public.institutions (id) on delete set null,
  -- Un apartado es una cuenta hija: tiene saldo, tasa y plazo propios.
  parent_account_id uuid references public.accounts (id) on delete restrict,
  name text not null,
  nature public.account_nature not null default 'asset',
  kind public.account_kind not null default 'checking',
  balance numeric(18, 2) not null default 0,
  currency text not null default 'MXN',
  -- Metas de ahorro, para los apartados.
  target_amount numeric(18, 2),
  target_date date,
  -- Identidad visual cuando no hay institución (efectivo, cuentas custom).
  color text,
  icon text,
  notes text,
  opened_on date not null default current_date,
  display_order integer not null default 100,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint accounts_currency_check check (currency = 'MXN'),
  constraint accounts_not_own_parent check (id <> parent_account_id),
  -- Un apartado no puede tener apartados: un solo nivel de anidación.
  constraint accounts_vault_kind check (
    parent_account_id is null or kind in ('vault', 'term_deposit')
  )
);

create index accounts_user_idx on public.accounts (user_id);
create index accounts_parent_idx on public.accounts (parent_account_id);

-- Impide apartados de apartados (dos niveles de profundidad).
create or replace function public.check_account_nesting()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_grandparent uuid;
begin
  if new.parent_account_id is null then
    return new;
  end if;

  select parent_account_id into v_grandparent
  from public.accounts where id = new.parent_account_id;

  if v_grandparent is not null then
    raise exception 'Un apartado no puede contener otros apartados';
  end if;

  return new;
end;
$$;

create trigger accounts_check_nesting
  before insert or update of parent_account_id on public.accounts
  for each row execute function public.check_account_nesting();

-- Configuración de rendimiento. 1:1 opcional con la cuenta: sólo la tienen las
-- cuentas que generan intereses.
create table public.account_yield_config (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  -- Tasa bruta nominal anual en decimal: 0.1475 = 14.75%.
  gross_annual_rate numeric(9, 6) not null,
  compounding public.compounding_frequency not null default 'daily',
  day_count_basis smallint not null default 365,
  destination public.yield_destination not null default 'capitalize',
  applies_isr boolean not null default true,
  -- Plazo forzoso, para cajitas de Nu, pagarés y CETES.
  term_days integer,
  starts_on date,
  matures_on date,
  withdrawal_lock public.lock_type not null default 'none',
  early_withdrawal_penalty_rate numeric(9, 6) not null default 0,
  auto_renew boolean not null default false,
  -- Estado del motor de devengo.
  last_accrued_on date,
  -- Residuo sub-centavo que se acarrea de un día al siguiente: sin esto, un
  -- saldo pequeño nunca generaría rendimiento porque cada día se redondearía a
  -- cero.
  accrued_remainder numeric(18, 10) not null default 0,
  isr_remainder numeric(18, 10) not null default 0,
  -- Interés devengado que aún no se capitaliza (para frecuencias no diarias).
  pending_interest numeric(18, 2) not null default 0,
  pending_isr numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint yield_basis_check check (day_count_basis in (360, 365)),
  constraint yield_rate_check check (gross_annual_rate >= 0 and gross_annual_rate <= 2)
);

-- Historial de tasas: cuando bajas la tasa de una cuenta, el rendimiento ya
-- devengado no se recalcula con la tasa nueva.
create table public.account_rate_history (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  gross_annual_rate numeric(9, 6) not null,
  effective_from date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index account_rate_history_idx
  on public.account_rate_history (account_id, effective_from desc);

-- Configuración de crédito, para tarjetas y préstamos.
create table public.account_credit_config (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  credit_limit numeric(18, 2),
  annual_rate numeric(9, 6),
  -- Día del mes en que corta el periodo y día límite de pago.
  cutoff_day smallint,
  payment_due_day smallint,
  minimum_payment_rate numeric(9, 6) default 0.05,
  minimum_payment_floor numeric(18, 2) default 0,
  annual_fee numeric(18, 2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint credit_cutoff_check check (cutoff_day is null or cutoff_day between 1 and 31),
  constraint credit_due_check check (payment_due_day is null or payment_due_day between 1 and 31)
);

-- -----------------------------------------------------------------------------
-- Movimientos
-- -----------------------------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  type public.transaction_type not null,
  -- Siempre positivo. La dirección la dan `from_account_id` y `to_account_id`.
  amount numeric(18, 2) not null,
  from_account_id uuid references public.accounts (id) on delete restrict,
  to_account_id uuid references public.accounts (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  merchant text,
  notes text,
  -- Devengo automático de rendimientos: permite distinguir lo que calculó la
  -- app de lo que realmente pagó el banco, y conciliar después.
  is_accrual boolean not null default false,
  accrual_date date,
  recurring_rule_id uuid,
  msi_plan_id uuid,
  -- Corregir un movimiento es emitir su reversa, no editarlo.
  reverses_transaction_id uuid references public.transactions (id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint transactions_amount_positive check (amount > 0),
  constraint transactions_has_account check (
    from_account_id is not null or to_account_id is not null
  ),
  constraint transactions_distinct_accounts check (
    from_account_id is null or to_account_id is null or from_account_id <> to_account_id
  )
);

create index transactions_user_date_idx
  on public.transactions (user_id, occurred_at desc);
create index transactions_from_idx on public.transactions (from_account_id, occurred_at desc);
create index transactions_to_idx on public.transactions (to_account_id, occurred_at desc);
create index transactions_category_idx on public.transactions (category_id, occurred_at desc);

-- Idempotencia del devengo: un rendimiento por cuenta y por día, pase lo que
-- pase. Si el job corre dos veces, el segundo intento choca con este índice.
create unique index transactions_accrual_unique_idx
  on public.transactions (to_account_id, accrual_date)
  where is_accrual and type = 'yield';

-- Aplica el movimiento a los saldos.
--
-- Regla única: una cuenta de activo sube al recibir y baja al entregar; una de
-- pasivo hace lo contrario, porque su saldo es deuda.
create or replace function public.apply_transaction_to_balances()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.from_account_id is not null then
      update public.accounts
        set balance = balance + (case when nature = 'asset' then old.amount else -old.amount end),
            updated_at = now()
        where id = old.from_account_id;
    end if;
    if old.to_account_id is not null then
      update public.accounts
        set balance = balance - (case when nature = 'asset' then old.amount else -old.amount end),
            updated_at = now()
        where id = old.to_account_id;
    end if;
    return old;
  end if;

  if new.from_account_id is not null then
    update public.accounts
      set balance = balance - (case when nature = 'asset' then new.amount else -new.amount end),
          updated_at = now()
      where id = new.from_account_id;
  end if;

  if new.to_account_id is not null then
    update public.accounts
      set balance = balance + (case when nature = 'asset' then new.amount else -new.amount end),
          updated_at = now()
      where id = new.to_account_id;
  end if;

  return new;
end;
$$;

create trigger transactions_apply_balances
  after insert or delete on public.transactions
  for each row execute function public.apply_transaction_to_balances();

-- Los movimientos son inmutables en todo lo que afecta dinero. Editar la nota o
-- la categoría sí se permite; cambiar monto o cuentas, no.
create or replace function public.prevent_transaction_financial_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.amount is distinct from old.amount
     or new.from_account_id is distinct from old.from_account_id
     or new.to_account_id is distinct from old.to_account_id
     or new.type is distinct from old.type then
    raise exception
      'Los movimientos son inmutables: registra un movimiento de reversa en lugar de editarlo';
  end if;
  return new;
end;
$$;

create trigger transactions_immutable
  before update on public.transactions
  for each row execute function public.prevent_transaction_financial_update();

-- -----------------------------------------------------------------------------
-- Presupuestos, recurrentes y Meses Sin Intereses
-- -----------------------------------------------------------------------------

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  -- Primer día del mes presupuestado.
  month date not null,
  limit_amount numeric(18, 2) not null,
  created_at timestamptz not null default now(),

  constraint budgets_limit_positive check (limit_amount > 0),
  unique (user_id, category_id, month)
);

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type public.transaction_type not null,
  amount numeric(18, 2) not null,
  from_account_id uuid references public.accounts (id) on delete cascade,
  to_account_id uuid references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  frequency public.recurrence_frequency not null,
  -- Para quincenal fijo (nómina el 15 y el último) y mensual.
  day_of_month smallint,
  second_day_of_month smallint,
  starts_on date not null default current_date,
  ends_on date,
  next_run_on date not null,
  -- Si es true se registra solo; si no, aparece como pendiente de confirmar.
  auto_post boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint recurring_amount_positive check (amount > 0)
);

create index recurring_next_run_idx on public.recurring_rules (next_run_on) where is_active;

-- Compras a Meses Sin Intereses: generan un pasivo que se paga en N
-- mensualidades y que hay que ver en la proyección de flujo.
create table public.msi_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credit_account_id uuid not null references public.accounts (id) on delete cascade,
  description text not null,
  total_amount numeric(18, 2) not null,
  installments smallint not null,
  installments_paid smallint not null default 0,
  monthly_amount numeric(18, 2) not null,
  purchased_on date not null default current_date,
  first_payment_on date not null,
  category_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint msi_installments_check check (installments > 0),
  constraint msi_paid_check check (installments_paid between 0 and installments)
);

create index msi_plans_user_idx on public.msi_plans (user_id) where installments_paid < installments;

alter table public.transactions
  add constraint transactions_recurring_fk
  foreign key (recurring_rule_id) references public.recurring_rules (id) on delete set null;

alter table public.transactions
  add constraint transactions_msi_fk
  foreign key (msi_plan_id) references public.msi_plans (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Vistas
-- -----------------------------------------------------------------------------

-- Saldo propio, saldo de los apartados y saldo total de cada cuenta.
-- `security_invoker` es indispensable: sin él la vista se ejecutaría con los
-- permisos de quien la creó y se saltaría el RLS de la tabla.
create view public.account_totals
with (security_invoker = true) as
select
  a.*,
  coalesce(v.vault_balance, 0) as vault_balance,
  a.balance + coalesce(v.vault_balance, 0) as total_balance,
  y.gross_annual_rate,
  y.compounding,
  y.matures_on,
  y.withdrawal_lock,
  y.destination,
  y.applies_isr
from public.accounts a
left join (
  select parent_account_id, sum(balance) as vault_balance
  from public.accounts
  where parent_account_id is not null and not is_archived
  group by parent_account_id
) v on v.parent_account_id = a.id
left join public.account_yield_config y on y.account_id = a.id;

-- Pulso de liquidez: cuánto puedes gastar hoy, cuánto está apartado pero
-- disponible, y cuánto está atrapado en un plazo.
create view public.liquidity_summary
with (security_invoker = true) as
select
  a.user_id,
  sum(a.balance) filter (
    where a.nature = 'asset' and a.parent_account_id is null
  ) as available_balance,
  sum(a.balance) filter (
    where a.nature = 'asset'
      and a.parent_account_id is not null
      and coalesce(y.withdrawal_lock, 'none') = 'none'
  ) as vault_liquid_balance,
  sum(a.balance) filter (
    where a.nature = 'asset'
      and a.parent_account_id is not null
      and coalesce(y.withdrawal_lock, 'none') <> 'none'
  ) as vault_locked_balance,
  sum(a.balance) filter (where a.nature = 'asset') as total_assets,
  sum(a.balance) filter (where a.nature = 'liability') as total_liabilities,
  coalesce(sum(a.balance) filter (where a.nature = 'asset'), 0)
    - coalesce(sum(a.balance) filter (where a.nature = 'liability'), 0) as net_worth
from public.accounts a
left join public.account_yield_config y on y.account_id = a.id
where not a.is_archived
group by a.user_id;

-- Avance de cada presupuesto del mes en curso.
create view public.budget_progress
with (security_invoker = true) as
select
  b.id,
  b.user_id,
  b.category_id,
  b.month,
  b.limit_amount,
  coalesce(spent.total, 0) as spent_amount,
  b.limit_amount - coalesce(spent.total, 0) as remaining_amount,
  case
    when b.limit_amount = 0 then 0
    else round(coalesce(spent.total, 0) / b.limit_amount, 4)
  end as progress
from public.budgets b
left join lateral (
  select sum(t.amount) as total
  from public.transactions t
  where t.user_id = b.user_id
    and t.category_id = b.category_id
    and t.type in ('expense', 'credit_charge')
    and date_trunc('month', t.occurred_at at time zone 'America/Mexico_City')::date = b.month
) spent on true;

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger accounts_touch before update on public.accounts
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger yield_config_touch before update on public.account_yield_config
  for each row execute function public.touch_updated_at();
create trigger credit_config_touch before update on public.account_credit_config
  for each row execute function public.touch_updated_at();
