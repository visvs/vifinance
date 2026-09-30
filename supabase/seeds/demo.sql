-- =============================================================================
-- ViFinance — Datos de la demostración pública
--
-- Crea un usuario marcado `is_demo`, con cuentas e historial realistas de una
-- persona en México. El RLS permite LEER estas filas sin sesión y ninguna
-- política de escritura las incluye, así que la demo no se puede modificar
-- aunque alguien llame a la API directamente.
--
-- Los movimientos se generan a partir de la fecha de hoy, de modo que la demo
-- siempre se ve vigente sin tener que regenerar el archivo.
-- =============================================================================

do $$
declare
  v_demo_id uuid := '000d0000-0000-4000-8000-000000000001';
  v_dev_id uuid := '000d0000-0000-4000-8000-000000000002';
  v_nu uuid;
  v_nu_emergencia uuid;
  v_nu_enganche uuid;
  v_mp uuid;
  v_bbva uuid;
  v_finsus uuid;
  v_efectivo uuid;
  v_tdc uuid;
  v_msi uuid;
  v_day date;
  v_month date;
  v_cat record;
begin
  -- ---------------------------------------------------------------------------
  -- Usuarios
  -- ---------------------------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values
    ('00000000-0000-0000-0000-000000000000', v_demo_id, 'authenticated',
     'authenticated', 'demo@vifinance.mx',
     extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}',
     '{"full_name":"Ana Martínez"}', now() - interval '7 months', now()),
    ('00000000-0000-0000-0000-000000000000', v_dev_id, 'authenticated',
     'authenticated', 'dev@vifinance.local',
     extensions.crypt('vifinance-dev', extensions.gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}',
     '{"full_name":"Usuario de desarrollo"}', now(), now())
  on conflict (id) do nothing;

  update public.profiles
    set is_demo = true, display_name = 'Ana Martínez', onboarded_at = now()
    where id = v_demo_id;

  -- ---------------------------------------------------------------------------
  -- Cuentas
  -- ---------------------------------------------------------------------------
  insert into public.accounts (user_id, institution_id, name, kind, nature, opened_on, display_order)
  select v_demo_id, id, 'Cuenta Nu', 'checking', 'asset', current_date - 400, 10
  from public.institutions where slug = 'nu' returning id into v_nu;

  insert into public.account_yield_config (account_id, gross_annual_rate, compounding, day_count_basis, last_accrued_on)
  values (v_nu, 0.0900, 'daily', 365, current_date - 180);
  insert into public.account_rate_history (account_id, gross_annual_rate, effective_from, note)
  values (v_nu, 0.0900, current_date - 400, 'Tasa a la vista');

  insert into public.accounts (user_id, institution_id, name, kind, nature, opened_on, display_order)
  select v_demo_id, id, 'Mercado Pago', 'checking', 'asset', current_date - 300, 20
  from public.institutions where slug = 'mercado-pago' returning id into v_mp;

  insert into public.account_yield_config (account_id, gross_annual_rate, compounding, day_count_basis, last_accrued_on)
  values (v_mp, 0.0850, 'daily', 365, current_date - 180);
  insert into public.account_rate_history (account_id, gross_annual_rate, effective_from)
  values (v_mp, 0.0850, current_date - 300);

  insert into public.accounts (user_id, institution_id, name, kind, nature, opened_on, display_order)
  select v_demo_id, id, 'BBVA Cuenta Maestra', 'checking', 'asset', current_date - 900, 30
  from public.institutions where slug = 'bbva' returning id into v_bbva;

  insert into public.accounts (user_id, institution_id, name, kind, nature, opened_on, display_order)
  select v_demo_id, id, 'Finsus Ahorro', 'savings', 'asset', current_date - 200, 40
  from public.institutions where slug = 'finsus' returning id into v_finsus;

  insert into public.account_yield_config (account_id, gross_annual_rate, compounding, day_count_basis, last_accrued_on)
  values (v_finsus, 0.1400, 'daily', 365, current_date - 180);
  insert into public.account_rate_history (account_id, gross_annual_rate, effective_from)
  values (v_finsus, 0.1400, current_date - 200);

  insert into public.accounts (user_id, institution_id, name, kind, nature, color, opened_on, display_order)
  select v_demo_id, id, 'Efectivo', 'cash', 'asset', '#6B7280', current_date - 900, 50
  from public.institutions where slug = 'efectivo' returning id into v_efectivo;

  insert into public.accounts (user_id, institution_id, name, kind, nature, opened_on, display_order)
  select v_demo_id, id, 'BBVA Tarjeta Azul', 'credit_card', 'liability', current_date - 700, 60
  from public.institutions where slug = 'bbva' returning id into v_tdc;

  insert into public.account_credit_config
    (account_id, credit_limit, annual_rate, cutoff_day, payment_due_day, minimum_payment_rate, annual_fee)
  values (v_tdc, 45000, 0.5988, 15, 5, 0.05, 750);

  -- Apartados de Nu: uno líquido con meta, otro a plazo forzoso
  insert into public.accounts
    (user_id, institution_id, parent_account_id, name, kind, nature, target_amount, target_date, opened_on)
  select v_demo_id, id, v_nu, 'Fondo de emergencia', 'vault', 'asset', 120000,
         current_date + 210, current_date - 180
  from public.institutions where slug = 'nu' returning id into v_nu_emergencia;

  insert into public.account_yield_config
    (account_id, gross_annual_rate, compounding, day_count_basis, withdrawal_lock, last_accrued_on)
  values (v_nu_emergencia, 0.0975, 'daily', 365, 'none', current_date - 180);
  insert into public.account_rate_history (account_id, gross_annual_rate, effective_from)
  values (v_nu_emergencia, 0.0975, current_date - 180);

  insert into public.accounts
    (user_id, institution_id, parent_account_id, name, kind, nature, opened_on)
  select v_demo_id, id, v_nu, 'Enganche auto', 'term_deposit', 'asset', current_date - 62
  from public.institutions where slug = 'nu' returning id into v_nu_enganche;

  insert into public.account_yield_config
    (account_id, gross_annual_rate, compounding, day_count_basis, term_days,
     starts_on, matures_on, withdrawal_lock, early_withdrawal_penalty_rate, last_accrued_on)
  values (v_nu_enganche, 0.1475, 'at_maturity', 365, 90,
          current_date - 62, current_date + 28, 'hard', 0, current_date - 62);
  insert into public.account_rate_history (account_id, gross_annual_rate, effective_from)
  values (v_nu_enganche, 0.1475, current_date - 62);

  -- ---------------------------------------------------------------------------
  -- Saldos iniciales, seis meses atrás
  -- ---------------------------------------------------------------------------
  insert into public.transactions (user_id, type, amount, to_account_id, occurred_at, notes)
  values
    (v_demo_id, 'adjustment', 28400, v_nu, (current_date - 182)::timestamptz, 'Saldo inicial'),
    (v_demo_id, 'adjustment', 6200, v_mp, (current_date - 182)::timestamptz, 'Saldo inicial'),
    (v_demo_id, 'adjustment', 31500, v_bbva, (current_date - 182)::timestamptz, 'Saldo inicial'),
    (v_demo_id, 'adjustment', 64000, v_finsus, (current_date - 182)::timestamptz, 'Saldo inicial'),
    (v_demo_id, 'adjustment', 2300, v_efectivo, (current_date - 182)::timestamptz, 'Saldo inicial'),
    (v_demo_id, 'adjustment', 71000, v_nu_emergencia, (current_date - 180)::timestamptz, 'Saldo inicial del apartado'),
    (v_demo_id, 'adjustment', 90000, v_nu_enganche, (current_date - 62)::timestamptz, 'Apertura del plazo');

  -- ---------------------------------------------------------------------------
  -- Nómina quincenal: días 15 y último de cada mes
  -- ---------------------------------------------------------------------------
  for v_day in
    select d::date from generate_series(current_date - 182, current_date, '1 day') d
    where extract(day from d) = 15
       or d = (date_trunc('month', d) + interval '1 month - 1 day')::date
  loop
    insert into public.transactions
      (user_id, type, amount, to_account_id, category_id, occurred_at, merchant)
    select v_demo_id, 'income', 18750, v_bbva, id,
           (v_day + interval '9 hours')::timestamptz, 'Nómina quincenal'
    from public.categories where name = 'Nómina' and user_id is null;
  end loop;

  -- Transferencia mensual del sueldo a Nu para gastar
  for v_day in
    select d::date from generate_series(current_date - 182, current_date, '1 day') d
    where extract(day from d) = 16
  loop
    insert into public.transactions
      (user_id, type, amount, from_account_id, to_account_id, occurred_at, notes)
    values (v_demo_id, 'transfer', 17000, v_bbva, v_nu,
            (v_day + interval '10 hours')::timestamptz, 'Traspaso para gastos');

    -- Mercado Pago es la cuenta de transporte: también hay que fondearla.
    insert into public.transactions
      (user_id, type, amount, from_account_id, to_account_id, occurred_at, notes)
    values (v_demo_id, 'transfer', 2200, v_bbva, v_mp,
            (v_day + interval '10 hours 5 minutes')::timestamptz, 'Traspaso a Mercado Pago');
  end loop;

  -- Ahorro mensual al fondo de emergencia
  for v_day in
    select d::date from generate_series(current_date - 182, current_date, '1 day') d
    where extract(day from d) = 17
  loop
    insert into public.transactions
      (user_id, type, amount, from_account_id, to_account_id, occurred_at, notes)
    values (v_demo_id, 'transfer', 4000, v_nu, v_nu_emergencia,
            (v_day + interval '10 hours')::timestamptz, 'Ahorro del mes');
  end loop;

  -- ---------------------------------------------------------------------------
  -- Gastos fijos mensuales
  -- ---------------------------------------------------------------------------
  for v_day in
    select d::date from generate_series(current_date - 182, current_date, '1 day') d
    where extract(day from d) = 3
  loop
    insert into public.transactions
      (user_id, type, amount, from_account_id, category_id, occurred_at, merchant)
    select v_demo_id, 'expense', 9500, v_bbva, id,
           (v_day + interval '11 hours')::timestamptz, 'Renta departamento'
    from public.categories where name = 'Hogar' and user_id is null;

    insert into public.transactions
      (user_id, type, amount, from_account_id, category_id, occurred_at, merchant)
    select v_demo_id, 'expense', 689, v_nu, id,
           (v_day + interval '12 hours')::timestamptz, 'Internet Totalplay'
    from public.categories where name = 'Servicios' and user_id is null;

    insert into public.transactions
      (user_id, type, amount, from_account_id, category_id, occurred_at, merchant)
    select v_demo_id, 'expense', 299, v_nu, id,
           (v_day + interval '12 hours 5 minutes')::timestamptz, 'Telcel plan'
    from public.categories where name = 'Servicios' and user_id is null;

    insert into public.transactions
      (user_id, type, amount, from_account_id, category_id, occurred_at, merchant)
    select v_demo_id, 'credit_charge', 299, v_tdc, id,
           (v_day + interval '13 hours')::timestamptz, 'Spotify + Netflix'
    from public.categories where name = 'Suscripciones' and user_id is null;
  end loop;

  -- Recibo de luz cada dos meses (CFE)
  for v_day in
    select d::date from generate_series(current_date - 182, current_date, '1 day') d
    where extract(day from d) = 8 and extract(month from d)::integer % 2 = 0
  loop
    insert into public.transactions
      (user_id, type, amount, from_account_id, category_id, occurred_at, merchant)
    select v_demo_id, 'expense', 1240, v_bbva, id,
           (v_day + interval '11 hours')::timestamptz, 'CFE'
    from public.categories where name = 'Servicios' and user_id is null;
  end loop;

  -- ---------------------------------------------------------------------------
  -- Gasto variable del día a día
  --
  -- Se usa una semilla fija para que la demo sea siempre la misma: si cambiara
  -- en cada reset, ninguna captura de pantalla coincidiría con lo que se ve.
  -- ---------------------------------------------------------------------------
  perform setseed(0.42);

  for v_day in
    select d::date from generate_series(current_date - 182, current_date, '1 day') d
  loop
    -- Súper, dos veces por semana
    if extract(dow from v_day) in (3, 6) then
      insert into public.transactions
        (user_id, type, amount, from_account_id, category_id, occurred_at, merchant)
      select v_demo_id, 'expense', round((650 + random() * 900)::numeric, 2), v_nu, id,
             (v_day + interval '18 hours')::timestamptz,
             (array['Soriana', 'Chedraui', 'Walmart', 'La Comer', 'Bodega Aurrerá'])[1 + floor(random() * 5)]
      from public.categories where name = 'Supermercado' and user_id is null;
    end if;

    -- Comidas entre semana
    if extract(dow from v_day) between 1 and 5 and random() < 0.55 then
      insert into public.transactions
        (user_id, type, amount, from_account_id, category_id, occurred_at, merchant)
      select v_demo_id, 'expense', round((85 + random() * 210)::numeric, 2), v_nu, id,
             (v_day + interval '14 hours')::timestamptz,
             (array['Fonda Doña Mary', 'Tacos El Güero', 'Starbucks', 'Rappi', 'Cafebrería'])[1 + floor(random() * 5)]
      from public.categories where name = 'Alimentos' and user_id is null;
    end if;

    -- Transporte casi diario
    if extract(dow from v_day) between 1 and 5 and random() < 0.7 then
      insert into public.transactions
        (user_id, type, amount, from_account_id, category_id, occurred_at, merchant)
      select v_demo_id, 'expense', round((45 + random() * 165)::numeric, 2), v_mp, id,
             (v_day + interval '8 hours 30 minutes')::timestamptz,
             (array['Uber', 'DiDi', 'Metro CDMX', 'Gasolinera Pemex'])[1 + floor(random() * 4)]
      from public.categories where name = 'Transporte' and user_id is null;
    end if;

    -- Ocio de fin de semana, casi siempre con tarjeta
    if extract(dow from v_day) in (0, 6) and random() < 0.5 then
      insert into public.transactions
        (user_id, type, amount, from_account_id, category_id, occurred_at, merchant)
      select v_demo_id, 'credit_charge', round((220 + random() * 700)::numeric, 2), v_tdc, id,
             (v_day + interval '20 hours')::timestamptz,
             (array['Cinépolis', 'Bar La Nacional', 'Restaurante Roma', 'Concierto'])[1 + floor(random() * 4)]
      from public.categories where name = 'Ocio' and user_id is null;
    end if;

    -- Salud y ropa, de vez en cuando
    if random() < 0.04 then
      insert into public.transactions
        (user_id, type, amount, from_account_id, category_id, occurred_at, merchant)
      select v_demo_id, 'expense', round((180 + random() * 950)::numeric, 2), v_nu, id,
             (v_day + interval '17 hours')::timestamptz,
             (array['Farmacia del Ahorro', 'Consulta médica', 'Laboratorio'])[1 + floor(random() * 3)]
      from public.categories where name = 'Salud' and user_id is null;
    end if;

    -- Gasto en efectivo del día a día
    if random() < 0.45 then
      insert into public.transactions
        (user_id, type, amount, from_account_id, category_id, occurred_at, merchant)
      select v_demo_id, 'expense', round((40 + random() * 180)::numeric, 2), v_efectivo, id,
             (v_day + interval '13 hours')::timestamptz,
             (array['Mercado local', 'Puesto de tacos', 'Propina', 'Tianguis'])[1 + floor(random() * 4)]
      from public.categories where name = 'Alimentos' and user_id is null;
    end if;

    -- Retiro de efectivo
    if extract(day from v_day) in (5, 20) then
      insert into public.transactions
        (user_id, type, amount, from_account_id, to_account_id, occurred_at, notes)
      values (v_demo_id, 'transfer', 1500, v_nu, v_efectivo,
              (v_day + interval '19 hours')::timestamptz, 'Retiro en cajero');
    end if;
  end loop;

  -- ---------------------------------------------------------------------------
  -- Compra a Meses Sin Intereses y pagos de la tarjeta
  -- ---------------------------------------------------------------------------
  insert into public.msi_plans
    (user_id, credit_account_id, description, total_amount, installments,
     installments_paid, monthly_amount, purchased_on, first_payment_on, category_id)
  select v_demo_id, v_tdc, 'Laptop para trabajo', 24000, 12, 4, 2000,
         current_date - 120, current_date - 90, id
  from public.categories where name = 'Ropa' and user_id is null
  returning id into v_msi;

  insert into public.transactions
    (user_id, type, amount, from_account_id, occurred_at, merchant, notes, msi_plan_id)
  values (v_demo_id, 'credit_charge', 24000, v_tdc, (current_date - 120)::timestamptz,
          'Apple Store', 'Compra a 12 MSI', v_msi);

  for v_day in
    select d::date from generate_series(current_date - 150, current_date, '1 day') d
    where extract(day from d) = 5
  loop
    insert into public.transactions
      (user_id, type, amount, from_account_id, to_account_id, occurred_at, notes)
    values (v_demo_id, 'credit_payment', 6500, v_bbva, v_tdc,
            (v_day + interval '10 hours')::timestamptz, 'Pago de tarjeta');
  end loop;

  -- ---------------------------------------------------------------------------
  -- Presupuestos del mes en curso
  -- ---------------------------------------------------------------------------
  v_month := date_trunc('month', current_date)::date;

  for v_cat in
    select id, name from public.categories
    where user_id is null
      and name in ('Supermercado', 'Alimentos', 'Transporte', 'Ocio', 'Servicios')
  loop
    insert into public.budgets (user_id, category_id, month, limit_amount)
    values (
      v_demo_id, v_cat.id, v_month,
      case v_cat.name
        when 'Supermercado' then 6500
        when 'Alimentos' then 3000
        when 'Transporte' then 2500
        when 'Ocio' then 2000
        else 1500
      end
    )
    on conflict do nothing;
  end loop;

  -- ---------------------------------------------------------------------------
  -- Movimientos recurrentes
  -- ---------------------------------------------------------------------------
  insert into public.recurring_rules
    (user_id, name, type, amount, to_account_id, from_account_id, category_id,
     frequency, day_of_month, second_day_of_month, starts_on, next_run_on, auto_post)
  select v_demo_id, 'Nómina quincenal', 'income', 18750, v_bbva, null, id,
         'semimonthly', 15, 30, current_date - 182,
         (date_trunc('month', current_date) + interval '14 days')::date, true
  from public.categories where name = 'Nómina' and user_id is null;

  insert into public.recurring_rules
    (user_id, name, type, amount, from_account_id, category_id,
     frequency, day_of_month, starts_on, next_run_on, auto_post)
  select v_demo_id, 'Renta', 'expense', 9500, v_bbva, id,
         'monthly', 3, current_date - 182,
         (date_trunc('month', current_date) + interval '1 month 2 days')::date, false
  from public.categories where name = 'Hogar' and user_id is null;

  -- ---------------------------------------------------------------------------
  -- Devengo de los seis meses: que la demo muestre rendimientos reales
  -- ---------------------------------------------------------------------------
  perform public.accrue_account(v_nu);
  perform public.accrue_account(v_mp);
  perform public.accrue_account(v_finsus);
  perform public.accrue_account(v_nu_emergencia);
  perform public.accrue_account(v_nu_enganche);

  raise notice 'Demo lista: % movimientos',
    (select count(*) from public.transactions where user_id = v_demo_id);
end $$;
