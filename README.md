# Wedding Website

Minimal Next.js App Router foundation with TypeScript, CSS Modules, PostgreSQL/Prisma dependencies, formatting, unit/component tests, browser tests, Docker services, and pull-request quality checks.

## Requirements

- Node.js 24
- pnpm 11.7.0 through Corepack
- Docker Desktop in Linux container mode for the containerized workflow

## Install

```powershell
corepack enable
pnpm install --frozen-lockfile
```

For browser tests on the host, install the pinned Playwright browsers once:

```powershell
pnpm exec playwright install chromium firefox webkit
```

On Linux, add `--with-deps` to install the required operating-system packages.

## Common commands

| Command              | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `pnpm dev`           | Start the Next.js development server                                |
| `pnpm format`        | Format supported files with Prettier                                |
| `pnpm format:check`  | Check formatting without modifying files                            |
| `pnpm lint`          | Run ESLint and Next.js rules                                        |
| `pnpm typecheck`     | Run strict TypeScript checks                                        |
| `pnpm test`          | Run Vitest unit/component tests once                                |
| `pnpm test:watch`    | Run Vitest in watch mode                                            |
| `pnpm test:coverage` | Generate V8 text, HTML, and LCOV coverage                           |
| `pnpm build`         | Create a production Next.js build                                   |
| `pnpm test:e2e`      | Build/start the app through Playwright and run all browser projects |

## Docker development

Start the long-running development and PostgreSQL containers:

```powershell
docker compose up --build -d
docker compose exec development sh
```

Stop the environment with `docker compose down`.

The database is available to containers at `database:5432`. `.env.example` documents the equivalent host connection string.

## Docker browser tests

The `test` profile uses the official Playwright Noble image and separate dependency volumes, leaving the Alpine development image small:

```powershell
docker compose --profile test run --rm e2e
```

The Playwright package and Docker image are intentionally pinned to the same version. Update them together.

## Quality checks

GitHub Actions runs formatting, linting, type checking, coverage, production build, and Playwright tests for pushes and pull requests targeting `main`. Coverage and Playwright diagnostics are uploaded with short retention when useful for review or failure diagnosis.
