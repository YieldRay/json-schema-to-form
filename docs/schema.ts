/**
 * A realistic sign-up / profile schema, shared across most demos to keep
 * them comparable: the only thing that changes between pages is the CSS.
 */
import type { ObjectSchema } from "../src/render.tsx";

export const schema: ObjectSchema = {
  type: "object",
  required: ["email", "handle", "plan", "topics"],
  properties: {
    email: {
      type: "string",
      format: "email",
      uiName: "Email",
      description: "Used for sign-in and account recovery.",
    },
    handle: {
      type: "string",
      minLength: 3,
      maxLength: 24,
      pattern: "^[a-zA-Z0-9_]+$",
      uiName: "Handle",
      description: "3-24 letters, numbers, or underscores.",
    },
    homepage: {
      type: "string",
      format: "uri",
      uiName: "Homepage",
      description: "Optional — link to your site or profile.",
    },
    plan: {
      type: "string",
      enum: ["free", "pro", "team"],
      default: "pro",
      uiWidget: "select",
      uiName: "Plan",
      description: "You can upgrade or downgrade any time.",
    },
    billing: {
      type: "string",
      enum: ["monthly", "yearly"],
      default: "yearly",
      uiName: "Billing cycle",
    },
    seats: {
      type: "integer",
      minimum: 1,
      maximum: 50,
      default: 5,
      uiWidget: "range",
      uiName: "Seats",
      description: "Only relevant for team plans.",
    },
    notifications: {
      type: "boolean",
      default: true,
      uiName: "Email me product updates",
    },
    topics: {
      type: "array",
      items: { type: "string", enum: ["frontend", "backend", "design", "ops"] },
      default: ["frontend", "backend"],
      uiName: "Topics you care about",
      description: "Pick at least one.",
    },
    channels: {
      type: "array",
      items: {
        type: "string",
        enum: ["email", "in-app", "sms", "push", "rss"],
      },
      default: ["email", "in-app"],
      uiWidget: "select",
      uiName: "Notification channels",
    },
    profile: {
      type: "object",
      uiName: "Profile",
      properties: {
        name: {
          type: "string",
          minLength: 1,
          uiName: "Full name",
        },
        bio: {
          type: "string",
          uiWidget: "textarea",
          maxLength: 280,
          uiName: "Short bio",
          description: "Up to 280 characters.",
        },
      },
    },
  },
};
