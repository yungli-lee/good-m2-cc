import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const routeIdParamsSchema = z.object({
  id: uuidSchema
});

export const routeSlugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9-]+$/)
});

export const publishStatusSchema = z.object({
  status: z.enum(["published", "archived"]).default("published")
});

export const uploadPropertyImageSchema = z.object({
  property_id: uuidSchema,
  alt_text: z.string().trim().max(180).optional().or(z.literal(""))
});

export function validationError() {
  return { error: "Invalid request data" };
}
