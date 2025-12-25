import { test } from "node:test";
import * as assert from "node:assert";

import { z } from "zod";
import { Window, HTMLFormElement } from "happy-dom";
import { createDocumentFragment, createElement } from "./utils.test.ts";
import {
  convertSchemaToFormString,
  defineMeta,
  type ObjectSchema,
} from "./render.tsx";
import { normalizeFormData } from "./payload.ts";

test("test", async () => {
  const S = z.object({
    url: z.url(),
    method: z
      .enum(["GET", "POST"])
      .meta(
        defineMeta({
          uiWidget: "select", // or "radio"
          multiple: false,
        })
      )
      .default("POST"),
    user: z.object({
      name: z.string().min(1).max(100),
      age: z.number().min(0).max(120).meta({
        uiWidget: "range", // or "number"
      }),
      favoriteColor: z.enum(["red", "green", "blue"]).meta({
        uiWidget: "checkbox", // or "select"
        multiple: true,
      }),
    }),
    bio: z.string().meta({
      uiWidget: "textarea", // or "input"
    }),
  });

  const doc = createDocumentFragment();
  let form = createElement("form") as unknown as HTMLFormElement;
  doc.append(form as any);

  form.outerHTML = convertSchemaToFormString(
    z.toJSONSchema(S) as ObjectSchema,
    {
      method: "post",
      action: "https://node.deno.dev",
    }
  );
  form = doc.querySelector("form") as unknown as HTMLFormElement;

  console.log(form.outerHTML);
  assert.ok(typeof form.outerHTML === "string");

  const { document, FormData } = new Window();
  document.body.appendChild(form);

  const fd = new FormData(form) as unknown as globalThis.FormData;
  const obj = normalizeFormData(fd);

  console.log(JSON.stringify(obj, null, 2));
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
