/**
 * Tests pinning the generated DOM structure.
 *
 * The library emits **no class names** — callers style the output via tag
 * selectors and `data-*` attributes, which never collide with user CSS.
 *
 * Every field wrapper carries:
 *   data-name="<dotted path>"
 *   data-type="<json schema type>"
 *   data-widget="<resolved widget>"
 *   data-required         (when required)
 *   data-variant="object" | "group"   (only on <fieldset> wrappers)
 */
import { test } from "node:test";
import * as assert from "node:assert";
import { Window } from "happy-dom";

import { convertSchemaToString, type ObjectSchema } from "./render.tsx";

function parse(html: string): Document {
  const { document } = new Window();
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  return document as unknown as Document;
}

test("no class attributes are emitted anywhere", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      url: { type: "string", format: "uri" },
      bio: { type: "string", uiWidget: "textarea", description: "hi" },
      method: { type: "string", enum: ["GET", "POST"] },
      agree: { type: "boolean" },
      colors: {
        type: "array",
        items: { type: "string", enum: ["r", "g", "b"] },
      },
      user: {
        type: "object",
        properties: { name: { type: "string" } },
      },
    },
    required: ["url"],
  };
  const html = convertSchemaToString(schema);
  assert.ok(
    !/\sclass\s*=/.test(html),
    `generated HTML must not contain any class="..." attributes.\n${html}`
  );
});

test("every field has a wrapper with name/type/widget data attrs", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      url: { type: "string", format: "uri" },
      bio: { type: "string", uiWidget: "textarea" },
      age: { type: "integer", uiWidget: "range" },
      agree: { type: "boolean" },
    },
  };
  const doc = parse(convertSchemaToString(schema));

  const expectations: Record<string, { type: string; widget: string }> = {
    url: { type: "string", widget: "url" },
    bio: { type: "string", widget: "textarea" },
    age: { type: "integer", widget: "range" },
    agree: { type: "boolean", widget: "checkbox" },
  };

  for (const [name, { type, widget }] of Object.entries(expectations)) {
    const field = doc.querySelector(`[data-name="${name}"]`);
    assert.ok(field, `missing wrapper for ${name}`);
    assert.strictEqual(field!.getAttribute("data-type"), type);
    assert.strictEqual(field!.getAttribute("data-widget"), widget);
  }
});

test("id attribute is CSS-safe (dots replaced with dashes)", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: { name: { type: "string" } },
      },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const input = doc.querySelector("input") as HTMLInputElement;
  assert.strictEqual(input.getAttribute("name"), "user.name");
  assert.strictEqual(input.getAttribute("id"), "user-name");
  const label = doc.querySelector("label") as HTMLLabelElement;
  assert.strictEqual(label.getAttribute("for"), "user-name");
});

test("top-level field uses bare key as id", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: { x: { type: "string" } },
  };
  const doc = parse(convertSchemaToString(schema));
  assert.strictEqual(doc.querySelector("input")!.getAttribute("id"), "x");
});

test("nested object renders as <fieldset data-variant='object'> with <legend>, no extra wrapper div", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
        },
      },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const fs = doc.querySelector('fieldset[data-name="user"]') as HTMLElement;
  assert.ok(fs);
  assert.strictEqual(fs.getAttribute("data-variant"), "object");
  assert.strictEqual(fs.getAttribute("data-type"), "object");

  const legend = fs.querySelector(":scope > legend");
  assert.ok(legend, "fieldset must contain a <legend>");
  assert.strictEqual(legend!.textContent, "user");

  // Child fields are direct children of <fieldset>, not nested in an extra <div>.
  const directChildFields = Array.from(
    fs.querySelectorAll(":scope > [data-name]")
  ).map((el) => el.getAttribute("data-name"));
  assert.deepStrictEqual(directChildFields.sort(), ["user.age", "user.name"]);
});

test("radio group renders as <fieldset data-variant='group'> with <legend>", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      method: { type: "string", enum: ["GET", "POST"] },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const fs = doc.querySelector(
    'fieldset[data-name="method"]'
  ) as HTMLElement;
  assert.ok(fs, "radio group must render as a <fieldset>");
  assert.strictEqual(fs.getAttribute("data-variant"), "group");
  assert.strictEqual(fs.getAttribute("data-widget"), "radio");
  assert.strictEqual(fs.querySelector("legend")!.textContent, "method");
});

test("checkbox group renders as <fieldset data-variant='group'> with <legend>", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      colors: {
        type: "array",
        items: { type: "string", enum: ["red", "green", "blue"] },
      },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const fs = doc.querySelector(
    'fieldset[data-name="colors"]'
  ) as HTMLElement;
  assert.ok(fs);
  assert.strictEqual(fs.getAttribute("data-variant"), "group");
  assert.strictEqual(fs.getAttribute("data-widget"), "checkbox");
  assert.strictEqual(fs.getAttribute("data-type"), "array");
});

test("required radio group marks only ONE radio with required (per HTML spec)", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      method: { type: "string", enum: ["GET", "POST"] },
    },
    required: ["method"],
  };
  const doc = parse(convertSchemaToString(schema));
  const requiredRadios = doc.querySelectorAll('input[type="radio"][required]');
  assert.strictEqual(
    requiredRadios.length,
    1,
    "only one radio per group should carry `required`"
  );
});

test("required checkbox group does NOT mark individual checkboxes required, and sets aria-required on the group", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      colors: {
        type: "array",
        items: { type: "string", enum: ["red", "green", "blue"] },
      },
    },
    required: ["colors"],
  };
  const doc = parse(convertSchemaToString(schema));
  const requiredBoxes = doc.querySelectorAll(
    'input[type="checkbox"][required]'
  );
  assert.strictEqual(
    requiredBoxes.length,
    0,
    "checkboxes in a group must not be marked required individually"
  );
  const fs = doc.querySelector(
    'fieldset[data-name="colors"]'
  ) as HTMLElement;
  assert.strictEqual(fs.getAttribute("aria-required"), "true");
});

test("description renders as a <small> with an id + aria-describedby on the control", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      bio: {
        type: "string",
        uiWidget: "textarea",
        description: "Tell us about yourself",
      },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const row = doc.querySelector('[data-name="bio"]') as HTMLElement;
  const hint = row.querySelector("small") as HTMLElement;
  assert.ok(hint, "description must render a <small>");
  assert.strictEqual(hint.textContent, "Tell us about yourself");
  const hintId = hint.getAttribute("id");
  assert.ok(hintId, "hint must have an id");
  const ta = doc.querySelector("textarea") as HTMLTextAreaElement;
  assert.strictEqual(ta.getAttribute("aria-describedby"), hintId);
});

test("required single field sets aria-required and data-required on the wrapper", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
  };
  const doc = parse(convertSchemaToString(schema));
  const field = doc.querySelector('[data-name="name"]') as HTMLElement;
  assert.strictEqual(field.getAttribute("data-required"), "true");
  const input = doc.querySelector("input") as HTMLInputElement;
  assert.strictEqual(input.getAttribute("aria-required"), "true");
  assert.ok(input.hasAttribute("required"));
});

test("non-required fields do not have data-required attribute", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: { x: { type: "string" } },
  };
  const doc = parse(convertSchemaToString(schema));
  const field = doc.querySelector('[data-name="x"]') as HTMLElement;
  assert.ok(!field.hasAttribute("data-required"));
});

test("checkbox row places <input> before <label> text (control-first)", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: { agree: { type: "boolean" } },
  };
  const doc = parse(convertSchemaToString(schema));
  const field = doc.querySelector('[data-name="agree"]') as HTMLElement;
  // input and label are direct children of the row, input first
  const children = Array.from(field.children);
  const inputIdx = children.findIndex((c) => c.tagName.toLowerCase() === "input");
  const labelIdx = children.findIndex((c) => c.tagName.toLowerCase() === "label");
  assert.ok(inputIdx >= 0 && labelIdx >= 0);
  assert.ok(inputIdx < labelIdx, "checkbox input must come before its label");
});

test("label text uses uiName when provided; falls back to the key otherwise", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      fn: { type: "string", uiName: "First name" },
      ln: { type: "string" },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const first = doc.querySelector(
    '[data-name="fn"] label'
  ) as HTMLElement;
  const last = doc.querySelector(
    '[data-name="ln"] label'
  ) as HTMLElement;
  assert.strictEqual(first.textContent, "First name");
  assert.strictEqual(last.textContent, "ln");
});

test("every scalar field exposes a single addressable control", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      a: { type: "string" },
      b: { type: "integer" },
      c: { type: "string", uiWidget: "textarea" },
      d: { type: "string", enum: ["x", "y"], uiWidget: "select" },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  for (const name of ["a", "b", "c", "d"]) {
    const row = doc.querySelector(`[data-name="${name}"]`);
    assert.ok(row);
    const ctrl =
      row!.querySelector("input") ||
      row!.querySelector("textarea") ||
      row!.querySelector("select");
    assert.ok(ctrl, `no control found for ${name}`);
  }
});
