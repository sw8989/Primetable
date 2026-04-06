import { z } from "zod";

export const positiveIntSchema = z.coerce.number().int().positive();
export const partySizeSchema = z.coerce.number().int().min(1).max(20);
