import type { ZodType } from "zod";

export function jsonContent<T extends ZodType>(schema: T, description: string) {
  return {
    content: { "application/json": { schema } },
    description,
  };
}

export function jsonBody<T extends ZodType>(schema: T) {
  return {
    content: { "application/json": { schema } },
    required: true as const,
  };
}
