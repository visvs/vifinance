# ViFinance

App de finanzas personales para México. Modela cómo funciona el dinero **aquí**: apartados con tasa propia y plazo forzoso (Nu, Mercado Pago, Ualá), SOFIPOs con GAT de dos dígitos, retención de ISR sobre intereses, CAT calculado con la metodología de Banxico, y compras a Meses Sin Intereses.

**[→ Ver la demo pública](#)** &nbsp;·&nbsp; [Decisiones de arquitectura](#decisiones-de-arquitectura) &nbsp;·&nbsp; [Modelo de datos](#modelo-de-datos)

<sub>Hecho por [Violeta Vera](https://github.com/visvs). Software para producción; la demo tiene datos ficticios.</sub>

---

## Por qué existe

Las apps que hay son gringas y no entienden el sistema financiero mexicano. Si registras un apartado de Nu como una "cuenta de ahorro" pierdes el plazo forzoso, la penalización por retiro anticipado y la tasa distinta a la cuenta principal. Si registras un CETE como "inversión" se te olvida que el ISR se retiene sobre el capital, no sobre los intereses, y que la GAT real puede ser negativa aunque la nominal se vea bien. Este proyecto es la app que quería para mí.

## Lo que hace

- **Cuentas y apartados.** Modela cuentas de débito, tarjetas de crédito, apartados (`vault`) e inversiones a plazo (`term_deposit`) con jerarquía real: el saldo de una cuenta incluye el de sus cajitas.
- **Devengo automático de rendimientos.** Un job diario (`pg_cron`, 00:05 CDMX) calcula el interés de cada cuenta, aplica la retención de ISR y escribe movimientos reales con `is_accrual = true`. Idempotente y se pone al día si el proyecto estuvo pausado.
- **Aritmética en centavos enteros.** Nada de floats para dinero. El motor financiero (`lib/finance/`) opera en centavos con redondeo bancario (half-to-even) y acarreo de residuo sub-centavo para que un saldo pequeño sí genere rendimiento.
- **Simulador de inversiones.** Réplica en español y en pesos de la [calculadora de investor.gov](https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator): aportación mensual, escenarios de varianza, capitalización configurable, modo inverso "cuánto ahorrar para llegar a $X", más el interruptor "neto de ISR" que aquí sí importa.
- **Simulador de créditos.** Tabla de amortización francesa, pagos anticipados a capital (reducir plazo vs reducir mensualidad), calculadora del pago mínimo de tarjeta ("cuántos años y cuánto de más te cuesta") y **CAT calculado como TIR de los flujos** siguiendo la Circular 21/2009 de Banxico. Validado contra el ejemplo oficial: $15,000 a 24 pagos de $962.33 con $100 de apertura da CAT = 57.4%.
- **MSI vs contado.** No sólo la mensualidad: la comparación real considera cuánto rinde tu dinero mientras no lo gastas.
- **Reportes.** Ingresos vs egresos, gasto por categoría, patrimonio neto, tasa de ahorro y runway del fondo de emergencia.
- **Modo demo.** Cualquiera entra a `/demo` sin cuenta y ve la app completa con seis meses de datos realistas. Es de solo lectura **a nivel de base de datos** (RLS), no a nivel de UI.

## Stack

Next.js 16 (App Router, RSC) · React 19 · TypeScript estricto · Tailwind CSS v4 · shadcn/ui con tokens OKLCH · Recharts · Supabase (Postgres 17 + `pg_cron`, `@supabase/ssr`) · Zod · `next-themes` · `date-fns` / `date-fns-tz`.

## Decisiones de arquitectura

### 1. La base de datos es la fuente de verdad, no una tabla plana

`transactions` es **append-only**: se crea, no se edita ni se borra. Corregir un movimiento es emitir su reversa (`reverse_transaction()`). Un trigger `apply_transaction_to_balances()` actualiza `accounts.balance` dentro de la misma transacción de Postgres. Leer un saldo es instantáneo, pero siempre es reconstruible desde los movimientos.

La regla del signo no depende del tipo de movimiento sino de la **naturaleza de la cuenta**: una cuenta de activo sube al recibir y baja al entregar; una de pasivo (tarjeta) hace lo contrario, porque su saldo representa deuda. Con esa única regla, un gasto pagado con tarjeta aumenta la deuda y un pago de tarjeta la reduce, sin ramas especiales en el código.

### 2. Motor financiero puro, sin dependencias

`src/lib/finance/` no importa nada de React, Next ni Supabase. Es TypeScript puro con funciones puras: [`money`](src/lib/finance/money.ts), [`rates`](src/lib/finance/rates.ts), [`compound`](src/lib/finance/compound.ts), [`accrual`](src/lib/finance/accrual.ts), [`tax`](src/lib/finance/tax.ts), [`amortization`](src/lib/finance/amortization.ts), [`cat`](src/lib/finance/cat.ts), [`credit`](src/lib/finance/credit.ts). El mismo código es el que corre el devengo en el servidor y los simuladores en el navegador — no pueden dar números distintos por construcción.

### 3. Escrituras sólo por Server Actions → RPC transaccional

Cero escrituras de saldo desde el cliente. Todo pasa por Server Actions (con validación Zod) que llaman funciones `SECURITY INVOKER` en Postgres: `record_expense`, `record_income`, `transfer_between_accounts`, `open_vault`, `settle_matured_term`, `create_msi_plan`, `reverse_transaction`. Una transferencia mueve saldo en dos cuentas y escribe un movimiento — o pasa todo, o no pasa nada, garantizado por la transacción de la base de datos.

### 4. RLS de verdad, no cosmético

Todo lo del usuario tiene RLS activo con la misma forma: `user_id = (select auth.uid())`. Las políticas de `UPDATE` llevan `using` **y** `with check` — sin el segundo, un usuario podría reasignar el `user_id` de una fila suya a otra persona. `(select auth.uid())` va entre paréntesis para que Postgres lo evalúe una vez por consulta, no una vez por fila. Las vistas se crean con `security_invoker = true`; si no, se saltan el RLS.

**Modo demo**: el perfil marcado `is_demo` tiene política de lectura para `anon`; **ninguna** política de escritura lo incluye. La demo es de solo lectura a nivel de base de datos, no depende de que la interfaz esconda los botones.

### 5. Sin flotantes para dinero

Todo dinero se representa en centavos enteros. `toCentavos` / `toPesos` convierten en los bordes. `roundHalfEven` (redondeo bancario) evita el sesgo del redondeo tradicional. El devengo diario acarrea el residuo sub-centavo de un día al siguiente, para que $500 al 9% anual (que dan $0.1233 diarios) sí acumulen rendimiento.

### 6. Zona horaria fija

Todo el formateo usa `es-MX` con `America/Mexico_City` — no la del navegador. Esto es no negociable: el devengo ocurre en CDMX, y si el formateo cambia con el reloj del usuario, un movimiento del 30 de septiembre a las 23:00 CDMX se vería como del 1 de octubre para alguien en Madrid.

## Modelo de datos

```
                        ┌──────────────────┐
                        │  institutions    │  ← catálogo público: Nu, BBVA,
                        │  tax_parameters  │    Finsus, Cetesdirecto…
                        │  categories      │
                        └──────────────────┘

  ┌──────────────┐        ┌──────────────┐        ┌────────────────────────┐
  │  auth.users  ├───1:1──┤  profiles    │        │  account_yield_config  │
  └──────────────┘        └──────┬───────┘        │  account_credit_config │
                                 │                │  account_rate_history  │
                                 │ 1:N            └────────────┬───────────┘
                                 ▼                             │
                         ┌──────────────┐  ◀──────── 1:1 ─────┘
                         │  accounts    │
                         │  parent ─┐   │  ◀── un apartado es una cuenta
                         └────┬─────┘   │      hija con tasa y plazo propio
                              │ ▲       │
                              │ └───────┘  auto-referencia (1 nivel)
                              │
                              │ 1:N
                              ▼
                         ┌──────────────┐        ┌──────────────┐
                         │ transactions │────────│  budgets     │
                         │  append-only │        │ recurring    │
                         │  from → to   │        │ msi_plans    │
                         └──────────────┘        └──────────────┘
                              │
                              │ trigger `apply_transaction_to_balances`
                              ▼
                         actualiza accounts.balance
                         (misma transacción de Postgres)
```

Tres vistas materializan las agregaciones más frecuentes: `account_totals` (saldo propio + saldo de apartados), `liquidity_summary` (disponible / apartado / a plazo / patrimonio neto) y `budget_progress` (gasto del mes por categoría).

## Cómo correrlo

**Requisitos:** Node 22+, pnpm 11+, Docker (para Supabase local).

```bash
# Uno solo: clonar, dependencias, y Supabase local (Postgres + auth + API)
git clone https://github.com/visvs/vifinance.git
cd vifinance
pnpm install
pnpm supabase start

# Copia las credenciales que imprime `supabase start`
cp .env.example .env.local
# Edita .env.local con la URL y la publishable key locales

pnpm dev            # http://localhost:3000
```

`pnpm supabase db reset` aplica las migraciones + el seed de catálogos + los datos demo (~1,800 movimientos de seis meses).

## Estructura

```
src/
  app/                      Rutas Next.js (App Router)
    (app)/                    Rutas con sesión: dashboard, cuentas, movimientos, reportes
    login/                    Google OAuth
    demo/                     Cookie de demo → dashboard con datos de solo lectura
    auth/callback/            Regreso de OAuth
  components/
    finance/                  MoneyText, AccountCard, charts, simuladores
    shell/                    Header, sidebar, bottom-nav
    ui/                       shadcn
  lib/
    finance/                  ★ Motor financiero puro (money, rates, compound…)
    queries/                  Lecturas desde Server Components
    actions/                  Escrituras vía Server Actions (Zod → RPC)
    supabase/                 Clientes (server / client / proxy)
    format.ts                 Formateo es-MX / MXN / CDMX
  proxy.ts                  Refresco de sesión (era `middleware.ts` antes de Next 16)

supabase/
  migrations/               5 migraciones versionadas (schema, RLS, operations, accrual, security)
  seed.sql                  Catálogos: instituciones, categorías, parámetros fiscales
  seeds/demo.sql            Usuario demo con 6 meses de datos realistas
```

## Verificación

- **Reconciliación**: `accounts.balance` coincide **al centavo** con la suma de sus movimientos. Se verificó registrando gastos, transferencias a apartados, retiros y devengos: diferencia 0.00.
- **Aislamiento**: dos usuarios de prueba. Uno no ve las cuentas del otro; un `UPDATE` que intenta cambiar `user_id` afecta 0 filas.
- **Devengo idempotente**: correr `accrue_account` dos veces la misma fecha no duplica; un índice único sobre `(cuenta, fecha)` lo garantiza en la base de datos.
- **CAT contra ejemplo oficial de Banxico**: $15,000 principal, 24 pagos de $962.33, comisión de apertura $100 → CAT = **57.4%** exacto.
- **Advisors de Supabase**: dos hallazgos de seguridad resueltos (revocación de `EXECUTE` en trigger `SECURITY DEFINER`, política explícita de deny en `accrual_runs`). El único advisor restante es "leaked password protection", que no aplica porque la app usa Google OAuth y no contraseñas.

## Fuera de alcance (documentado a propósito)

Sincronización bancaria (Belvo/open banking), parseo del CFDI, UMA para INFONAVIT, multi-divisa, PWA offline, alertas por email, importación de estados de cuenta. Todo se puede añadir después sin refactor porque el motor financiero es puro. Pruebas: tampoco hay, y se justifica igual — `lib/finance/` está escrito como funciones puras precisamente para poder añadir Vitest más adelante sin tocar la aplicación.

## Licencia

MIT.
