/**
 * docs/build.ts
 *
 * Generates a static docs site under docs/dist/. No runtime server needed —
 * the library produces HTML, so the demos are plain static pages.
 *
 * Run with:   tsx docs/build.ts
 */
import { mkdirSync, writeFileSync, copyFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { convertSchemaToFormString } from "../src/render.tsx";
import { schema } from "./schema.ts";
import { zodSchema } from "./zod-schema.ts";
import { renderPage } from "./page.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, "dist");
const STYLES_OUT = join(DIST, "styles");
const STYLES_IN = join(HERE, "styles");

// ---------- setup output tree ----------
mkdirSync(STYLES_OUT, { recursive: true });
for (const css of ["polished.css", "simple.css", "utility.css"]) {
  copyFileSync(join(STYLES_IN, css), join(STYLES_OUT, css));
}

// ---------- helpers ----------
const readText = (p: string) => readFileSync(p, "utf8");
const schemaSrc = readText(join(HERE, "schema.ts"));
const zodSrc = readText(join(HERE, "zod-schema.ts"));
const polishedCss = readText(join(STYLES_IN, "polished.css"));
const simpleCss = readText(join(STYLES_IN, "simple.css"));
const utilityCss = readText(join(STYLES_IN, "utility.css"));

const formHTML = convertSchemaToFormString(schema, {
  method: "post",
  action: "#",
}).replace(
  "</form>",
  `  <button type="submit">Create account</button>\n</form>`
);

const zodFormHTML = convertSchemaToFormString(zodSchema, {
  method: "post",
  action: "#",
}).replace(
  "</form>",
  `  <button type="submit">Create account</button>\n</form>`
);

function prettyHTML(html: string): string {
  // simple pretty-printer, good enough for <details> source blocks
  let indent = 0;
  return html
    .replace(/></g, ">\n<")
    .split("\n")
    .map((line) => {
      const isClose = /^<\//.test(line);
      const isSelfClose = /\/>$/.test(line) || /^<(input|br|hr|meta|link)\b/i.test(line);
      if (isClose) indent = Math.max(0, indent - 1);
      const out = "  ".repeat(indent) + line;
      if (!isClose && !isSelfClose && /^<[a-zA-Z]/.test(line) && !/<\/[a-zA-Z]+>$/.test(line))
        indent += 1;
      return out;
    })
    .join("\n");
}

// ---------- write pages ----------

// 1 · Baseline (no CSS)
writeFileSync(
  join(DIST, "baseline.html"),
  renderPage("./baseline.html", {
    title: "No CSS (baseline)",
    blurb:
      "Raw output from the library with no stylesheet loaded. Proves the HTML is semantic on its own — form controls, required markers, groups, and nested objects all work with browser defaults.",
    stylesheets: [],
    body: formHTML,
    source: [
      { label: "Rendered HTML", code: prettyHTML(formHTML) },
      { label: "docs/schema.ts", code: schemaSrc },
    ],
  })
);

// 2 · Polished drop-in stylesheet (example, not a built-in default)
writeFileSync(
  join(DIST, "polished.html"),
  renderPage("./polished.html", {
    title: "Polished stylesheet",
    blurb:
      "An example drop-in stylesheet — pure tag + data-* selectors, no class names in the markup. The library itself ships no CSS; this is just one opinionated look you can copy and tweak.",
    stylesheets: ["./styles/polished.css"],
    body: formHTML,
    source: [
      { label: "docs/styles/polished.css", code: polishedCss },
      { label: "Rendered HTML (same as baseline)", code: prettyHTML(formHTML) },
    ],
  })
);

// 3 · Simple — tiny classless stylesheet (~10 lines)
writeFileSync(
  join(DIST, "simple.html"),
  renderPage("./simple.html", {
    title: "Simple (≈10 lines of CSS)",
    blurb:
      "A near-minimal classless stylesheet. Just tag + a couple of data-* selectors, no variables or design tokens — enough to make the raw HTML look reasonable.",
    stylesheets: ["./styles/simple.css"],
    body: formHTML,
    source: [
      { label: "docs/styles/simple.css", code: simpleCss },
    ],
  })
);

// 4 · Utility / atomic style via attribute selectors
writeFileSync(
  join(DIST, "utility.html"),
  renderPage("./utility.html", {
    title: "Utility / two-column grid",
    blurb:
      "A very different look — two-column label/control grid with pill-shaped enum options and subgrid-flavored nesting. Same HTML, 100% data-* selectors, no changes to the library output.",
    stylesheets: ["./styles/utility.css"],
    body: formHTML,
    source: [
      { label: "docs/styles/utility.css", code: utilityCss },
    ],
  })
);

// 5 · Zod-driven (same-looking form, built from a Zod schema)
writeFileSync(
  join(DIST, "zod.html"),
  renderPage("./zod.html", {
    title: "Zod-driven schema",
    blurb:
      "Identical UI produced from a Zod schema via z.toJSONSchema(S). Zod is optional — use it when you want a single source of truth for rendering and validation.",
    stylesheets: ["./styles/polished.css"],
    body: zodFormHTML,
    source: [
      { label: "docs/zod-schema.ts", code: zodSrc },
      { label: "docs/schema.ts (plain JSON Schema equivalent)", code: schemaSrc },
    ],
  })
);

// Index / overview
const indexBody = `
<div style="display: grid; gap: 16px;">
  <p style="margin: 0; font-size: 1.0625rem; line-height: 1.5;">
    <strong>json-schema-to-form</strong> turns a JSON Schema into HTML form markup with semantic tags and <code>data-*</code> hooks for styling. It emits no class names, so it drops into any Hono project without fighting your CSS.
  </p>
  <ul style="margin: 0; padding-left: 20px; line-height: 1.7;">
    <li><a href="./baseline.html"><strong>1 · No CSS</strong></a> — raw output, browser defaults only.</li>
    <li><a href="./simple.html"><strong>2 · Simple</strong></a> — roughly ten lines of classless CSS, no variables.</li>
    <li><a href="./polished.html"><strong>3 · Polished stylesheet</strong></a> — a fuller, opinionated drop-in example.</li>
    <li><a href="./utility.html"><strong>4 · Utility / grid layout</strong></a> — completely different look, same markup.</li>
    <li><a href="./zod.html"><strong>5 · Zod-driven</strong></a> — building the same form from a Zod schema.</li>
  </ul>
  <p style="margin: 0; color: #4a5160;">
    All five pages render <em>the exact same HTML</em>. Only the stylesheet changes.
  </p>
</div>
`;

writeFileSync(
  join(DIST, "index.html"),
  renderPage("./index.html", {
    title: "json-schema-to-form — demo gallery",
    blurb:
      "Five static pages, one shared schema. Each demo swaps only the stylesheet to show how flexible the output is.",
    body: indexBody,
    source: [],
  })
);

console.log(`✓ built docs at ${DIST}`);
