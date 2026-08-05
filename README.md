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

| Command                  | Purpose                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `pnpm dev`               | Start the Next.js development server                                |
| `pnpm format`            | Format supported files with Prettier                                |
| `pnpm format:check`      | Check formatting without modifying files                            |
| `pnpm lint`              | Run ESLint and Next.js rules                                        |
| `pnpm typecheck`         | Run strict TypeScript checks                                        |
| `pnpm test`              | Run Vitest unit/component tests once                                |
| `pnpm test:watch`        | Run Vitest in watch mode                                            |
| `pnpm test:coverage`     | Generate V8 text, HTML, and LCOV coverage                           |
| `pnpm build`             | Create a production Next.js build                                   |
| `pnpm test:e2e`          | Build/start the app through Playwright and run all browser projects |
| `pnpm admin:credentials` | Generate a private admin password hash and session secret           |
| `pnpm images:prepare`    | Validate image sidecars and generate ignored local WebP previews    |
| `pnpm images:sync`       | Process and upload changed immutable variants to Vercel Blob        |
| `pnpm images:prune`      | Dry-run reporting for Blob variants absent from the current catalog |
| `pnpm vercel:setup`      | Authenticate, link Vercel, and provision/pull public Blob storage   |

## Image workflow

Source photographs live beside tracked `*.image.json` configuration files under `local-images/`.
The source binaries, generated previews, and processing cache are ignored by both Git and Vercel.
Each sidecar defines an accessible description and one or more named crops; see the sample sidecars
in that directory and `schemas/image-config.schema.json` for the supported fields.

Prepare images for local development without uploading:

```powershell
pnpm images:prepare
```

The first Vercel setup is performed once inside the Dev Container:

```bash
./scripts/setup-vercel.sh
```

The script authenticates only when needed, links the checkout when it is not already linked,
reuses an existing connected Blob store, or creates `wedding-images` when no Blob token exists. It
pulls `BLOB_READ_WRITE_TOKEN` into ignored `.env.local` without printing it. Pass `--sync-images`
to upload configured images immediately, or use the equivalent `pnpm vercel:setup --sync-images`.

After setup, `pnpm images:sync` processes all configured sources, skips already-published content
hashes, uploads new variants, and updates the tracked catalog. Normal sync never deletes blobs.
`pnpm images:prune` lists obsolete variants; use `pnpm images:prune -- --apply` only after reviewing
that list. Never commit `.env.local` or expose `BLOB_READ_WRITE_TOKEN` through `NEXT_PUBLIC_`.

## Admin access

The private admin shell is available only by opening `/admin` directly; it is not linked from the
guest site or included in a sitemap. Admin authentication is required locally and on every Vercel
deployment. While the temporary whole-site password gate is enabled, hosted visitors pass through
that gate before reaching the separate admin sign-in.

Generate credentials in an interactive terminal:

```bash
pnpm admin:credentials
```

The command masks and confirms a passphrase of at least 16 characters, then prints a salted scrypt
hash and a random session secret. Copy the two generated assignments into ignored `.env.local` for
local use. Configure `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` separately for Vercel Preview
and Production; do not reuse values between environments, commit them, log them, or prefix them with
`NEXT_PUBLIC_`.

Admin sessions expire after eight hours. Changing only the password protects new sign-ins but does
not invalidate existing sessions; rotate `ADMIN_SESSION_SECRET` at the same time to revoke every
active session.

The sign-in action also enforces a bounded ten-attempt, ten-minute fixed window per client within
each running application instance. This application control prevents an unbounded verification path,
but serverless instances do not share memory, so the Vercel Firewall rule remains the distributed
production limit.

Before production use, configure one Vercel Firewall rate-limit rule for the login action:

1. Match request path `/admin` and method `POST`.
2. Use a fixed window of 10 minutes, a limit of 10 requests, and IP as the counting key.
3. Return `429` after the limit, validate the behavior against the preview, and then publish the
   rule for production.

See [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
for the current dashboard workflow and Hobby allowance.

## Docker development

Start the long-running development and PostgreSQL containers:

```powershell
docker compose up --build -d
docker compose exec development sh
```

Stop the environment with `docker compose down`.

The database is available to containers at `database:5432`. `.env.example` documents the equivalent host connection string.

### Cursor development container

The checked-in Dev Container uses the same Compose development service and database, so Node,
pnpm, Git, formatting, linting, and project commands run inside Linux rather than Windows
PowerShell.

1. Install the **Dev Containers** extension in Cursor (`ms-vscode-remote.remote-containers`).
2. Open this repository or worktree in Cursor.
3. Open the command palette and choose **Dev Containers: Reopen in Container**.
4. Wait for the first image build, script permission setup, and `pnpm install` to finish.
5. Open Cursor's integrated terminal and run `pnpm dev`.

Cursor forwards port 3000 automatically. The container workspace is `/workspace`, local source
edits remain on the host through the Compose bind mount, and PostgreSQL is available at
`database:5432`. Use **Dev Containers: Rebuild Container** after changing `Dockerfile`,
`compose.yaml`, or `.devcontainer/devcontainer.json`.

## Docker browser tests

The `test` profile uses the official Playwright Noble image and separate dependency volumes, leaving the Alpine development image small:

```powershell
docker compose --profile test run --rm e2e
```

The Playwright package and Docker image are intentionally pinned to the same version. Update them together.

## Quality checks

GitHub Actions runs formatting, linting, type checking, coverage, production build, and Playwright tests for pushes and pull requests targeting `main`. Coverage and Playwright diagnostics are uploaded with short retention when useful for review or failure diagnosis.
