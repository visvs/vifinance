"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney, formatMoneyCompact } from "@/lib/format";

/**
 * Gráficas de la app.
 *
 * Todas leen sus colores de las variables CSS del tema, así que cambian solas
 * al pasar de oscuro a claro sin duplicar paletas. Los montos llegan en
 * centavos y se convierten a pesos sólo aquí, en el borde de la presentación.
 */

const AXIS_STYLE = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
} as const;

function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover rounded-xl border px-3 py-2 shadow-lg">
      {label ? <p className="mb-1 text-xs font-medium">{label}</p> : null}
      {payload.map((entry, index) => (
        <p key={index} className="flex items-center gap-2 text-xs">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="tabular ml-auto font-medium">
            {formatMoney(Math.round((entry.value ?? 0) * 100))}
          </span>
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseChart({
  data,
}: {
  data: Array<{ month: string; income: number; expense: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_STYLE} />
        <YAxis
          tickFormatter={(value: number) => formatMoneyCompact(value * 100)}
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          width={56}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="income" name="Ingresos" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Egresos" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({
  data,
}: {
  data: Array<{ name: string; value: number; color: string }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={95}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<TooltipContent />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function NetWorthChart({
  data,
}: {
  data: Array<{ label: string; value: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_STYLE} />
        <YAxis
          tickFormatter={(value: number) => formatMoneyCompact(value * 100)}
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          width={56}
        />
        <Tooltip content={<TooltipContent />} />
        <Area
          type="monotone"
          dataKey="value"
          name="Patrimonio"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#netWorthFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Capital contra interés a lo largo del tiempo, para el simulador. */
export function GrowthChart({
  data,
}: {
  data: Array<{ year: number; principal: number; interest: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          tickFormatter={(value: number) => `A${value}`}
        />
        <YAxis
          tickFormatter={(value: number) => formatMoneyCompact(value * 100)}
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          width={56}
        />
        <Tooltip content={<TooltipContent />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Area
          type="monotone"
          dataKey="principal"
          name="Lo que aportaste"
          stackId="1"
          stroke="var(--chart-2)"
          fill="var(--chart-2)"
          fillOpacity={0.35}
        />
        <Area
          type="monotone"
          dataKey="interest"
          name="Lo que generó el interés"
          stackId="1"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          fillOpacity={0.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Tres curvas de escenario: tasa baja, esperada y alta. */
export function VarianceChart({
  data,
}: {
  data: Array<{ year: number; low: number; base: number; high: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          tickFormatter={(value: number) => `A${value}`}
        />
        <YAxis
          tickFormatter={(value: number) => formatMoneyCompact(value * 100)}
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          width={56}
        />
        <Tooltip content={<TooltipContent />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="high"
          name="Tasa alta"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="base"
          name="Tasa esperada"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="low"
          name="Tasa baja"
          stroke="var(--chart-3)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Saldo insoluto de un crédito a lo largo del plazo. */
export function BalanceChart({
  data,
}: {
  data: Array<{ period: number; balance: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tick={AXIS_STYLE} />
        <YAxis
          tickFormatter={(value: number) => formatMoneyCompact(value * 100)}
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          width={56}
        />
        <Tooltip content={<TooltipContent />} />
        <Area
          type="monotone"
          dataKey="balance"
          name="Saldo pendiente"
          stroke="var(--chart-5)"
          strokeWidth={2}
          fill="url(#balanceFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
