# json-schema-to-form

Generate HTML form markup from JSON Schema.

## What it does

- Render a JSON Schema to form controls (any valid JSON Schema is supported)
  - Use as JSX components (`RenderSchemaToHonoForm`, `RenderSchemaToHonoElements`)
  - Or produce plain strings (`convertSchemaToFormString`, `convertSchemaToString`)
- Normalize `FormData` into a nested object (`normalizeFormData`)

## Install

Install the library (add `zod` only if you plan to derive JSON Schema from Zod, and `ajv` only if you implement validation yourself):

```bash
npm i json-schema-to-form hono
# Optional:
npm i zod
npm i ajv
```

## Quick start

Render a form string from JSON Schema:

```ts
import {
  convertSchemaToFormString,
  type ObjectSchema,
} from "json-schema-to-form";

const schema = {
  type: "object",
  properties: {
    url: { type: "string", format: "uri" },
    method: {
      type: "string",
      enum: ["GET", "POST"],
      default: "POST",
      uiWidget: "select",
    },
    user: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 100 },
        age: { type: "number", minimum: 0, maximum: 120, uiWidget: "range" },
      },
    },
  },
} satisfies ObjectSchema;

// Equivalent with Zod (optional):
const S = z.object({
  url: z.url(),
  method: z.enum(["GET", "POST"]).default("POST").meta({ uiWidget: "select" }),
  user: z.object({
    name: z.string().min(1).max(100),
    age: z.number().min(0).max(120).meta({ uiWidget: "range" }),
  }),
});
const schema = z.toJSONSchema(S) as ObjectSchema;

const html: string = convertSchemaToFormString(schema, {
  method: "post",
  action: "/submit",
});
```

Use directly as JSX with Hono:

```tsx
import { Hono } from "hono";
import { html } from "hono/html";
import {
  RenderSchemaToHonoForm,
  RenderSchemaToHonoElements,
  type ObjectSchema,
} from "json-schema-to-form";

const app = new Hono();
const schema: ObjectSchema = {
  type: "object",
  properties: {
    url: { type: "string", format: "uri" },
    bio: { type: "string", uiWidget: "textarea" },
  },
};

app.get("/", (c) =>
  c.html(
    html`<html>
      <body>
        ${html`${(
          <RenderSchemaToHonoForm
            schema={schema}
            method="post"
            action="/submit"
          >
            <button type="submit">Submit</button>
          </RenderSchemaToHonoForm>
        )}`}
      </body>
    </html>`
  )
);

// If you prefer not use JSX:
const htmlString: string = RenderSchemaToHonoElements({
  schema,
  method: "post",
  action: "/submit",
}).toString();
```

Normalize submitted data (validation is app-owned):

```ts
import { normalizeFormData } from "json-schema-to-form";

app.post("/submit", async (c) => {
  const fd = await c.req.formData();
  const input = normalizeFormData(fd);
});

// If you need validation, wire up Ajv yourself (not exported by this package)
// Example: see `src/validate.ts` in this repo for a utility you can copy.
```

## Schema metadata

You can influence rendering via JSON Schema metadata (when using `zod`, attach via `.meta`):

- `uiWidget: string` – preferred input widget, e.g., `textarea`, `select`, `radio`, `range`.
- `uiName: string` – displayed label text; falls back to the property key.
- `description: string` – used for `title` or hint text where appropriate.

## API

- `convertSchemaToString(schema)` – render fields (no `<form>`) and return a string
- `convertSchemaToFormString(schema, props?)` – render a complete `<form>` string
- `RenderSchemaToHonoForm` – JSX component rendering a `<form>` and fields
- `RenderSchemaToHonoElements` – JSX fragment rendering only fields
- `normalizeFormData(formData)` – turn `FormData` into a nested object

Validation helpers are NOT exported by this package.

## Limitations

- Root schema must be `{ type: "object", properties }`.
- Arrays must specify `items.enum`; arrays of `object` or `array` are not supported.
- Supported string formats: `uri`, `email`, `date-time-local`, `time-local`.
- File inputs cannot be represented in JSON; validation may need custom handling.
