import { z } from "zod";

export const recordExpenseSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.coerce.number().positive("El monto debe ser mayor a cero"),
  categoryId: z.string().uuid().optional(),
  merchant: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export const recordIncomeSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.coerce.number().positive("El monto debe ser mayor a cero"),
  categoryId: z.string().uuid().optional(),
  merchant: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export const transferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.coerce.number().positive("El monto debe ser mayor a cero"),
  notes: z.string().max(500).optional(),
});
