/**
 * src/render.test.tsx
 *
 * End-to-end smoke test for `convertSchemaToFormString`:
 *   - builds a JSON Schema via Zod,
 *   - renders it to HTML,
 *   - parses the HTML via happy-dom,
 *   - re-reads it as FormData and round-trips through `normalizeFormData`.
 *
 * Structural contract (no classes, data-* hooks, group/object fieldsets) is
 * covered in `structure.test.tsx`; this file focuses on the integration
 * between the render, parse, and payload layers.
 */
import { test } from "node:test";
import * as assert from "node:assert";

import { z } from "zod";
import { type HTMLFormElement, Window } from "happy-dom";
import { createDocumentFragment, createElement } from "./utils.test.ts";
import {
  convertSchemaToFormString,
  defineMeta,
  type ObjectSchema,
} from "./render.tsx";
import { normalizeFormData } from "./payload.ts";

test("convertSchemaToFormString → happy-dom → normalizeFormData round-trip", async () => {
  const S = z.object({
    url: z.url(),
    method: z
      .enum(["GET", "POST"])
      .meta(
        defineMeta({
          uiWidget: "select",
          multiple: false,
        }),
      )
      .default("POST"),
    user: z.object({
      name: z.string().min(1).max(100),
      age: z.number().min(0).max(120).meta({ uiWidget: "range" }),
      favoriteColor: z.enum(["red", "green", "blue"]).meta({
        uiWidget: "checkbox",
        multiple: true,
      }),
    }),
    bio: z.string().meta({ uiWidget: "textarea" }),
  });

  const jsonSchema = z.toJSONSchema(S) as ObjectSchema;
  const html = convertSchemaToFormString(jsonSchema, {
    method: "post",
    action: "https://node.deno.dev",
  });

  // library output contract: zero class attributes
  assert.ok(
    !/\sclass\s*=/.test(html),
    `generated HTML must not contain class="...": ${html}`,
  );

  // parse the form into a happy-dom document
  const doc = createDocumentFragment();
  const tmp = createElement("div") as unknown as HTMLElement;
  tmp.innerHTML = html;
  doc.append(tmp as any);
  const form = tmp.querySelector("form") as unknown as HTMLFormElement;

  assert.ok(form, "a <form> is emitted");
  assert.strictEqual(form.getAttribute("method"), "post");
  assert.strictEqual(form.getAttribute("action"), "https://node.deno.dev");

  // round-trip empty submission via FormData
  const { document, FormData } = new Window();
  document.body.appendChild(form as any);

  const fd = new FormData(form as any) as unknown as globalThis.FormData;
  const obj = normalizeFormData(fd);

  assert.deepStrictEqual(obj, {
    url: "",
    method: "POST",
    user: {
      name: "",
      age: "",
    },
    bio: "",
  });
});
