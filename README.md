# json-schema-to-form

Generate HTML form markup from a JSON Schema, for use with [Hono](https://hono.dev/) (JSX) or as plain HTML strings.

- Render a schema as JSX components or as an HTML string
- Normalize submitted `FormData` into a nested object (dotted keys → nested, repeated keys → arrays)
- Bring your own validation (Ajv, Zod, etc.)

## Install

```bash
npm i json-schema-to-form hono
# Optional peers:
npm i zod   # to derive JSON Schema from Zod via z.toJSONSchema
npm i ajv   # if you plan to validate server-side
```

`hono` is required at runtime — this library outputs `hono/jsx` elements.

## Quick start

### From a plain JSON Schema

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

const html: string = convertSchemaToFormString(schema, {
  method: "post",
  action: "/submit",
});
```

### From a Zod schema (optional)

```ts
import { z } from "zod";
import {
  convertSchemaToFormString,
  type ObjectSchema,
} from "json-schema-to-form";

const S = z.object({
  url: z.url(),
  method: z.enum(["GET", "POST"]).default("POST").meta({ uiWidget: "select" }),
  user: z.object({
    name: z.string().min(1).max(100),
    age: z.number().min(0).max(120).meta({ uiWidget: "range" }),
  }),
});

const html = convertSchemaToFormString(
  z.toJSONSchema(S) as ObjectSchema,
  { method: "post", action: "/submit" }
);
```

### As a JSX component with Hono

```tsx
import { Hono } from "hono";
import {
  RenderSchemaToHonoForm,
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
    <html>
      <body>
        <RenderSchemaToHonoForm schema={schema} method="post" action="/submit">
          <button type="submit">Submit</button>
        </RenderSchemaToHonoForm>
      </body>
    </html>
  )
);
```

`RenderSchemaToHonoForm` accepts every standard `<form>` attribute
(`method`, `action`, `enctype`, `class`, …) plus `schema`. Any children are
rendered inside the form, after the generated fields.

### Handling submissions

```ts
import { normalizeFormData } from "json-schema-to-form";

app.post("/submit", async (c) => {
  const fd = await c.req.formData();
  const input = normalizeFormData(fd); // nested object
  // validate `input` with Ajv, Zod, or your validator of choice
});
```

`normalizeFormData` rules:
- Dotted keys such as `user.name` become nested objects (via `flat.unflatten`).
- Repeated keys (e.g. two checkboxes with the same `name`) collapse to arrays.
- `File` values are passed through as-is; serializing them to JSON is up to you.

## Schema metadata

Three annotations influence rendering. Attach them directly on the JSON Schema
(or via `.meta({ ... })` when working with Zod):

| Key           | Purpose                                                      |
| ------------- | ------------------------------------------------------------ |
| `uiWidget`    | Preferred control; see matrix below                          |
| `uiName`      | Label text; defaults to the property key                     |
| `description` | Standard JSON Schema field; rendered as a `<small>` hint linked via `aria-describedby` |

### Widget matrix

| Schema                                  | Default control            | With `uiWidget: "select"` | With `uiWidget: "textarea"` | With `uiWidget: "range"` |
| --------------------------------------- | -------------------------- | ------------------------- | --------------------------- | ------------------------ |
| `string`                                | `<input type="text">`      | —                         | `<textarea>`                | —                        |
| `string` + `format` ¹                   | typed `<input>`            | —                         | —                           | —                        |
| `string` + `enum`                       | radio group                | `<select>`                | —                           | —                        |
| `number` / `integer`                    | `<input type="number">`    | —                         | —                           | `<input type="range">`   |
| `boolean`                               | `<input type="checkbox">`  | —                         | —                           | —                        |
| `array` + `items.enum`                  | checkbox group             | `<select multiple>`       | —                           | —                        |
| `object`                                | nested `<fieldset>`        | —                         | —                           | —                        |

¹ Supported formats: `uri` → `url`, `email` → `email`, `date-time-local` →
`datetime-local`, `time-local` → `time`.

JSON Schema `default` values are reflected as `value`/`selected`/`checked`
attributes (including array defaults for multi-selects and checkbox groups).

## Generated DOM / styling

The library emits **no `class` attributes** — the output is styled through
tag selectors and `data-*` hooks, so it never collides with your project's
CSS (Tailwind, Bulma, scoped styles, whatever).

```html
<div data-name="user.age" data-type="integer" data-widget="range"
     data-required="true">
  <label for="user-age">age</label>
  <input id="user-age" name="user.age" type="range"
         min="0" max="120" step="1"
         required aria-required="true" aria-describedby="user-age-hint">
  <small id="user-age-hint">age must be 0-120</small>
</div>
```

Shapes by widget:

- **Scalar** (text / number / textarea / select / url / email / date / time): a `<div>` row containing `<label>` + a single control (`<input>` / `<select>` / `<textarea>`), optionally followed by `<small>` for the description.
- **Single checkbox** (boolean): a `<div>` row with `<input type="checkbox">` **before** `<label>` (control-first, so the label reads naturally next to the checkbox).
- **Enum group** (radio / checkbox-array): a `<fieldset data-variant="group">` containing `<legend>` + one `<label><input><span>text</span></label>` per option.
- **Nested object**: a `<fieldset data-variant="object">` with `<legend>` and child rows rendered as direct children.

Addressable hooks on every row:

| Attribute              | When                                      | Example selector                       |
| ---------------------- | ----------------------------------------- | -------------------------------------- |
| `data-name`            | Always (dotted path, e.g. `user.age`)     | `[data-name="user.age"]`               |
| `data-type`            | Always (JSON Schema type)                 | `[data-type="integer"]`                |
| `data-widget`          | Always (resolved widget)                  | `[data-widget="range"]`                |
| `data-required`        | Row flagged by JSON Schema `required`     | `[data-required]`                      |
| `data-variant="group"` | Radio / checkbox groups (on `<fieldset>`) | `fieldset[data-variant="group"]`       |
| `data-variant="object"`| Nested object rows (on `<fieldset>`)      | `fieldset[data-variant="object"]`      |

`name` stays dotted (preserved for `normalizeFormData`); `id` / `for` /
`aria-describedby` replace dots with dashes to stay CSS-selector-safe
(`#user-name`, not `#user.name`, which would parse as "id `user` and class
`name`").

### Minimal styling example

```css
/* Every row, selected without any class */
form [data-name]                              { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
form [data-name] > label,
form [data-name] > legend                     { font-weight: 600; }
form [data-name] > small                      { color: #666; font-size: 0.875em; }
form [data-required] > label::after,
form [data-required] > legend::after          { content: " *"; color: crimson; }

/* Widget-specific tweaks */
form [data-widget="range"] input              { accent-color: #2563eb; }
form [data-widget="textarea"] textarea        { min-height: 6em; }

/* Control-first layout for single checkboxes */
form [data-widget="checkbox"][data-type="boolean"] { flex-direction: row; align-items: center; gap: 6px; }

/* Options in radio / checkbox groups */
form fieldset[data-variant="group"] > label   { display: inline-flex; gap: 4px; align-items: center; margin-right: 12px; }
```

### Accessibility notes

- `required` fields also set `aria-required="true"` on the control (or on the
  `<fieldset>` for groups).
- Radio groups mark only the first radio with `required`; per the HTML spec
  this makes the whole group required without triggering per-input validation
  messages.
- Checkbox groups rely on `aria-required` on the `<fieldset>` and app-side
  validation; marking individual checkboxes `required` would mean "this exact
  one must be checked", which is rarely what callers want.
- Descriptions are real text via `<small>`, wired up with `aria-describedby`,
  rather than `title` tooltips.

Typed helper for metadata (purely optional):

```ts
import { defineMeta } from "json-schema-to-form";

const meta = defineMeta({ uiWidget: "select", multiple: false });
```

## API

| Export                        | Description                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `convertSchemaToString`       | Render fields only (no `<form>` wrapper) and return a string                    |
| `convertSchemaToFormString`   | Render a complete `<form>` string                                               |
| `RenderSchemaToHonoForm`      | JSX component: `<form>` wrapping generated fields and any children              |
| `RenderSchemaToHonoElements`  | JSX fragment of just the fields; accepts `schema`, `parent`, `getID`            |
| `normalizeFormData`           | Convert `FormData` to a nested plain object                                     |
| `defineMeta`                  | Identity helper for typing a `Meta` object                                      |
| `ObjectSchema`, `Meta` (types) | Minimal root schema type and widget-metadata union                             |

`RenderSchemaToHonoElements` also accepts `getID?: (path) => string` for
customizing the `id` attribute of generated controls (defaults to the dotted
path, e.g. `user.name`).

Validation helpers are intentionally **not** exported. If you need a
working Ajv wrapper, see `src/validate.ts` in this repository — it is not
shipped in the published package, so copy it into your project.

## Limitations

- Root schema must be `{ type: "object", properties: {...} }`.
- Arrays must use `items.enum`; arrays of `object` or `array` are not supported.
- Only the following `string` formats map to typed inputs: `uri`, `email`, `date-time-local`, `time-local`. Other values of `format` fall through to a plain text input.
- File inputs are not generated from schema; add them manually and they will round-trip through `normalizeFormData` as `File` values.

## License

MIT © YieldRay
