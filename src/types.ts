import type { z } from "zod";

/**
 * Minimal object schema shape accepted by this renderer.
 *
 * Only `type: "object"` schemas at the root are supported; nested properties
 * follow JSON Schema conventions as produced by `z.toJSONSchema`.
 */
export interface ObjectSchema {
  type: "object";
  properties?: Record<string, any>;
  [key: string]: any;
}

// we use BaseSchema instead of ObjectSchema
// as z.toJSONSchema returns BaseSchema
export type StrictObjectSchema = z.core.JSONSchema.BaseSchema;

export type Meta = Meta$multiple | Meta$non_multiple;

interface Meta$multiple {
  uiWidget: "checkbox" | "select";
  multiple?: boolean;
}

interface Meta$non_multiple {
  uiWidget: "radio" | "range" | "number" | "textarea" | "input";
  multiple?: false;
}
