# AGENTS.md

## Overview

Single-package TypeScript library that generates HTML form markup from JSON Schema. Uses **Hono JSX** (not React) as the JSX runtime.

## Commands

```sh
# Install (no lockfile committed; any package manager works)
npm install

# Build (uses tsdown with zero config)
npm run build

# Run tests (no "test" script defined; `tsx` is installed globally)
tsx --test src/*.test.ts src/*.test.tsx

# Type check only
npx tsc --noEmit
```

There is no lint, format, or CI pipeline configured.

## Architecture

- `src/index.ts` — public entry, re-exports `render.tsx` and `payload.ts`
- `src/render.tsx` — core: JSON Schema → Hono JSX form elements (string or component)
- `src/payload.ts` — `normalizeFormData`: converts FormData with dotted keys into nested objects via `flat.unflatten()`
- `src/validate.ts` — Ajv helpers, intentionally **not** exported from the package
- `src/types.ts` — shared type definitions

## Key Conventions

- **JSX is Hono, not React.** `tsconfig.json` sets `"jsxImportSource": "hono/jsx"`. Import from `hono/jsx` when writing JSX.
- **ESM only.** `"type": "module"` in package.json; use `.ts`/`.tsx` extensions in relative imports.
- **All runtime deps are devDependencies.** `hono`, `zod`, `ajv`, `flat` are peer/optional at publish time.
- **Tests use `node:test`** with `happy-dom` for DOM assertions (see `src/utils.test.ts` for helpers). No Jest/Vitest.
- **`erasableSyntaxOnly: true`** in tsconfig — do not use `enum` or `namespace`; use `const` objects and type-only imports instead.
- **Root schema must be `{ type: "object" }`.** Arrays with items require `items.enum`.

## Style

- 2-space indent, LF line endings, UTF-8 (`.editorconfig`)
- No configured linter or formatter; follow existing code style.
