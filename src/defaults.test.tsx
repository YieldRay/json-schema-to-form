/**
 * Tests focused on how JSON Schema `default` values are reflected in the
 * rendered form markup. In particular, covers array defaults (multi-select
 * and checkbox groups), which previously compared an array to a scalar and
 * therefore never preselected any option.
 */
import { test } from "node:test";
import * as assert from "node:assert";
import { Window } from "happy-dom";

import {
  convertSchemaToString,
  type ObjectSchema,
} from "./render.tsx";

function parse(html: string): Document {
  const { document } = new Window();
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  return document as unknown as Document;
}

test("string enum with default pre-selects the matching <option>", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      method: {
        type: "string",
        enum: ["GET", "POST"],
        default: "POST",
        uiWidget: "select",
      },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const opts = Array.from(doc.querySelectorAll("option"));
  const selected = opts.filter((o) => o.hasAttribute("selected"));
  assert.strictEqual(selected.length, 1);
  assert.strictEqual(selected[0].getAttribute("value"), "POST");
});

test("string enum radio group with default pre-checks the matching radio", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      method: {
        type: "string",
        enum: ["GET", "POST"],
        default: "POST",
      },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const radios = Array.from(
    doc.querySelectorAll('input[type="radio"]')
  ) as HTMLInputElement[];
  const checked = radios.filter((r) => r.hasAttribute("checked"));
  assert.strictEqual(checked.length, 1);
  assert.strictEqual(checked[0].getAttribute("value"), "POST");
});

test("array multi-select with default pre-selects each included option", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      colors: {
        type: "array",
        items: { type: "string", enum: ["red", "green", "blue"] },
        default: ["red", "blue"],
        uiWidget: "select",
      },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const opts = Array.from(doc.querySelectorAll("option"));
  const selected = opts
    .filter((o) => o.hasAttribute("selected"))
    .map((o) => o.getAttribute("value"))
    .sort();
  assert.deepStrictEqual(selected, ["blue", "red"]);
});

test("array checkbox group with default pre-checks each included box", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      colors: {
        type: "array",
        items: { type: "string", enum: ["red", "green", "blue"] },
        default: ["green"],
      },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const boxes = Array.from(
    doc.querySelectorAll('input[type="checkbox"]')
  ) as HTMLInputElement[];
  const checked = boxes
    .filter((b) => b.hasAttribute("checked"))
    .map((b) => b.getAttribute("value"));
  assert.deepStrictEqual(checked, ["green"]);
});

test("boolean with default=true emits checked attribute", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      agree: { type: "boolean", default: true },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const box = doc.querySelector('input[type="checkbox"]') as HTMLInputElement;
  assert.ok(box.hasAttribute("checked"));
});

test("boolean with default=false does not emit checked attribute", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      agree: { type: "boolean", default: false },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const box = doc.querySelector('input[type="checkbox"]') as HTMLInputElement;
  assert.ok(!box.hasAttribute("checked"));
});

test("number/range with default sets value attribute as string", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      age: {
        type: "integer",
        minimum: 0,
        maximum: 120,
        default: 42,
        uiWidget: "range",
      },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const input = doc.querySelector('input[type="range"]') as HTMLInputElement;
  assert.strictEqual(input.getAttribute("value"), "42");
});

test("uri string with default sets value attribute", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      site: {
        type: "string",
        format: "uri",
        default: "https://example.net",
      },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const input = doc.querySelector('input[type="url"]') as HTMLInputElement;
  assert.strictEqual(input.getAttribute("value"), "https://example.net");
});

test("textarea with default puts text content inside the element", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      bio: {
        type: "string",
        uiWidget: "textarea",
        default: "hello world",
      },
    },
  };
  const doc = parse(convertSchemaToString(schema));
  const ta = doc.querySelector("textarea") as HTMLTextAreaElement;
  assert.strictEqual(ta.textContent, "hello world");
});

test("textarea without default does not emit literal 'undefined'", () => {
  const schema: ObjectSchema = {
    type: "object",
    properties: {
      bio: { type: "string", uiWidget: "textarea" },
    },
  };
  const html = convertSchemaToString(schema);
  assert.ok(
    !html.includes(">undefined<"),
    `textarea should not contain literal 'undefined', got: ${html}`
  );
});
