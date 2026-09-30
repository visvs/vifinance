"use client";

import { AlertTriangle, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";

import { BalanceChart } from "@/components/finance/charts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildAmortizationSchedule,
  compareExtraPayment,
  periodicPayment,
} from "@/lib/finance/amortization";
import { calculateSimpleCreditCat, formatCat } from "@/lib/finance/cat";
import { compareAgainstFixedPayment, compareMsiVsCash } from "@/lib/finance/credit";
import { toCentavos, toPesos } from "@/lib/finance/money";
import { formatMoney, formatPercent } from "@/lib/format";

/** Presets por tipo de crédito, con valores típicos del mercado mexicano. */
const PRESETS = {
  personal: { label: "Personal / nómina", amount: "60000", rate: "38", months: "24", fee: "2" },
  auto: { label: "Automotriz", amount: "280000", rate: "14", months: "48", fee: "3" },
  hipotecario: { label: "Hipotecario", amount: "1800000", rate: "11", months: "240", fee: "1" },
} as const;

type PresetKey = keyof typeof PRESETS;

export function CreditSimulator() {
  return (
    <Tabs defaultValue="credito" className="space-y-5">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="credito">Crédito</TabsTrigger>
        <TabsTrigger value="tarjeta">Pago mínimo</TabsTrigger>
        <TabsTrigger value="msi">MSI vs contado</TabsTrigger>
      </TabsList>

      <TabsContent value="credito">
        <LoanSimulator />
      </TabsContent>
      <TabsContent value="tarjeta">
        <MinimumPaymentSimulator />
      </TabsContent>
      <TabsContent value="msi">
        <MsiSimulator />
      </TabsContent>
    </Tabs>
  );
}

function LoanSimulator() {
  const [preset, setPreset] = useState<PresetKey>("personal");
  const [amount, setAmount] = useState<string>(PRESETS.personal.amount);
  const [rate, setRate] = useState<string>(PRESETS.personal.rate);
  const [months, setMonths] = useState<string>(PRESETS.personal.months);
  const [fee, setFee] = useState<string>(PRESETS.personal.fee);
  const [insurance, setInsurance] = useState("0");
  const [extra, setExtra] = useState("0");

  function applyPreset(key: PresetKey) {
    setPreset(key);
    setAmount(PRESETS[key].amount);
    setRate(PRESETS[key].rate);
    setMonths(PRESETS[key].months);
    setFee(PRESETS[key].fee);
  }

  const principal = toCentavos(amount || 0);
  const annualRate = Number(rate) / 100 || 0;
  const periods = Number(months) || 1;
  const openingFeeRate = Number(fee) / 100 || 0;
  const insurancePerPeriod = toCentavos(insurance || 0);

  const result = useMemo(
    () =>
      buildAmortizationSchedule({
        principal,
        annualRate,
        periods,
        openingFeeRate,
        insurancePerPeriod,
      }),
    [principal, annualRate, periods, openingFeeRate, insurancePerPeriod],
  );

  const cat = useMemo(() => {
    try {
      return calculateSimpleCreditCat({
        principal,
        payment: periodicPayment(principal, annualRate, periods),
        periods,
        openingFee: Math.round(principal * openingFeeRate),
        insurancePerPeriod,
      });
    } catch {
      return null;
    }
  }, [principal, annualRate, periods, openingFeeRate, insurancePerPeriod]);

  const extraAmount = toCentavos(extra || 0);
  const comparison = useMemo(() => {
    if (extraAmount <= 0) return null;
    // Un abono a capital cada 12 meses: es el patrón realista del aguinaldo.
    const payments = [];
    for (let period = 12; period < periods; period += 12) {
      payments.push({ period, amount: extraAmount });
    }
    if (payments.length === 0) return null;
    return compareExtraPayment(
      { principal, annualRate, periods, openingFeeRate, insurancePerPeriod },
      payments,
      "reduce_term",
    );
  }, [extraAmount, principal, annualRate, periods, openingFeeRate, insurancePerPeriod]);

  return (
    <div className="space-y-5">
      <div className="bg-card space-y-4 rounded-2xl border p-4">
        <div className="space-y-1.5">
          <Label>Tipo de crédito</Label>
          <Select value={preset} onValueChange={(v) => applyPreset(v as PresetKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRESETS).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Monto del crédito" value={amount} onChange={setAmount} prefix="$" />
          <NumberField label="Tasa anual" value={rate} onChange={setRate} suffix="%" />
          <NumberField label="Plazo en meses" value={months} onChange={setMonths} />
          <NumberField label="Comisión por apertura" value={fee} onChange={setFee} suffix="%" />
          <NumberField
            label="Seguro mensual"
            hint="Si el crédito exige uno"
            value={insurance}
            onChange={setInsurance}
            prefix="$"
          />
          <NumberField
            label="Abono anual a capital"
            hint="Por ejemplo, parte del aguinaldo"
            value={extra}
            onChange={setExtra}
            prefix="$"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pagarás cada mes" value={formatMoney(result.totalPeriodicPayment)} highlight />
        <Stat label="Intereses totales" value={formatMoney(result.totalInterest)} negative />
        <Stat
          label="CAT"
          value={cat === null ? "—" : formatCat(cat)}
          hint="Incluye tasa, comisión y seguros"
          negative
        />
      </div>

      <Alert>
        <AlertDescription className="text-xs">
          El <strong>CAT</strong> se calcula con la metodología del Banco de
          México (Circular 21/2009): es la tasa que iguala el valor presente de
          lo que recibes con el de todo lo que pagas. Por eso es más alto que la
          tasa de interés y es lo único que sirve para comparar dos créditos.
        </AlertDescription>
      </Alert>

      {comparison ? (
        <div className="bg-positive-muted border-positive/30 rounded-2xl border p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="text-positive size-4" />
            <p className="text-sm font-medium">
              Abonando {formatMoney(extraAmount)} cada año a capital
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Ahorras en intereses</p>
              <p className="tabular text-positive font-semibold">
                {formatMoney(comparison.interestSaved)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Te lo quitas antes</p>
              <p className="tabular font-semibold">
                {comparison.periodsSaved} meses
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="bg-card rounded-2xl border p-4">
        <h2 className="mb-2 font-medium">Cómo baja tu deuda</h2>
        <BalanceChart
          data={result.schedule.map((row) => ({
            period: row.period,
            balance: toPesos(row.closingBalance),
          }))}
        />
      </section>

      <div className="bg-card overflow-hidden rounded-2xl border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-medium">Tabla de amortización</h2>
          <Badge variant="secondary">{result.actualPeriods} pagos</Badge>
        </div>
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader className="bg-card sticky top-0">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Interés</TableHead>
                <TableHead className="text-right">Capital</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.schedule.map((row) => (
                <TableRow key={row.period}>
                  <TableCell className="text-muted-foreground">{row.period}</TableCell>
                  <TableCell className="tabular text-right">{formatMoney(row.payment)}</TableCell>
                  <TableCell className="tabular text-negative text-right">
                    {formatMoney(row.interest)}
                  </TableCell>
                  <TableCell className="tabular text-positive text-right">
                    {formatMoney(row.principal)}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {formatMoney(row.closingBalance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function MinimumPaymentSimulator() {
  const [balance, setBalance] = useState("25000");
  const [rate, setRate] = useState("60");
  const [minimumRate, setMinimumRate] = useState("5");
  const [fixed, setFixed] = useState("3000");

  const input = {
    balance: toCentavos(balance || 0),
    annualRate: Number(rate) / 100 || 0,
    minimumRate: Number(minimumRate) / 100 || 0.05,
  };

  const comparison = useMemo(
    () => compareAgainstFixedPayment(input, toCentavos(fixed || 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [balance, rate, minimumRate, fixed],
  );

  const years = Math.floor(comparison.minimum.months / 12);
  const restMonths = comparison.minimum.months % 12;

  return (
    <div className="space-y-5">
      <div className="bg-card grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
        <NumberField label="Saldo de tu tarjeta" value={balance} onChange={setBalance} prefix="$" />
        <NumberField label="Tasa anual" value={rate} onChange={setRate} suffix="%" />
        <NumberField
          label="Pago mínimo"
          hint="Porcentaje del saldo que exige tu banco"
          value={minimumRate}
          onChange={setMinimumRate}
          suffix="%"
        />
        <NumberField
          label="Si en vez del mínimo pagaras"
          value={fixed}
          onChange={setFixed}
          prefix="$"
        />
      </div>

      {comparison.minimum.neverPaysOff ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Con ese pago mínimo la deuda <strong>nunca se liquida</strong>: lo que
            pagas no alcanza ni para cubrir los intereses del mes.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-negative-muted border-negative/30 space-y-2 rounded-2xl border p-4">
          <p className="text-sm font-medium">Pagando sólo el mínimo</p>
          <p className="tabular text-2xl font-semibold">
            {years > 0 ? `${years} años` : ""} {restMonths > 0 ? `${restMonths} meses` : ""}
          </p>
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Primer pago</dt>
              <dd className="tabular">{formatMoney(comparison.minimum.firstPayment)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pagarías en total</dt>
              <dd className="tabular">{formatMoney(comparison.minimum.totalPaid)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Sólo de intereses</dt>
              <dd className="tabular text-negative font-medium">
                {formatMoney(comparison.minimum.totalInterest)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-positive-muted border-positive/30 space-y-2 rounded-2xl border p-4">
          <p className="text-sm font-medium">Pagando {formatMoney(toCentavos(fixed || 0))} al mes</p>
          <p className="tabular text-2xl font-semibold">
            {comparison.fixed.months} meses
          </p>
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pagarías en total</dt>
              <dd className="tabular">{formatMoney(comparison.fixed.totalPaid)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Sólo de intereses</dt>
              <dd className="tabular">{formatMoney(comparison.fixed.totalInterest)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Te ahorras</dt>
              <dd className="tabular text-positive font-semibold">
                {formatMoney(comparison.interestSaved)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="bg-card rounded-2xl border p-4">
        <h2 className="mb-2 font-medium">Cómo baja el saldo pagando el mínimo</h2>
        <BalanceChart
          data={comparison.minimum.balanceByMonth
            .slice(0, 240)
            .map((value, index) => ({ period: index, balance: toPesos(value) }))}
        />
      </section>
    </div>
  );
}

function MsiSimulator() {
  const [price, setPrice] = useState("24000");
  const [months, setMonths] = useState("12");
  const [discount, setDiscount] = useState("0");
  const [opportunity, setOpportunity] = useState("11");

  const result = useMemo(
    () =>
      compareMsiVsCash({
        price: toCentavos(price || 0),
        months: Number(months) || 1,
        cashDiscountRate: Number(discount) / 100 || 0,
        opportunityAnnualRate: Number(opportunity) / 100 || 0,
      }),
    [price, months, discount, opportunity],
  );

  return (
    <div className="space-y-5">
      <div className="bg-card grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
        <NumberField label="Precio de la compra" value={price} onChange={setPrice} prefix="$" />
        <NumberField label="Número de meses" value={months} onChange={setMonths} />
        <NumberField
          label="Descuento por pago de contado"
          hint="Lo que te rebajan si no usas MSI"
          value={discount}
          onChange={setDiscount}
          suffix="%"
        />
        <NumberField
          label="Tasa de tu cuenta de ahorro"
          hint="Lo que tu dinero gana mientras no lo gastas"
          value={opportunity}
          onChange={setOpportunity}
          suffix="%"
        />
      </div>

      <div
        className={`rounded-2xl border p-5 text-center ${
          result.verdict === "msi"
            ? "bg-positive-muted border-positive/30"
            : result.verdict === "cash"
              ? "bg-warning-muted border-warning/30"
              : "bg-card"
        }`}
      >
        <p className="text-muted-foreground text-sm">
          {result.verdict === "msi"
            ? "Te conviene comprar a meses"
            : result.verdict === "cash"
              ? "Te conviene pagar de contado"
              : "Da lo mismo"}
        </p>
        <p className="tabular mt-1 text-3xl font-semibold">
          {formatMoney(Math.abs(result.realCost))}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {result.verdict === "msi"
            ? "es lo que ganas de más usando los meses sin intereses"
            : result.verdict === "cash"
              ? "es lo que te cuesta de más pagar a meses"
              : "la diferencia es cero"}
        </p>
      </div>

      <dl className="bg-card grid gap-3 rounded-2xl border p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground text-xs">Mensualidad</dt>
          <dd className="tabular font-semibold">{formatMoney(result.monthlyPayment)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Precio de contado</dt>
          <dd className="tabular font-semibold">{formatMoney(result.cashPrice)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Rendimiento que conservas</dt>
          <dd className="tabular text-positive font-semibold">
            {formatMoney(result.opportunityGain)}
          </dd>
        </div>
      </dl>

      <Alert>
        <AlertDescription className="text-xs">
          Los Meses Sin Intereses sí tienen un costo cuando el comercio cobra más
          caro que de contado. La comparación correcta no es cuánto pagas, sino
          dónde termina tu dinero: a meses conservas el capital y sigue generando
          rendimiento, y eso se pone contra el descuento que perdiste.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {prefix ? (
          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
            {prefix}
          </span>
        ) : null}
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`tabular ${prefix ? "pl-7" : ""} ${suffix ? "pr-8" : ""}`}
        />
        {suffix ? (
          <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${highlight ? "bg-primary/10 border-primary/30" : "bg-card"}`}
    >
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`tabular mt-1 text-xl font-semibold ${negative ? "text-negative" : ""}`}>
        {value}
      </p>
      {hint ? <p className="text-muted-foreground mt-0.5 text-[11px]">{hint}</p> : null}
    </div>
  );
}
