/**
 * Shared HTML shell for every demo page.
 */

export interface SourceBlock {
  label: string;
  code: string;
  lang?: "html" | "css" | "ts";
}

export interface PageOptions {
  title: string;
  blurb: string;
  stylesheets?: string[];
  body: string;
  source: SourceBlock[];
}

// Intentionally plain. No dark toggle — prefers-color-scheme handles it.
const SITE_CSS = `
  :root { color-scheme: light dark; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #fafbfc;
    color: #1c1f24;
    line-height: 1.5;
  }
  .wrap {
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }
  header.site h1 {
    font-size: 1.5rem;
    margin: 0 0 6px;
  }
  header.site p.blurb {
    color: #51586a;
    margin: 0 0 20px;
  }
  header.site nav {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    padding: 4px;
    background: #eef1f5;
    border-radius: 999px;
    width: max-content;
    margin-bottom: 36px;
  }
  header.site nav a {
    color: #3b4252;
    text-decoration: none;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.875rem;
    font-weight: 500;
  }
  header.site nav a:hover { background: #e2e6ed; }
  header.site nav a[aria-current="page"] {
    background: #fff;
    color: #1c1f24;
    box-shadow: 0 1px 2px rgba(15,23,42,0.08);
  }
  section.preview {
    background: #fff;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    padding: 28px 32px;
    margin-bottom: 28px;
  }
  section.preview.plain {
    background: transparent;
    border: 0;
    padding: 0;
  }
  section.sources { display: grid; gap: 10px; }
  section.sources details {
    border: 1px solid #e4e7ec;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
  }
  section.sources details[open] { box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
  section.sources summary {
    padding: 10px 14px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    list-style: none;
    color: #3b4252;
  }
  section.sources summary::-webkit-details-marker { display: none; }
  section.sources summary::before {
    content: "›";
    display: inline-block;
    margin-right: 8px;
    transition: transform 100ms ease;
  }
  section.sources details[open] summary::before { transform: rotate(90deg); }
  section.sources pre {
    margin: 0;
    padding: 14px 16px;
    background: #0f172a;
    color: #e2e8f0;
    overflow: auto;
    font-size: 0.8125rem;
    line-height: 1.55;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    border-top: 1px solid #e4e7ec;
  }

  @media (prefers-color-scheme: dark) {
    body { background: #0b0d10; color: #e6e9ef; }
    header.site p.blurb { color: #9aa2b1; }
    header.site nav { background: #161a21; }
    header.site nav a { color: #c0c6cf; }
    header.site nav a:hover { background: #1e232c; }
    header.site nav a[aria-current="page"] { background: #262c35; color: #fff; box-shadow: none; }
    section.preview { background: #13171d; border-color: #262c35; }
    section.sources details { background: #13171d; border-color: #262c35; }
    section.sources summary { color: #c0c6cf; }
    section.sources pre { background: #05070a; border-top-color: #262c35; }
  }
`;

const NAV = [
  { href: "./index.html", label: "Overview" },
  { href: "./baseline.html", label: "No CSS" },
  { href: "./simple.html", label: "Simple" },
  { href: "./polished.html", label: "Polished" },
  { href: "./utility.html", label: "Grid" },
  { href: "./zod.html", label: "Zod" },
];

export function renderPage(
  currentHref: string,
  { title, blurb, stylesheets = [], body, source }: PageOptions
): string {
  const stylesheetLinks = stylesheets
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("\n    ");

  const nav = NAV.map(
    (item) =>
      `<a href="${item.href}"${
        item.href === currentHref ? ' aria-current="page"' : ""
      }>${escape(item.label)}</a>`
  ).join("");

  const sourceBlocks = source
    .map(
      (s) =>
        `<details><summary>${escape(s.label)}</summary><pre><code>${escape(
          s.code
        )}</code></pre></details>`
    )
    .join("");

  const previewClass = currentHref === "./baseline.html" ? "preview plain" : "preview";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escape(title)} · json-schema-to-form</title>
    <style>${SITE_CSS}</style>
    ${stylesheetLinks}
  </head>
  <body>
    <div class="wrap">
      <header class="site">
        <h1>${escape(title)}</h1>
        <p class="blurb">${escape(blurb)}</p>
        <nav>${nav}</nav>
      </header>
      <section class="${previewClass}">${body}</section>
      ${source.length ? `<section class="sources">${sourceBlocks}</section>` : ""}
    </div>
  </body>
</html>
`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
