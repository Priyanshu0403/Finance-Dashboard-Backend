const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["viewer", "analyst", "admin"]).default("viewer"),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["viewer", "analyst", "admin"]).optional(),
  is_active: z.boolean().optional(),
});

const userFilterSchema = z.object({
  role: z.enum(["viewer", "analyst", "admin"]).optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const createTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1).max(100),
  date: isoDate,
  notes: z.string().max(500).optional(),
});

const updateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().min(1).max(100).optional(),
  date: isoDate.optional(),
  notes: z.string().max(500).nullable().optional(),
});

const transactionFilterSchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().optional(),
  date_from: isoDate.optional(),
  date_to: isoDate.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  userFilterSchema,
  createTransactionSchema,
  updateTransactionSchema,
  transactionFilterSchema,
};
