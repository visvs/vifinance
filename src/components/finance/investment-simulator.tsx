"use client";

import { Info } from "lucide-react";
import { useMemo, useState } from "react";

import { GrowthChart, VarianceChart } from "@/components/finance/charts";
import { Money } from "@/components/finance/money-text";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  projectWithVariance,
  solveSavingsGoal,
} from "@/lib/finance/compound";
import { toCentavos, toPesos } from "@/lib/finance/money";
import {
  COMPOUNDING_LABELS,
  gatReal,
  nominalToEffective,
  type CompoundingFrequency,
} from "@/lib/finance/rates";
import { netRateAfterIsr } from "@/lib/finance/tax";
import { formatMoney, formatPercent } from "@/lib/format";

const COMPOUNDING_OPTIONS: CompoundingFrequency[] = [
  "daily",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
];

interface Props {
  isrRate: number;
  inflation: number;
  taxYear: number;
}

/**
 * Calculadora de interés compuesto, equivalente en español y en pesos a la de
 * investor.gov (SEC): inversión inicial, aportación mensual, plazo, tasa,
 * rango de varianza y frecuencia de capitalización. Más el modo inverso
 * ("objetivo de ahorro") y dos cosas que aquí sí importan: la retención de ISR
 * y la inflación, para ver el rendimiento que de verdad te queda.
 */
export function InvestmentSimulator({ isrRate, inflation, taxYear }: Props) {
  const [initial, setInitial] = useState("10000");
  const [monthly, setMonthly] = useState("2000");
  const [years, setYears] = useState("10");
  const [rate, setRate] = useState("11");
  const [variance, setVariance] = useState("2");
  const [compounding, setCompounding] = useState<CompoundingFrequency>("daily");
  const [netOfIsr, setNetOfIsr] = useState(true);

  const [goalTarget, setGoalTarget] = useState("500000");
  const [goalInitial, setGoalInitial] = useState("20000");
  const [goalYears, setGoalYears] = useState("8");
  const [goalRate, setGoalRate] = useState("11");

  const grossRate = Number(rate) / 100 || 0;
  const effectiveRate = netOfIsr
    ? netRateAfterIsr(grossRate, isrRate)
    : grossRate;

  const scenarios = useMemo(
    () =>
      projectWithVariance(
        {
          initial: toCentavos(initial || 0),
          monthlyContribution: toCentavos(monthly || 0),
          years: Number(years) || 0,
          annualRate: effectiveRate,
          compounding,
        },
        Number(variance) / 100 || 0,
      ),
    [initial, monthly, years, effectiveRate, compounding, variance],
  );

  const base = scenarios.find((s) => s.scenario === "base")!;
  const low = scenarios.find((s) => s.scenario === "low")!;
  const high = scenarios.find((s) => s.scenario === "high")!;

  const growthData = base.byYear.map((row) => ({
    year: row.year,
    principal: toPesos(row.cumulativePrincipal),
    interest: toPesos(row.cumulativeInterest),
  }));

  const varianceData = base.byYear.map((row, index) => ({
    year: row.year,
    base: toPesos(row.endBalance),
    low: toPesos(low.byYear[index]?.endBalance ?? 0),
    high: toPesos(high.byYear[index]?.endBalance ?? 0),
  }));

  const goal = useMemo(
    () =>
      solveSavingsGoal({
        target: toCentavos(goalTarget || 0),
        initial: toCentavos(goalInitial || 0),
        years: Number(goalYears) || 1,
        annualRate: Number(goalRate) / 100 || 0,
        compounding,
      }),
    [goalTarget, goalInitial, goalYears, goalRate, compounding],
  );

  const gatNominal = nominalToEffective(effectiveRate, compounding);
  const realRate = gatReal(gatNominal, inflation);

  return (
    <Tabs defaultValue="crecimiento" className="space-y-5">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="crecimiento">Cuánto crecerá</TabsTrigger>
        <TabsTrigger value="meta">Cuánto debo ahorrar</TabsTrigger>
      </TabsList>

      <TabsContent value="crecimiento" className="space-y-5">
        <div className="bg-card grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
          <Field
            label="Inversión inicial"
            hint="Con cuánto empiezas"
            value={initial}
            onChange={setInitial}
            prefix="$"
          />
          <Field
            label="Aportación mensual"
            hint="Negativa si vas a retirar cada mes"
            value={monthly}
            onChange={setMonthly}
            prefix="$"
          />
          <Field
            label="Plazo en años"
            hint="Cuánto tiempo lo dejas crecer"
            value={years}
            onChange={setYears}
          />
          <Field
            label="Tasa anual estimada"
            hint="La que ofrece tu cuenta o instrumento"
            value={rate}
            onChange={setRate}
            suffix="%"
          />
          <Field
            label="Rango de varianza"
            hint="Para ver escenarios por arriba y por abajo"
            value={variance}
            onChange={setVariance}
            suffix="%"
          />

          <div className="space-y-1.5">
            <Label>Capitalización</Label>
            <Select
              value={compounding}
              onValueChange={(value) =>
                setCompounding(value as CompoundingFrequency)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPOUNDING_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {COMPOUNDING_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Cada cuánto el interés se suma al capital
            </p>
          </div>

          <div className="bg-surface-raised flex items-center justify-between gap-3 rounded-xl p-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">
                Descontar la retención de ISR
              </p>
              <p className="text-muted-foreground text-xs">
                {formatPercent(isrRate, 2)} anual sobre el capital (LIF {taxYear}).
                En México el ISR se retiene sobre el capital, no sobre el interés.
              </p>
            </div>
            <Switch checked={netOfIsr} onCheckedChange={setNetOfIsr} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Tendrás al final"
            value={formatMoney(base.finalBalance)}
            highlight
          />
          <Stat
            label="De tu bolsillo"
            value={formatMoney(base.totalPrincipal)}
          />
          <Stat
            label="Lo puso el interés"
            value={formatMoney(base.totalInterest)}
            positive
          />
        </div>

        <div className="bg-card space-y-2 rounded-2xl border p-4 text-sm">
          <div className="flex items-center gap-2">
            <Info className="text-muted-foreground size-4 shrink-0" />
            <p className="font-medium">Cómo leer estas tasas</p>
          </div>
          <dl className="grid gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground text-xs">Tasa aplicada</dt>
              <dd className="tabular font-medium">
                {formatPercent(effectiveRate)}
                {netOfIsr ? " neta de ISR" : " bruta"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">
                Efectiva anual (GAT nominal)
              </dt>
              <dd className="tabular font-medium">{formatPercent(gatNominal)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">
                GAT real (inflación {formatPercent(inflation, 1)})
              </dt>
              <dd
                className={`tabular font-medium ${realRate < 0 ? "text-negative" : "text-positive"}`}
              >
                {formatPercent(realRate)}
              </dd>
            </div>
          </dl>
          <p className="text-muted-foreground text-xs">
            La GAT real es lo que de verdad ganas: si sale negativa, tu dinero
            crece pero compra menos que antes.
          </p>
        </div>

        <ChartCard title="Capital contra interés">
          <GrowthChart data={growthData} />
        </ChartCard>

        <ChartCard
          title="Escenarios"
          subtitle={`Tasa entre ${formatPercent(low.annualRate)} y ${formatPercent(high.annualRate)}`}
        >
          <VarianceChart data={varianceData} />
        </ChartCard>

        <div className="bg-card overflow-hidden rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Año</TableHead>
                <TableHead className="text-right">Aportado</TableHead>
                <TableHead className="text-right">Interés</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {base.byYear.map((row) => (
                <TableRow key={row.year}>
                  <TableCell className="font-medium">{row.year}</TableCell>
                  <TableCell className="tabular text-right">
                    {formatMoney(row.contributions)}
                  </TableCell>
                  <TableCell className="tabular text-positive text-right">
                    {formatMoney(row.interest)}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {formatMoney(row.endBalance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="meta" className="space-y-5">
        <div className="bg-card grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
          <Field
            label="Quiero llegar a"
            hint="Tu meta"
            value={goalTarget}
            onChange={setGoalTarget}
            prefix="$"
          />
          <Field
            label="Ya tengo"
            hint="Capital con el que arrancas"
            value={goalInitial}
            onChange={setGoalInitial}
            prefix="$"
          />
          <Field
            label="En cuántos años"
            value={goalYears}
            onChange={setGoalYears}
          />
          <Field
            label="Tasa anual estimada"
            value={goalRate}
            onChange={setGoalRate}
            suffix="%"
          />
        </div>

        <div className="bg-card rounded-2xl border p-5 text-center">
          {goal.alreadyReached ? (
            <>
              <p className="text-muted-foreground text-sm">
                Con lo que ya tienes alcanzas la meta sin aportar nada más.
              </p>
              <Badge variant="secondary" className="mt-2">
                Meta cubierta
              </Badge>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                Tienes que ahorrar cada mes
              </p>
              <p className="tabular text-primary mt-1 text-3xl font-semibold">
                {formatMoney(goal.requiredMonthlyContribution)}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                De tu bolsillo saldrán{" "}
                <Money amount={goal.totalPrincipal} /> y el interés pondrá{" "}
                <Money amount={goal.totalInterest} className="text-positive" />
              </p>
            </>
          )}
        </div>

        <ChartCard title="Cómo llegas a la meta">
          <GrowthChart
            data={goal.projection.byYear.map((row) => ({
              year: row.year,
              principal: toPesos(row.cumulativePrincipal),
              interest: toPesos(row.cumulativeInterest),
            }))}
          />
        </ChartCard>
      </TabsContent>
    </Tabs>
  );
}

function Field({
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
  highlight,
  positive,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${highlight ? "bg-primary/10 border-primary/30" : "bg-card"}`}
    >
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={`tabular mt-1 text-xl font-semibold ${positive ? "text-positive" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-2">
        <h2 className="font-medium">{title}</h2>
        {subtitle ? (
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
