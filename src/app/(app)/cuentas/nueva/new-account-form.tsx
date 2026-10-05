"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccount, type ActionResult } from "@/lib/actions/accounts";

interface Institution {
  id: string;
  name: string;
  kind: string;
  brandColor: string;
}

const KIND_OPTIONS = [
  { value: "checking", label: "Cuenta de cheques / débito", nature: "asset" },
  { value: "savings", label: "Ahorro", nature: "asset" },
  { value: "investment", label: "Inversión", nature: "asset" },
  { value: "cash", label: "Efectivo", nature: "asset" },
  { value: "credit_card", label: "Tarjeta de crédito", nature: "liability" },
  { value: "loan", label: "Préstamo", nature: "liability" },
] as const;

const initial: ActionResult = {};

export function NewAccountForm({
  institutions,
}: {
  institutions: Institution[];
}) {
  const [state, action, pending] = useActionState(createAccount, initial);
  const [kind, setKind] = useState("checking");

  const selected = KIND_OPTIONS.find((k) => k.value === kind);
  const nature = selected?.nature ?? "asset";
  const isLiability = nature === "liability";

  return (
    <form action={action} className="bg-card space-y-4 rounded-2xl border p-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <input type="hidden" name="nature" value={nature} />

      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          placeholder="Ej: Nu Cuenta, BBVA Nómina"
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="institutionId">Institución</Label>
        <Select name="institutionId">
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una" />
          </SelectTrigger>
          <SelectContent>
            {institutions.map((inst) => (
              <SelectItem key={inst.id} value={inst.id}>
                <span
                  className="mr-2 inline-block size-2 rounded-full"
                  style={{ backgroundColor: inst.brandColor }}
                />
                {inst.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="kind">Tipo de cuenta</Label>
        <Select
          name="kind"
          value={kind}
          onValueChange={setKind}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="initialBalance">
          {isLiability ? "Saldo actual (deuda)" : "Saldo inicial"}
        </Label>
        <div className="relative">
          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
            $
          </span>
          <Input
            id="initialBalance"
            name="initialBalance"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue="0"
            className="tabular pl-7"
          />
        </div>
      </div>

      {!isLiability ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="annualRate">Tasa anual (%)</Label>
            <Input
              id="annualRate"
              name="annualRate"
              inputMode="decimal"
              placeholder="Ej: 15"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compounding">Capitalización</Label>
            <Select name="compounding" defaultValue="daily">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diaria</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="creditLimit">Límite de crédito</Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                id="creditLimit"
                name="creditLimit"
                inputMode="decimal"
                placeholder="50,000"
                className="tabular pl-7"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cutoffDay">Día de corte</Label>
              <Input
                id="cutoffDay"
                name="cutoffDay"
                type="number"
                min={1}
                max={31}
                placeholder="15"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentDueDay">Día límite de pago</Label>
              <Input
                id="paymentDueDay"
                name="paymentDueDay"
                type="number"
                min={1}
                max={31}
                placeholder="5"
              />
            </div>
          </div>
        </>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
