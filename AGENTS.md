# Next.js and TypeScript project rules

## Scope and selected stack

- These are durable rules for this Next.js TypeScript repository. Before editing, inspect `package.json`, the installed versions, configuration, scripts, and nearby code; update this file when an intentional architecture change makes it stale.
- For HTML, JSX, styling, responsive design, or accessibility work under `src/`, also follow `src/AGENTS.md`.
- The formatter, test stack, `clsx`, and standard scripts below are configured in this repository. Use the checked-in configuration and do not substitute parallel tools.
- Package manager: pnpm. Keep one `pnpm-lock.yaml` and expose repeatable workflows through `package.json` scripts.
- Formatter: Prettier 3, run separately from ESLint. Use `eslint-config-prettier`, not `eslint-plugin-prettier`. Configure `tabWidth: 2`, `printWidth: 100`, `semi: true`, `singleQuote: false`, `trailingComma: "all"`, and `endOfLine: "lf"`; leave other options at their defaults.
- Tests: Vitest with `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and `@vitest/coverage-v8` for unit/component work; `@playwright/test` with `@axe-core/playwright` for browser and accessibility checks.
- Styling: CSS Modules plus native CSS custom properties, as defined in `src/AGENTS.md`. Do not add Tailwind, Sass, CSS-in-JS, or a broad component library without an explicit architecture change.
- Components: use native HTML and small accessible primitives. Add a headless UI dependency only when a complex interaction cannot be implemented safely with platform primitives.

## Working agreements

- Make the smallest cohesive change that solves the task. Avoid speculative abstractions, unrelated rewrites, and a second convention for an already-solved problem.
- Prefer platform and framework capabilities over dependencies. When a dependency is justified, explain its role, keep its scope narrow, and update the lockfile.
- Treat configured formatter, lint, compiler, and test settings as executable policy. Do not broadly disable rules or reformat unrelated files to make a change pass.
- Never hand-edit `.next/`, `next-env.d.ts`, generated database clients, coverage, or other generated output.

## Project structure and components

- Use the App Router and its documented special files for new routes. Use `src/app/` for routes, `src/components/ui/` for reusable primitives, `src/components/layout/` for shared page chrome, `src/features/<feature>/` for domain code, and `src/lib/` for genuinely cross-cutting utilities or server infrastructure.
- Put a route-only component in that route's private `_components/` folder. Promote it only when it becomes reused or represents a stable domain concept.
- Colocate `Component.tsx`, `Component.module.css`, and `Component.test.tsx`. Keep Playwright specs in `e2e/` and reusable fixtures in `e2e/fixtures/`.
- Avoid catch-all `utils`/`helpers` directories and broad barrel exports. Import directly; add `index.ts` only for a deliberate stable public boundary.
- Default to Server Components. Add `"use client"` only at the smallest boundary needing state, events, effects, client hooks, or browser APIs; its imports join the client graph.
- Pass minimal serializable props across the server/client boundary. Never pass secrets, database clients, privileged records, or server-only modules.
- Fetch server-rendered data directly from the data source or server module. Do not call this app's own Route Handler from a Server Component when the underlying function can be called directly.
- Keep route files focused on composition. Extract domain, validation, and data-access code when reuse, auditing, or tests benefit; do not create empty layers for hypothetical needs.
- In modern App Router code, treat `params`, `searchParams`, `cookies()`, `headers()`, and related request APIs as asynchronous; verify against the installed Next.js version rather than copying older examples.
- Add `loading`, `error`, `not-found`, and `<Suspense>` boundaries at meaningful UX or failure boundaries, not mechanically around every component.
- Reusable components use PascalCase files and named function exports. Define `type ComponentNameProps` immediately above the component unless shared; do not use `React.FC`. Use default exports where Next.js expects them, such as `page.tsx` and `layout.tsx`.
- Keep one principal reusable component per file. Do not add `.client`/`.server` filename suffixes as a second source of truth; use framework directives and server-only guards.

## Data, security, and caching

- Treat route/query values, headers, cookies, `FormData`, JSON, webhooks, environment values, and third-party responses as untrusted. Parse and validate them at the boundary.
- Treat every Server Action and Route Handler as a public endpoint. Authenticate, authorize the specific resource/action, validate input, and return only safe data inside the endpoint; UI, layout, or proxy checks are not sufficient authorization.
- Keep privileged access in auditable server-only modules and mark them with `import "server-only"` when the data layer is introduced. Return narrow DTOs rather than entire database records.
- Use parameterized database operations. Never place raw user values into SQL, paths, redirects, headers, HTML, or shell commands; validate or allowlist first and use structured APIs plus context-appropriate encoding.
- Never expose secrets through client bundles, `NEXT_PUBLIC_` variables, logs, client errors, source maps, or committed environment files. Use `NEXT_PUBLIC_` only for intentionally public values.
- Avoid `dangerouslySetInnerHTML`. If product requirements genuinely need HTML, sanitize it with a maintained policy at the boundary and document why it is safe.
- Represent expected validation/business failures as typed results. Throw for unexpected failures and keep stack traces or internal details out of user responses.
- Inspect the installed Next.js version and `next.config.*` before changing caching. Make each data source's freshness and scope explicit; never share-cache permission-dependent or user-specific output.
- Start independent operations together and await them in parallel. After successful mutations, invalidate the narrowest relevant tag/path or redirect; avoid broad invalidation without a reason.

## React and TypeScript

- Preserve strict TypeScript and write new application source as `.ts`/`.tsx`. Infer obvious locals, but type props, exports, external boundaries, callbacks, and action results.
- Prefer `unknown` plus narrowing over `any`. Avoid unchecked assertions and non-null assertions; isolate and explain any unavoidable escape hatch.
- Do not use `@ts-ignore`. A verified upstream typing defect may use the narrowest `@ts-expect-error` with a reason.
- Runtime-validate external data. Use discriminated unions and exhaustive handling for finite states, `satisfies` when it preserves useful inference, and `import type` for type-only imports.
- Use the configured source alias for cross-feature imports and short relative paths within a feature.
- Keep components/hooks pure: do not mutate props/state or perform side effects during render. Call hooks at the top level, derive values during render, and use effects only to synchronize with external systems.
- Use stable identity keys for mutable lists. Add memoization, dynamic loading, or virtualization only when a clear cost model or profiling justifies it.
- Use `next/link`, `next/image`, `next/font`, and Metadata APIs. Keep client JavaScript small, reserve media space, load only needed assets, and preserve URL-addressable state for navigation-relevant filters/pagination.

## Naming and formatting

- Prettier is the formatting authority; do not hand-align syntax or use ESLint for purely stylistic rules.
- Use exact lowercase Next.js special filenames, PascalCase components, `useX` hooks, camelCase TypeScript modules/functions/variables, and kebab-case route segments.
- Prefer responsibility-based names, cohesive modules, and small public APIs. Comment constraints and non-obvious decisions, not self-explanatory code.

## Tests and verification

- Name Vitest files `*.test.ts(x)` and Playwright files `e2e/**/*.spec.ts`.
- Unit-test pure domain/validation logic. Test interactive Client Components with Testing Library and `userEvent`, preferring role, accessible name, label, and visible-text queries over test IDs.
- Test observable behavior, not internals. Mock network, clock, and third-party boundaries rather than a component's own functions.
- Cover async Server Components through extracted pure logic and Playwright flows; Next.js recommends E2E coverage because unit tools do not fully support them.
- Keep Playwright tests isolated and deterministic, using controlled data, user-facing locators, and web-first assertions. Run critical flows in Chromium, Firefox, and WebKit, plus a narrow mobile-sized project; scan key pages with axe and retain manual accessibility checks.
- Prefer risk-based tests over a global coverage target. Prioritize critical journeys, authorization, mutations, navigation, keyboard use, and loading/error states.
- Standard scripts are `format`, `format:check`, `lint`, `typecheck`, `test`, `test:watch`, `test:coverage`, `test:e2e`, and `build`; add each when its tool is introduced and keep its meaning stable.
- Before handoff, run the relevant scripts that exist: format/lint/typecheck for code, targeted tests for behavior, and a production build for routing, configuration, or production-boundary changes. Never claim an unrun check passed; report unavailable or blocked checks.
- UI changes also require the verification in `src/AGENTS.md`.

## Primary references

- [Codex AGENTS.md guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js data security](https://nextjs.org/docs/app/guides/data-security)
- [Next.js testing](https://nextjs.org/docs/app/guides/testing)
- [React rules](https://react.dev/reference/rules)
- [TypeScript strictness](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#strictness)
- [Prettier and linters](https://prettier.io/docs/integrating-with-linters.html)
- [Testing Library queries](https://testing-library.com/docs/queries/about/)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
