-- =============================================================================
-- ViFinance — Catálogos base
--
-- Instituciones financieras mexicanas, categorías de gasto e ingreso, y los
-- parámetros fiscales de cada año.
--
-- Sobre las tasas: este catálogo **no trae tasas numéricas**, a propósito. Las
-- tasas de las cuentas mexicanas cambian cada pocos meses y una cifra vieja
-- escrita en la app es peor que ninguna: haría que las proyecciones y el
-- devengo mientan con toda confianza. Lo que sí trae es el esquema de
-- protección de cada institución, que casi no cambia y que sí debería pesar al
-- decidir dónde guardar el dinero. La tasa la captura el usuario al dar de alta
-- su cuenta, y queda con historial de vigencia.
--
-- Los colores de marca son aproximaciones para la interfaz, no activos
-- oficiales de las instituciones.
-- =============================================================================

insert into public.institutions
  (slug, name, short_name, kind, brand_color, protection_scheme, protection_limit_udis, reference_rate_note, display_order)
values
  -- Neobancos y fintech de uso diario
  ('nu', 'Nu México', 'Nu', 'neobanco', '#820AD1',
   'IPAB', 400000, 'Cuenta a la vista con rendimiento diario y Cajitas con plazo forzoso.', 10),
  ('mercado-pago', 'Mercado Pago', 'Mercado Pago', 'fintech', '#00B1EA',
   'Fondo de protección del emisor de los recursos invertidos', null,
   'Rendimiento diario sobre el saldo disponible.', 20),
  ('didi', 'DiDi Cuenta', 'DiDi', 'fintech', '#FF7043',
   'Recursos depositados en una institución financiera regulada', null,
   'Rendimiento a la vista.', 30),
  ('uala', 'Ualá', 'Ualá', 'fintech', '#FF4E64',
   'Recursos depositados en una institución financiera regulada', null,
   'Cuenta remunerada y apartados.', 40),
  ('klar', 'Klar', 'Klar', 'neobanco', '#1A1A2E',
   'IPAB', 400000, 'Cuenta con rendimiento y producto de plazo.', 50),
  ('stori', 'Stori', 'Stori', 'fintech', '#F23D6D',
   'Recursos depositados en una institución financiera regulada', null,
   'Tarjeta de crédito y cuenta de ahorro.', 60),
  ('hey-banco', 'Hey Banco', 'Hey', 'banco', '#00E08F',
   'IPAB', 400000, 'Cuenta digital de Banregio.', 70),
  ('fondeadora', 'Fondeadora', 'Fondeadora', 'fintech', '#00D68F',
   'Recursos depositados en una institución financiera regulada', null, null, 80),

  -- Bancos tradicionales
  ('bbva', 'BBVA México', 'BBVA', 'banco', '#1464A5', 'IPAB', 400000, null, 100),
  ('banorte', 'Banorte', 'Banorte', 'banco', '#EB0029', 'IPAB', 400000, null, 110),
  ('santander', 'Santander México', 'Santander', 'banco', '#EC0000', 'IPAB', 400000, null, 120),
  ('banamex', 'Banamex', 'Banamex', 'banco', '#0057B8', 'IPAB', 400000, null, 130),
  ('hsbc', 'HSBC México', 'HSBC', 'banco', '#DB0011', 'IPAB', 400000, null, 140),
  ('scotiabank', 'Scotiabank', 'Scotiabank', 'banco', '#EC111A', 'IPAB', 400000, null, 150),
  ('banco-azteca', 'Banco Azteca', 'Azteca', 'banco', '#00954D', 'IPAB', 400000, null, 160),
  ('inbursa', 'Inbursa', 'Inbursa', 'banco', '#005A9C', 'IPAB', 400000, null, 170),
  ('banregio', 'Banregio', 'Banregio', 'banco', '#F5A623', 'IPAB', 400000, null, 180),
  ('bancoppel', 'BanCoppel', 'BanCoppel', 'banco', '#FFD200', 'IPAB', 400000, null, 190),
  ('openbank', 'Openbank México', 'Openbank', 'banco', '#EC0000', 'IPAB', 400000,
   'Banco digital de Santander.', 200),

  -- SOFIPOs: rendimientos más altos, protección más baja. La diferencia importa.
  ('finsus', 'Finsus', 'Finsus', 'sofipo', '#00A88F',
   'Fondo de Protección de SOFIPOs', 25000,
   'Cuenta a la vista e inversiones a plazo.', 300),
  ('kubo-financiero', 'kubo.financiero', 'kubo', 'sofipo', '#F5821F',
   'Fondo de Protección de SOFIPOs', 25000, null, 310),
  ('supertasas', 'Supertasas', 'Supertasas', 'sofipo', '#003B71',
   'Fondo de Protección de SOFIPOs', 25000, 'Inversiones a plazo.', 320),
  ('came', 'CAME', 'CAME', 'sofipo', '#E4002B',
   'Fondo de Protección de SOFIPOs', 25000, null, 330),
  ('nu-sofipo', 'Nu Inversión (SOFIPO)', 'Nu SOFIPO', 'sofipo', '#820AD1',
   'Fondo de Protección de SOFIPOs', 25000, null, 340),

  -- Gobierno y mercado
  ('cetesdirecto', 'Cetesdirecto', 'Cetesdirecto', 'gobierno', '#9F2241',
   'Respaldo del Gobierno Federal', null,
   'CETES a 28, 91, 182 y 364 días, BONDDIA y otros instrumentos.', 400),
  ('gbm', 'GBM', 'GBM', 'casa_bolsa', '#0B1E3F', 'Casa de bolsa regulada', null, null, 410),

  -- Sin institución
  ('efectivo', 'Efectivo', 'Efectivo', 'efectivo', '#6B7280', null, null,
   'Dinero en la cartera o guardado en casa.', 900),
  ('otra', 'Otra institución', 'Otra', 'otro', '#64748B', null, null, null, 999);

-- -----------------------------------------------------------------------------
-- Parámetros fiscales
--
-- La tasa de retención de ISR sobre intereses la fija el Congreso cada año en
-- la Ley de Ingresos de la Federación y se aplica sobre el CAPITAL que genera
-- los intereses, no sobre el interés ganado (Art. 54 y 135 de la LISR).
-- -----------------------------------------------------------------------------

insert into public.tax_parameters
  (year, isr_rate_on_capital, iva_rate, estimated_inflation, uma_daily, source)
values
  (2024, 0.0015, 0.16, 0.045, 108.57, 'LIF 2024'),
  (2025, 0.0050, 0.16, 0.038, 113.14, 'LIF 2025'),
  (2026, 0.0090, 0.16, 0.038, null, 'LIF 2026, publicada en el DOF el 7 de noviembre de 2025');

-- -----------------------------------------------------------------------------
-- Categorías del sistema (user_id nulo: las ve todo el mundo)
-- -----------------------------------------------------------------------------

insert into public.categories (user_id, name, kind, icon, color, display_order)
values
  -- Gastos
  (null, 'Alimentos', 'expense', 'utensils', '#F97316', 10),
  (null, 'Supermercado', 'expense', 'shopping-cart', '#FB923C', 20),
  (null, 'Transporte', 'expense', 'car', '#3B82F6', 30),
  (null, 'Servicios', 'expense', 'zap', '#EAB308', 40),
  (null, 'Hogar', 'expense', 'home', '#8B5CF6', 50),
  (null, 'Salud', 'expense', 'heart-pulse', '#EF4444', 60),
  (null, 'Educación', 'expense', 'graduation-cap', '#06B6D4', 70),
  (null, 'Ocio', 'expense', 'party-popper', '#EC4899', 80),
  (null, 'Suscripciones', 'expense', 'repeat', '#A855F7', 90),
  (null, 'Ropa', 'expense', 'shirt', '#14B8A6', 100),
  (null, 'Mascotas', 'expense', 'paw-print', '#F59E0B', 110),
  (null, 'Impuestos', 'expense', 'landmark', '#64748B', 120),
  (null, 'Comisiones', 'expense', 'receipt', '#94A3B8', 130),
  (null, 'Regalos', 'expense', 'gift', '#F43F5E', 140),
  (null, 'Otros gastos', 'expense', 'circle-ellipsis', '#6B7280', 900),

  -- Ingresos
  (null, 'Nómina', 'income', 'briefcase', '#22C55E', 10),
  (null, 'Freelance', 'income', 'laptop', '#10B981', 20),
  (null, 'Rendimientos', 'income', 'trending-up', '#34D399', 30),
  (null, 'Venta', 'income', 'tag', '#4ADE80', 40),
  (null, 'Reembolso', 'income', 'undo-2', '#6EE7B7', 50),
  (null, 'Regalo recibido', 'income', 'gift', '#86EFAC', 60),
  (null, 'Otros ingresos', 'income', 'circle-plus', '#6B7280', 900);
