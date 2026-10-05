import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  institutionId: z.string().uuid().optional(),
  kind: z.enum([
    "checking",
    "savings",
    "vault",
    "term_deposit",
    "cash",
    "investment",
    "credit_card",
    "loan",
  ]),
  nature: z.enum(["asset", "liability"]),
  initialBalance: z.coerce.number().min(0).default(0),
  color: z.string().max(20).optional(),
  annualRate: z.coerce.number().min(0).max(100).optional(),
  compounding: z
    .enum(["daily", "monthly", "quarterly", "semiannual", "annual", "at_maturity"])
    .optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  cutoffDay: z.coerce.number().int().min(1).max(31).optional(),
  paymentDueDay: z.coerce.number().int().min(1).max(31).optional(),
});
