/**
 * examples/server.tsx
 *
 * A small `fetch`-style dev playground for poking at the form by hand.
 * Not loaded by the test runner.
 *
 * Mount it on any Bun / Deno / Hono runtime, e.g.:
 *
 *   bun --watch examples/server.tsx
 *
 * Routes:
 *   GET  /      — HTML form rendered from the Zod-derived JSON Schema
 *   POST /form  — round-trips the FormData through `normalizeFormData`
 *                 and validates it with Ajv, returning JSON.
 *
 * The inline <style> pairs the library output with landsoul.css — a
 * classless CSS framework. Because the library emits no class names, a
 * tag-only framework can style the whole form, and we only need a few
 * `data-*` rules on top for layout concerns (row stacking, boolean-row
 * direction, required marker).
 */
import { z } from "zod";
import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

import {
  RenderSchemaToHonoForm,
  type ObjectSchema,
} from "../src/render.tsx";
import { normalizeFormData } from "../src/payload.ts";
import { validateFormData } from "../src/validate.ts";

const S = z.object({
  url: z.url().default("https://example.net").describe("Profile URL"),
  method: z.enum(["GET", "POST"]).default("GET").meta({ uiWidget: "select" }),
  method2: z.enum(["GET", "POST"]).default("GET").meta({ uiWidget: "radio" }),
  user: z.object({
    name: z.string().describe("First name, last name"),
    age: z.int().min(0).max(120).default(0).meta({ uiWidget: "range" }),
    avatar: z.file().optional(),
    favoriteColor: z
      .array(z.enum(["red", "green", "blue"]))
      .meta({ uiWidget: "select" }),
  }),
  bio: z.string().meta({ uiWidget: "textarea" }).optional(),
});

const jsonSchema = z.toJSONSchema(S) as ObjectSchema;

/**
 * Build the playground page, inlining the JSX form directly into the
 * `html` tagged template so Hono treats it as pre-escaped HTML instead of
 * re-escaping it via `String(...)`.
 */
const renderPlayground = (): HtmlEscapedString | Promise<HtmlEscapedString> =>
  html/* html */ `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>json-schema-to-form playground</title>
        <style>
          /* Pair the library output with landsoul — a classless CSS framework
             that styles plain tags. This only works because the library emits
             semantic HTML with no class names, so landsoul's tag selectors
             have nothing to compete with.

             On top of landsoul we add a few data-* rules for layout concerns
             the framework can't infer (row stacking, boolean-row direction,
             required marker). */
          @import "//unpkg.com/landsoul";

          body { max-width: 560px; margin: 0 auto; padding: 24px; }
          form { display: flex; flex-direction: column; gap: 14px; }
          [data-name] { display: flex; flex-direction: column; gap: 4px; }
          [data-widget="checkbox"][data-type="boolean"] {
            flex-direction: row;
            align-items: center;
            gap: 8px;
          }
          [data-required]:not([data-variant="group"]) > label::after,
          [data-required] > legend::after { content: " *"; color: #c00; }
        </style>
      </head>
      <body>
        ${(
          <RenderSchemaToHonoForm
            schema={jsonSchema}
            method="post"
            action="/form"
            enctype="multipart/form-data"
          >
            <button type="submit">Submit</button>
          </RenderSchemaToHonoForm>
        )}
      </body>
    </html>`;

export default {
  fetch: async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    if (url.pathname === "/form" && request.method === "POST") {
      const fd = await request.formData();
      return Response.json({
        input: normalizeFormData(fd),
        ...validateFormData(jsonSchema, fd),
      });
    }

    const body = await renderPlayground();
    return new Response(String(body), {
      headers: { "Content-Type": "text/html" },
    });
  },
};
