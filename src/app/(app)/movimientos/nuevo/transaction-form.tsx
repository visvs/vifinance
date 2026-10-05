"use client";

import { ArrowDownLeft, ArrowUpRight, Repeat2, PiggyBank } from "lucide-react";
import { useActionState } from "react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  recordExpense,
  recordIncome,
  transferBetweenAccounts,
  type ActionResult,
} from "@/lib/actions/transactions";
import { formatMoney } from "@/lib/format";

interface Account {
  id: string;
  name: string;
  nature: string;
  balance: number;
  institution: string | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Props {
  tipo: string;
  accounts: Account[];
  categories: Category[];
}

const TABS = [
  { value: "gasto", label: "Gasto", icon: ArrowUpRight },
  { value: "ingreso", label: "Ingreso", icon: ArrowDownLeft },
  { value: "transferencia", label: "Transferir", icon: Repeat2 },
  { value: "apartar", label: "Apartar", icon: PiggyBank },
] as const;

const initial: ActionResult = {};

export function TransactionForm({ tipo, accounts, categories }: Props) {
  const assetAccounts = accounts.filter((a) => a.nature === "asset");
  const allAccounts = accounts;

  return (
    <Tabs defaultValue={tipo === "apartar" ? "transferencia" : tipo} className="space-y-5">
      <TabsList className="grid w-full grid-cols-4">
        {TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value} className="gap-1.5">
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="gasto">
        <ExpenseForm accounts={allAccounts} categories={categories} />
      </TabsContent>

      <TabsContent value="ingreso">
        <IncomeForm accounts={assetAccounts} categories={categories} />
      </TabsContent>

      <TabsContent value="transferencia">
        <TransferForm accounts={allAccounts} />
      </TabsContent>

      <TabsContent value="apartar">
        <TransferForm accounts={allAccounts} />
      </TabsContent>
    </Tabs>
  );
}

function ExpenseForm({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const [state, action, pending] = useActionState(recordExpense, initial);

  return (
    <form action={action} className="bg-card space-y-4 rounded-2xl border p-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="amount">Monto</Label>
        <div className="relative">
          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
            $
          </span>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            required
            className="tabular pl-7 text-lg"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accountId">Cuenta</Label>
        <Select name="accountId" required>
          <SelectTrigger>
            <SelectValue placeholder="¿De dónde sale?" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
                <span className="text-muted-foreground ml-2 text-xs">
                  {formatMoney(a.balance)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="categoryId">Categoría</Label>
        <Select name="categoryId">
          <SelectTrigger>
            <SelectValue placeholder="Sin categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span
                  className="mr-2 inline-block size-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="merchant">Comercio</Label>
        <Input id="merchant" name="merchant" placeholder="Oxxo, Uber, etc." />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Nota</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Opcional"
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Registrar gasto"}
      </Button>
    </form>
  );
}

function IncomeForm({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const [state, action, pending] = useActionState(recordIncome, initial);

  return (
    <form action={action} className="bg-card space-y-4 rounded-2xl border p-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="income-amount">Monto</Label>
        <div className="relative">
          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
            $
          </span>
          <Input
            id="income-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            required
            className="tabular pl-7 text-lg"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="income-account">Cuenta</Label>
        <Select name="accountId" required>
          <SelectTrigger>
            <SelectValue placeholder="¿A dónde llega?" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="income-category">Categoría</Label>
        <Select name="categoryId">
          <SelectTrigger>
            <SelectValue placeholder="Sin categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span
                  className="mr-2 inline-block size-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="income-merchant">Origen</Label>
        <Input
          id="income-merchant"
          name="merchant"
          placeholder="Nómina, freelance, etc."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="income-notes">Nota</Label>
        <Textarea
          id="income-notes"
          name="notes"
          placeholder="Opcional"
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Registrar ingreso"}
      </Button>
    </form>
  );
}

function TransferForm({ accounts }: { accounts: Account[] }) {
  const [state, action, pending] = useActionState(
    transferBetweenAccounts,
    initial,
  );

  return (
    <form action={action} className="bg-card space-y-4 rounded-2xl border p-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="transfer-amount">Monto</Label>
        <div className="relative">
          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
            $
          </span>
          <Input
            id="transfer-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            required
            className="tabular pl-7 text-lg"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="from">De</Label>
        <Select name="fromAccountId" required>
          <SelectTrigger>
            <SelectValue placeholder="Cuenta origen" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
                <span className="text-muted-foreground ml-2 text-xs">
                  {formatMoney(a.balance)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="to">A</Label>
        <Select name="toAccountId" required>
          <SelectTrigger>
            <SelectValue placeholder="Cuenta destino" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="transfer-notes">Nota</Label>
        <Textarea
          id="transfer-notes"
          name="notes"
          placeholder="Opcional"
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Transfiriendo…" : "Transferir"}
      </Button>
    </form>
  );
}
