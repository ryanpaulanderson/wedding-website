# Next.js and TypeScript project rules

## Scope and selected stack

- These are durable rules for this Next.js TypeScript repository. Before editing, inspect `package.json`, the installed versions, configuration, scripts, and nearby code; update this file when an intentional architecture change makes it stale.
- Read `docs/technical-design.md` before making architecture, hosting, deployment, data-storage, authentication, email, analytics, or privacy decisions. It is the living architecture decision record: follow entries marked **Accepted**, treat **Proposed** entries as candidates rather than constraints, and do not silently overturn an accepted decision.
- When an architecture decision is accepted or changed, update both `docs/technical-design.md` and the relevant durable rule in this file in the same cohesive change. Record the decision and rationale in the design document; keep this file focused on implementation constraints.
- For HTML, JSX, styling, responsive design, or accessibility work under `src/`, also follow `src/AGENTS.md`.
- The formatter, test stack, `clsx`, and standard scripts below are configured in this repository. Use the checked-in configuration and do not substitute parallel tools.
- Package manager: pnpm. Keep one `pnpm-lock.yaml` and expose repeatable workflows through `package.json` scripts.
- Formatter: Prettier 3, run separately from ESLint. Use `eslint-config-prettier`, not `eslint-plugin-prettier`. Configure `tabWidth: 2`, `printWidth: 100`, `semi: true`, `singleQuote: false`, `trailingComma: "all"`, and `endOfLine: "lf"`; leave other options at their defaults.
- Tests: Vitest with `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and `@vitest/coverage-v8` for unit/component work; `@playwright/test` with `@axe-core/playwright` for browser and accessibility checks.
- Styling: CSS Modules plus native CSS custom properties, as defined in `src/AGENTS.md`. Do not add Tailwind, Sass, CSS-in-JS, or a broad component library without an explicit architecture change.
- Components: use native HTML and small accessible primitives. Add a headless UI dependency only when a complex interaction cannot be implemented safely with platform primitives.

## Accepted architecture and delivery decisions

- Host the production application on Vercel Hobby. Preserve compatibility with Vercel's supported Next.js runtime and deployment model; do not introduce a custom server, persistent local filesystem dependency, background daemon, or provider-specific replacement without an explicit architecture decision.
- Treat `main` as the production branch. Vercel Git integration creates preview deployments for pull requests and automatically deploys successful changes on `main` to production.
- Use GitHub Actions for repeatable CI checks such as formatting, linting, type checking, tests, and production builds. Vercel owns deployment; do not create a duplicate GitHub Actions production deployment or store a Vercel production deployment token without an explicit reason.
- Keep `main` releasable. Changes should normally reach it through a pull request with applicable checks passing and a usable Vercel preview for user-facing changes.
- The Vercel Hobby project has one code maintainer. Do not design paid multi-user Vercel team workflows unless this constraint changes.
- Keep runtime state outside the Vercel application filesystem. Serverless instances are disposable, so persistent RSVP data, uploads, and durable jobs must use an explicitly accepted external service.
- PostgreSQL with Prisma is the current application data foundation: PostgreSQL 17 locally through Docker Compose and Prisma for schema migrations and typed access. Publish the local development database only on the host loopback interface; never expose its disposable credentials on the local network. The production PostgreSQL provider remains governed by the status recorded in `docs/technical-design.md` until accepted.
- Store deployment secrets and connection strings in environment variables configured per environment. Never commit production values, expose them through `NEXT_PUBLIC_`, or assume preview deployments may access production guest data.
- Keep source photographs out of Git and deployment bundles. Author them under `local-images/` with tracked `*.image.json` sidecars, generate controlled variants through the checked-in image scripts, and publish only immutable processed variants to the accepted public Vercel Blob store.
- Use `www.carolineandryan.org` as the canonical production domain and redirect `carolineandryan.org` to it.
- While the temporary hosted-site password gate is active, protect every Vercel deployment and bypass it for all local execution. Centralize enablement in `isSitePasswordGateEnabled()`; never read `SITE_PASSWORD_GATE` elsewhere or treat the shared password as RSVP authorization.
- Keep the temporary gate removable: `SITE_PASSWORD_GATE=disabled` must make hosted deployments public and indexable without deleting code. Missing or invalid gate values on Vercel fail closed. Real password hashes and session secrets belong only in Vercel environment variables.
- Keep site-password verification bounded by both a pre-verification application rate limit and a Vercel Firewall rate-limit rule for `POST /access`. The in-memory application limit is per serverless instance and does not replace the distributed edge control.
- Keep `/admin` unlinked and independently protected in every environment with dedicated admin credentials. Reauthorize inside every admin data read and mutation, and keep password verification bounded by both application and edge rate limits; the temporary site password, page visibility, and `proxy.ts` are never sufficient admin authorization.

## Git workflow

- These repository-specific Git rules are mandatory and override generic branch and commit conventions from tools, skills, or external workflows. Keep this section synchronized with `.codex/instructions.md`.
- Start every change from an up-to-date `main` branch. Create a separate branch before editing; do not work directly on `main`.
- Use descriptive branch names in the form `<type>/<short-description>`, such as `feat/rsvp-form`, `fix/mobile-nav`, or `docs/update-readme`. Do not use a generic `agent/` prefix.
- Use Conventional Commits in the form `<type>: <imperative description>`. Valid types include `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, and `revert`.
- Open pull requests against `main` as ready for review by default and keep each pull request focused on the branch's change. Do not create a draft pull request unless the user explicitly requests a draft.

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
