-- =============================================================================
-- ViFinance — Operaciones atómicas
--
-- Todo lo que mueve dinero entra por aquí. Son funciones `SECURITY INVOKER`, así
-- que el RLS sigue aplicando: si intentas mover dinero de una cuenta que no es
-- tuya, la función no encuentra la cuenta y falla, sin depender de que la
-- interfaz haya hecho bien su trabajo.
--
-- Viven en Postgres y no en el servidor de Next.js porque una transferencia
-- toca dos cuentas y una tabla de movimientos: o pasa todo, o no pasa nada. Eso
-- lo garantiza la transacción de la base de datos, no una secuencia de llamadas
-- HTTP que puede fallar a la mitad.
-- =============================================================================

-- Verifica que la cuenta exista, sea del usuario y no esté archivada.
create or replace function public.assert_own_account(p_account_id uuid)
returns public.accounts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account public.accounts;
begin
  select * into v_account from public.accounts where id = p_account_id;

  if not found then
    raise exception 'La cuenta no existe o no tienes acceso a ella'
      using errcode = 'insufficient_privilege';
  end if;

  if v_account.is_archived then
    raise exception 'La cuenta "%" está archivada', v_account.name;
  end if;

  return v_account;
end;
$$;

-- -----------------------------------------------------------------------------
-- Registrar un gasto
--
-- Si la cuenta de origen es una tarjeta de crédito el movimiento se guarda como
-- `credit_charge` y aumenta la deuda; si es una cuenta de débito es un `expense`
-- y baja el saldo. La diferencia la decide la naturaleza de la cuenta, no el
-- formulario.
-- -----------------------------------------------------------------------------
create or replace function public.record_expense(
  p_account_id uuid,
  p_amount numeric,
  p_category_id uuid default null,
  p_occurred_at timestamptz default now(),
  p_merchant text default null,
  p_notes text default null
)
returns public.transactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account public.accounts;
  v_transaction public.transactions;
  v_credit public.account_credit_config;
  v_available numeric(18, 2);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto del gasto debe ser mayor a cero';
  end if;

  v_account := public.assert_own_account(p_account_id);

  -- Una cuenta de débito no puede quedar en números rojos: si el gasto no cabe,
  -- o la cuenta está mal capturada o el gasto se pagó con otra cosa. Dejarlo
  -- pasar produce saldos negativos que nadie revisa hasta que el reporte miente.
  if v_account.nature = 'asset' and v_account.balance < p_amount then
    raise exception 'Saldo insuficiente en %: tienes %, intentas gastar %',
      v_account.name,
      to_char(v_account.balance, 'FM999,999,999.00'),
      to_char(p_amount, 'FM999,999,999.00');
  end if;

  if v_account.nature = 'liability' then
    select * into v_credit from public.account_credit_config where account_id = p_account_id;

    if found and v_credit.credit_limit is not null then
      v_available := v_credit.credit_limit - v_account.balance;
      if p_amount > v_available then
        raise exception
          'El cargo excede tu crédito disponible en % (disponible: %)',
          v_account.name, to_char(v_available, 'FM999,999,999.00');
      end if;
    end if;
  end if;

  insert into public.transactions (
    user_id, type, amount, from_account_id, category_id,
    occurred_at, merchant, notes
  )
  values (
    v_account.user_id,
    (case when v_account.nature = 'liability' then 'credit_charge' else 'expense' end)::public.transaction_type,
    p_amount,
    p_account_id,
    p_category_id,
    p_occurred_at,
    p_merchant,
    p_notes
  )
  returning * into v_transaction;

  return v_transaction;
end;
$$;

-- -----------------------------------------------------------------------------
-- Registrar un ingreso
-- -----------------------------------------------------------------------------
create or replace function public.record_income(
  p_account_id uuid,
  p_amount numeric,
  p_category_id uuid default null,
  p_occurred_at timestamptz default now(),
  p_merchant text default null,
  p_notes text default null
)
returns public.transactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account public.accounts;
  v_transaction public.transactions;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto del ingreso debe ser mayor a cero';
  end if;

  v_account := public.assert_own_account(p_account_id);

  insert into public.transactions (
    user_id, type, amount, to_account_id, category_id,
    occurred_at, merchant, notes
  )
  values (
    v_account.user_id, 'income', p_amount, p_account_id, p_category_id,
    p_occurred_at, p_merchant, p_notes
  )
  returning * into v_transaction;

  return v_transaction;
end;
$$;

-- -----------------------------------------------------------------------------
-- Transferir entre cuentas
--
-- Cubre los cuatro casos de la vida real con la misma función: mandar dinero a
-- otro banco (SPEI), apartar dinero en una cajita, sacarlo de la cajita, y
-- pagar una tarjeta de crédito.
--
-- Si el origen es un apartado con plazo forzoso, aquí se aplica la regla: con
-- bloqueo duro no se puede sacar, y con bloqueo suave se puede pero se cobra la
-- penalización como un movimiento aparte, para que quede visible cuánto costó
-- romper el plazo.
-- -----------------------------------------------------------------------------
create or replace function public.transfer_between_accounts(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_occurred_at timestamptz default now(),
  p_notes text default null,
  p_force boolean default false
)
returns public.transactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_from public.accounts;
  v_to public.accounts;
  v_yield public.account_yield_config;
  v_penalty numeric(18, 2);
  v_transaction public.transactions;
  v_type public.transaction_type;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto de la transferencia debe ser mayor a cero';
  end if;

  if p_from_account_id = p_to_account_id then
    raise exception 'No puedes transferir una cuenta a sí misma';
  end if;

  v_from := public.assert_own_account(p_from_account_id);
  v_to := public.assert_own_account(p_to_account_id);

  if v_from.nature = 'asset' and v_from.balance < p_amount then
    raise exception 'Saldo insuficiente en %: tienes %, intentas mover %',
      v_from.name,
      to_char(v_from.balance, 'FM999,999,999.00'),
      to_char(p_amount, 'FM999,999,999.00');
  end if;

  -- Reglas de plazo del apartado de origen.
  select * into v_yield from public.account_yield_config where account_id = p_from_account_id;

  if found and v_yield.matures_on is not null and v_yield.matures_on > current_date then
    if v_yield.withdrawal_lock = 'hard' and not p_force then
      raise exception
        'El plazo de % vence el %: no se puede retirar antes',
        v_from.name, to_char(v_yield.matures_on, 'DD/MM/YYYY');
    end if;

    if v_yield.withdrawal_lock = 'soft' and v_yield.early_withdrawal_penalty_rate > 0 then
      v_penalty := round(p_amount * v_yield.early_withdrawal_penalty_rate, 2);
    end if;
  end if;

  -- Pagar una tarjeta o un préstamo no es una transferencia cualquiera: se
  -- marca como tal para que los reportes no la cuenten como movimiento interno.
  v_type := case
    when v_to.nature = 'liability' then 'credit_payment'
    else 'transfer'
  end;

  insert into public.transactions (
    user_id, type, amount, from_account_id, to_account_id, occurred_at, notes
  )
  values (
    v_from.user_id, v_type, p_amount, p_from_account_id, p_to_account_id,
    p_occurred_at, p_notes
  )
  returning * into v_transaction;

  -- La penalización se cobra de la cuenta donde acaba de caer el dinero, no del
  -- apartado: después de un retiro total el apartado puede quedar en ceros.
  if v_penalty is not null and v_penalty > 0 then
    insert into public.transactions (
      user_id, type, amount, from_account_id, occurred_at, notes
    )
    values (
      v_from.user_id, 'fee', v_penalty, p_to_account_id, p_occurred_at,
      format('Penalización por retiro anticipado de %s', v_from.name)
    );
  end if;

  return v_transaction;
end;
$$;

-- -----------------------------------------------------------------------------
-- Abrir un apartado o un plazo fijo
--
-- Crea la subcuenta, su configuración de rendimiento y mueve el dinero desde la
-- cuenta padre, todo en una sola transacción.
-- -----------------------------------------------------------------------------
create or replace function public.open_vault(
  p_parent_account_id uuid,
  p_name text,
  p_initial_amount numeric,
  p_gross_annual_rate numeric default 0,
  p_compounding public.compounding_frequency default 'daily',
  p_term_days integer default null,
  p_withdrawal_lock public.lock_type default 'none',
  p_penalty_rate numeric default 0,
  p_target_amount numeric default null,
  p_target_date date default null,
  p_destination public.yield_destination default 'capitalize',
  p_applies_isr boolean default true,
  p_day_count_basis smallint default 365
)
returns public.accounts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_parent public.accounts;
  v_vault public.accounts;
begin
  v_parent := public.assert_own_account(p_parent_account_id);

  if v_parent.parent_account_id is not null then
    raise exception 'No puedes crear un apartado dentro de otro apartado';
  end if;

  if v_parent.nature <> 'asset' then
    raise exception 'Sólo las cuentas de activo pueden tener apartados';
  end if;

  insert into public.accounts (
    user_id, institution_id, parent_account_id, name, nature, kind,
    target_amount, target_date
  )
  values (
    v_parent.user_id,
    v_parent.institution_id,
    p_parent_account_id,
    p_name,
    'asset',
    (case when p_term_days is null then 'vault' else 'term_deposit' end)::public.account_kind,
    p_target_amount,
    p_target_date
  )
  returning * into v_vault;

  if p_gross_annual_rate > 0 or p_term_days is not null then
    insert into public.account_yield_config (
      account_id, gross_annual_rate, compounding, day_count_basis,
      destination, applies_isr, term_days, starts_on, matures_on,
      withdrawal_lock, early_withdrawal_penalty_rate, last_accrued_on
    )
    values (
      v_vault.id, p_gross_annual_rate, p_compounding, p_day_count_basis,
      p_destination, p_applies_isr, p_term_days, current_date,
      case when p_term_days is null then null else current_date + p_term_days end,
      p_withdrawal_lock, p_penalty_rate, current_date
    );

    insert into public.account_rate_history (account_id, gross_annual_rate, note)
    values (v_vault.id, p_gross_annual_rate, 'Tasa inicial');
  end if;

  if p_initial_amount > 0 then
    perform public.transfer_between_accounts(
      p_parent_account_id, v_vault.id, p_initial_amount,
      now(), format('Apertura de %s', p_name)
    );
  end if;

  select * into v_vault from public.accounts where id = v_vault.id;
  return v_vault;
end;
$$;

-- -----------------------------------------------------------------------------
-- Liquidar un plazo vencido
--
-- Al vencimiento, o se renueva por otro plazo igual, o el dinero regresa a la
-- cuenta padre y el apartado se archiva.
-- -----------------------------------------------------------------------------
create or replace function public.settle_matured_term(p_account_id uuid)
returns public.accounts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account public.accounts;
  v_yield public.account_yield_config;
begin
  v_account := public.assert_own_account(p_account_id);

  select * into v_yield from public.account_yield_config where account_id = p_account_id;

  if not found or v_yield.matures_on is null then
    raise exception '% no es una inversión a plazo', v_account.name;
  end if;

  if v_yield.matures_on > current_date then
    raise exception 'El plazo de % todavía no vence (vence el %)',
      v_account.name, to_char(v_yield.matures_on, 'DD/MM/YYYY');
  end if;

  if v_yield.auto_renew then
    update public.account_yield_config
      set starts_on = current_date,
          matures_on = current_date + v_yield.term_days
      where account_id = p_account_id;

    select * into v_account from public.accounts where id = p_account_id;
    return v_account;
  end if;

  if v_account.balance > 0 and v_account.parent_account_id is not null then
    perform public.transfer_between_accounts(
      p_account_id,
      v_account.parent_account_id,
      v_account.balance,
      now(),
      format('Vencimiento de %s', v_account.name),
      true
    );
  end if;

  update public.accounts set is_archived = true where id = p_account_id;

  select * into v_account from public.accounts where id = p_account_id;
  return v_account;
end;
$$;

-- -----------------------------------------------------------------------------
-- Compra a Meses Sin Intereses
--
-- Registra el cargo completo en la tarjeta (porque así afecta tu crédito
-- disponible desde el primer día) y guarda el plan de pagos, que es lo que
-- alimenta la proyección de flujo de los próximos meses.
-- -----------------------------------------------------------------------------
create or replace function public.create_msi_plan(
  p_credit_account_id uuid,
  p_description text,
  p_total_amount numeric,
  p_installments smallint,
  p_first_payment_on date default null,
  p_category_id uuid default null,
  p_purchased_on date default current_date
)
returns public.msi_plans
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account public.accounts;
  v_plan public.msi_plans;
begin
  if p_installments <= 0 then
    raise exception 'El plan debe tener al menos una mensualidad';
  end if;

  v_account := public.assert_own_account(p_credit_account_id);

  if v_account.nature <> 'liability' then
    raise exception 'Los Meses Sin Intereses se cargan a una tarjeta de crédito';
  end if;

  insert into public.msi_plans (
    user_id, credit_account_id, description, total_amount, installments,
    monthly_amount, purchased_on, first_payment_on, category_id
  )
  values (
    v_account.user_id, p_credit_account_id, p_description, p_total_amount,
    p_installments,
    round(p_total_amount / p_installments, 2),
    p_purchased_on,
    coalesce(p_first_payment_on, p_purchased_on + interval '1 month')::date,
    p_category_id
  )
  returning * into v_plan;

  insert into public.transactions (
    user_id, type, amount, from_account_id, category_id,
    occurred_at, merchant, notes, msi_plan_id
  )
  values (
    v_account.user_id, 'credit_charge', p_total_amount, p_credit_account_id,
    p_category_id, p_purchased_on::timestamptz, p_description,
    format('Compra a %s MSI', p_installments), v_plan.id
  );

  return v_plan;
end;
$$;

-- -----------------------------------------------------------------------------
-- Registrar la ocurrencia de un movimiento recurrente
-- -----------------------------------------------------------------------------
create or replace function public.post_recurring_occurrence(
  p_rule_id uuid,
  p_occurred_at timestamptz default now()
)
returns public.transactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rule public.recurring_rules;
  v_transaction public.transactions;
  v_next date;
begin
  select * into v_rule from public.recurring_rules where id = p_rule_id;

  if not found then
    raise exception 'La regla recurrente no existe o no tienes acceso a ella'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.transactions (
    user_id, type, amount, from_account_id, to_account_id, category_id,
    occurred_at, merchant, recurring_rule_id
  )
  values (
    v_rule.user_id, v_rule.type, v_rule.amount, v_rule.from_account_id,
    v_rule.to_account_id, v_rule.category_id, p_occurred_at, v_rule.name, v_rule.id
  )
  returning * into v_transaction;

  v_next := case v_rule.frequency
    when 'weekly' then v_rule.next_run_on + 7
    when 'biweekly' then v_rule.next_run_on + 14
    when 'semimonthly' then
      case
        when extract(day from v_rule.next_run_on) < coalesce(v_rule.second_day_of_month, 15)
          then date_trunc('month', v_rule.next_run_on)::date
               + (coalesce(v_rule.second_day_of_month, 15) - 1)
        else (date_trunc('month', v_rule.next_run_on) + interval '1 month')::date
             + (coalesce(v_rule.day_of_month, 1) - 1)
      end
    when 'monthly' then (v_rule.next_run_on + interval '1 month')::date
    when 'bimonthly' then (v_rule.next_run_on + interval '2 months')::date
    when 'quarterly' then (v_rule.next_run_on + interval '3 months')::date
    when 'semiannual' then (v_rule.next_run_on + interval '6 months')::date
    when 'annual' then (v_rule.next_run_on + interval '1 year')::date
  end;

  update public.recurring_rules
    set next_run_on = v_next,
        is_active = case when v_rule.ends_on is not null and v_next > v_rule.ends_on
                         then false else is_active end
    where id = p_rule_id;

  return v_transaction;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reversar un movimiento
--
-- Los movimientos no se editan ni se borran: se emite el contrario. Así el
-- historial cuenta la verdad, incluyendo el error.
-- -----------------------------------------------------------------------------
create or replace function public.reverse_transaction(
  p_transaction_id uuid,
  p_reason text default null
)
returns public.transactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_original public.transactions;
  v_reversal public.transactions;
begin
  select * into v_original from public.transactions where id = p_transaction_id;

  if not found then
    raise exception 'El movimiento no existe o no tienes acceso a él'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.transactions where reverses_transaction_id = p_transaction_id) then
    raise exception 'Ese movimiento ya fue reversado';
  end if;

  insert into public.transactions (
    user_id, type, amount, from_account_id, to_account_id, category_id,
    occurred_at, merchant, notes, reverses_transaction_id
  )
  values (
    v_original.user_id,
    'adjustment',
    v_original.amount,
    -- Invertir la dirección es lo que deshace el movimiento.
    v_original.to_account_id,
    v_original.from_account_id,
    v_original.category_id,
    now(),
    v_original.merchant,
    coalesce(p_reason, 'Reversa de movimiento'),
    p_transaction_id
  )
  returning * into v_reversal;

  return v_reversal;
end;
$$;

grant execute on function
  public.record_expense(uuid, numeric, uuid, timestamptz, text, text),
  public.record_income(uuid, numeric, uuid, timestamptz, text, text),
  public.transfer_between_accounts(uuid, uuid, numeric, timestamptz, text, boolean),
  public.open_vault(uuid, text, numeric, numeric, public.compounding_frequency, integer, public.lock_type, numeric, numeric, date, public.yield_destination, boolean, smallint),
  public.settle_matured_term(uuid),
  public.create_msi_plan(uuid, text, numeric, smallint, date, uuid, date),
  public.post_recurring_occurrence(uuid, timestamptz),
  public.reverse_transaction(uuid, text)
to authenticated;
