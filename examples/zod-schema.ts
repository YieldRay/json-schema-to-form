/**
 * The same shape as `./schema.ts`, built with Zod and converted to JSON Schema.
 * Shown side-by-side in the Zod demo.
 */
import { z } from "zod";
import type { ObjectSchema } from "../src/render.tsx";

const S = z.object({
  email: z
    .email()
    .meta({ uiName: "Email" })
    .describe("Used for sign-in and account recovery."),
  handle: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/)
    .meta({ uiName: "Handle" })
    .describe("3-24 letters, numbers, or underscores."),
  homepage: z
    .url()
    .optional()
    .meta({ uiName: "Homepage" })
    .describe("Optional — link to your site or profile."),
  plan: z
    .enum(["free", "pro", "team"])
    .default("pro")
    .meta({ uiWidget: "select", uiName: "Plan" })
    .describe("You can upgrade or downgrade any time."),
  billing: z
    .enum(["monthly", "yearly"])
    .default("yearly")
    .meta({ uiName: "Billing cycle" }),
  seats: z
    .int()
    .min(1)
    .max(50)
    .default(5)
    .meta({ uiWidget: "range", uiName: "Seats" })
    .describe("Only relevant for team plans."),
  notifications: z
    .boolean()
    .default(true)
    .meta({ uiName: "Email me product updates" }),
  topics: z
    .array(z.enum(["frontend", "backend", "design", "ops"]))
    .default(["frontend", "backend"])
    .meta({ uiName: "Topics you care about" })
    .describe("Pick at least one."),
  channels: z
    .array(z.enum(["email", "in-app", "sms", "push", "rss"]))
    .default(["email", "in-app"])
    .meta({ uiWidget: "select", uiName: "Notification channels" }),
  profile: z
    .object({
      name: z.string().min(1).meta({ uiName: "Full name" }),
      bio: z
        .string()
        .max(280)
        .optional()
        .meta({ uiWidget: "textarea", uiName: "Short bio" })
        .describe("Up to 280 characters."),
    })
    .meta({ uiName: "Profile" }),
});

export const zodSchema = z.toJSONSchema(S) as ObjectSchema;
