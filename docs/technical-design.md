# Wedding Website Technical Design

This is a living design document. We will update proposals to **Accepted** as decisions are
made and record enough context to revisit them later without reopening every discussion.

## Goals

- Give guests a fast, accessible website on phones and desktops.
- Let invited guests submit and later update an RSVP safely.
- Deploy the production website automatically when an approved change reaches `main`.
- Keep recurring costs at or near $0 without creating unnecessary operational work.
- Keep guest contact information private and make it easy to export or delete after the event.

## Constraints and current foundation

- Next.js 16 App Router, React 19, and TypeScript.
- Prisma 7 is installed.
- Local development already uses PostgreSQL 17 through Docker Compose.
- The source repository is hosted on GitHub and its production branch is `main`.
- This is a personal, low-traffic site with short bursts of activity around invitations and
  RSVP deadlines.

## Decision summary

| Area                  | Status   | Current direction                                                                      |
| --------------------- | -------- | -------------------------------------------------------------------------------------- |
| Application hosting   | Accepted | Vercel Hobby                                                                           |
| CI/CD                 | Accepted | GitHub required checks + Vercel Git deployments                                        |
| Public image storage  | Accepted | Gitignored local originals; processed immutable variants in public Vercel Blob         |
| Temporary site access | Accepted | Shared password on all Vercel deployments; local execution bypasses it                 |
| RSVP database         | Proposed | Neon Free PostgreSQL through Prisma                                                    |
| Guest RSVP access     | Open     | Private per-household invitation token or shared lookup flow                           |
| Admin access          | Accepted | Unlinked passphrase-protected `/admin` portal for the sole maintainer                  |
| Email                 | Open     | No transactional email initially, or a low-volume provider if confirmations are wanted |
| Domain                | Accepted | `www.carolineandryan.org`; apex redirects to `www`                                     |
| Analytics             | Open     | Privacy-friendly, minimal analytics or none                                            |

## Proposed architecture

### Application hosting: Vercel Hobby

**Status:** Accepted

Connect the GitHub repository to Vercel and configure `main` as the production branch. Every
pull request receives a preview deployment; merging to `main` creates a production deployment.
Vercel also manages HTTPS and deployment rollback.

Why this is the leading option:

- It has first-party-quality support for the Next.js runtime used by this project.
- The free Hobby plan is intended for personal projects and includes Git-based CI/CD.
- There is almost no infrastructure to operate during the busy period before the wedding.
- If the free tier proves insufficient, upgrading does not require moving the application.

Tradeoffs:

- The application becomes somewhat coupled to Vercel's Next.js platform behavior.
- Hobby has usage and collaboration limits. This project's sole code maintainer will own the
  Vercel Hobby project, which fits its Git deployment model.
- The domain registration is not free, even though hosting can be.

Alternatives considered:

- **Cloudflare Workers:** strong pricing and global runtime, but full-stack Next.js requires an
  adapter/runtime path and adds deployment complexity without a clear benefit at this scale.
- **Netlify:** viable Next.js hosting with Git deployments, but Vercel is the simpler default for
  a new Next.js application.
- **A small VPS:** predictable and portable, but adds patching, monitoring, backups, TLS, and
  deployment work that is not justified for this site.

References:

- [Vercel Git deployments](https://vercel.com/docs/git)
- [Vercel plans](https://vercel.com/docs/plans)
- [Cloudflare's Next.js deployment guidance](https://developers.cloudflare.com/pages/framework-guides/nextjs/)

### CI/CD: GitHub checks plus Vercel deployments

**Status:** Accepted

Use two complementary pieces:

1. GitHub Actions runs repeatable quality checks on pull requests: lint, TypeScript, tests once
   present, and a production build.
2. Vercel builds a preview for each pull request and automatically deploys `main` to production.

Protect `main` so changes normally arrive through a pull request whose checks pass. Vercel is
the deployment system; GitHub Actions should not hold a long-lived Vercel production token or
run a duplicate production deployment.

Rollback strategy: revert the change in Git to create a new production deployment, with
Vercel's deployment rollback available for an urgent recovery.

### Public image storage and processing

**Status:** Accepted

Keep original couple photographs and temporary stock images outside Git under `local-images/`.
Tracked JSON sidecars define stable image IDs, accessible alternative text, named output variants,
dimensions, quality, and normalized crop focal points. Local tooling uses Sharp to auto-orient each
source, remove embedded metadata, crop and resize without upscaling, and emit WebP derivatives.

Publish only processed variants to a public Vercel Blob store. Each Blob pathname includes a hash
of the processed bytes, so published images are immutable and can use long-lived caching safely.
The generated catalog containing public URLs and presentation metadata is committed; pages resolve
named catalog variants rather than filenames or hand-written URLs. Local development prefers
generated local derivatives when present and otherwise falls back to the cataloged Blob URL.

`BLOB_READ_WRITE_TOKEN` is needed only by the explicit local sync and prune commands. It stays in
ignored `.env.local`, is never exposed through `NEXT_PUBLIC_`, and is not required by the deployed
application. Normal synchronization never deletes remote data; pruning is a separate dry-run-first
operation. Public website images remain publicly retrievable, so originals are never uploaded and
the processing step strips EXIF and GPS metadata.

References:

- [Vercel Blob](https://vercel.com/docs/vercel-blob)
- [Vercel Blob CLI](https://vercel.com/docs/cli/blob)
- [Next.js image optimization](https://nextjs.org/docs/app/getting-started/images)

### Temporary hosted-site password gate

**Status:** Accepted

Protect every Vercel production and preview deployment with a shared password while the website
is under development. Local execution remains open, including local production builds and browser
tests. This gate provides temporary development privacy only; it is not guest identity, RSVP
authorization, or a substitute for authorization at future data boundaries.

The gate uses three server-only Vercel environment variables:

- `SITE_PASSWORD_GATE=enabled` activates protection. `disabled` makes hosted deployments public.
- `SITE_PASSWORD_HASH` contains the salted scrypt hash generated for the shared password.
- `SITE_SESSION_SECRET` signs a 30-day, HTTP-only access cookie.

Only `isSitePasswordGateEnabled()` interprets the switch. Local execution always bypasses it. On
Vercel, missing or invalid switch values fail closed. Enabled deployments with missing or malformed
secrets show an unavailable state and never grant access. Protected responses are private,
non-cacheable, and excluded from search indexing.

Removal is deliberately two-stage:

1. Set `SITE_PASSWORD_GATE=disabled` for Production and Preview, redeploy, and verify the site is
   public and indexable.
2. Remove the isolated proxy, access route, session utility, protected layout, tests, environment
   variables, and temporary documentation in a cleanup pull request.

The first step launches the public site; the second carries no launch dependency.

### Admin portal access

**Status:** Accepted

Provide an unlinked administration page at `/admin` for the project's sole maintainer. The first
release is an application shell with an explicit disconnected-data state; it does not query Prisma,
expose an admin API, or mutate RSVP records.

Admin authentication is independent from the removable hosted-site password gate and is enforced
in local, preview, and production environments. `ADMIN_PASSWORD_HASH` stores a salted scrypt hash,
and `ADMIN_SESSION_SECRET` signs a purpose-bound session cookie with a fixed eight-hour lifetime.
The cookie is HTTP-only, scoped to `/admin`, uses strict same-site handling, and is secure on Vercel.
Preview and production use different credentials. Rotating the session secret revokes all active
admin sessions.

The page checks the session before rendering private content, and every admin data read or mutation
must authorize again at its server boundary. The Next.js proxy provides private, non-cacheable,
non-indexable responses and browser security headers, but it is not an authorization layer. Apply a
Vercel WAF fixed-window rule to `POST /admin`: ten requests per IP per ten minutes, followed by a
`429` response.

This passphrase model is intentionally limited to one maintainer. Move to provider-backed named-user
authentication before adding another administrator, multi-factor authentication, role-based access,
or audit-history requirements.

### RSVP storage: Neon PostgreSQL with Prisma

**Status:** Proposed

Use a managed Neon PostgreSQL database in production. Keep local PostgreSQL for development and
use Prisma for schema migrations and typed data access in both environments.

Why this is the leading option:

- It matches the PostgreSQL and Prisma foundation already in the repository.
- Neon's free tier is designed for intermittent workloads and scales idle compute to zero.
- Relational data naturally represents households, guests, meal selections, plus-ones, and RSVP
  revisions.
- Data can be exported with standard PostgreSQL tools, avoiding a proprietary data format.

Expected free-tier tradeoff: the first RSVP after an idle period can be slightly slower while
the database wakes. That is acceptable for a form submission, provided the interface has a clear
pending state and retries safe transient failures.

Do not store RSVP records in source files, a client-side service, deployment-local files, or a
spreadsheet used directly as the application's database. Those options make concurrent updates,
validation, privacy, and auditability harder.

References:

- [Neon pricing](https://neon.com/pricing)
- [Neon scale to zero](https://neon.com/docs/introduction/scale-to-zero)
- [Supabase pricing, for comparison](https://supabase.com/pricing)

## Initial RSVP domain model

This model is intentionally conceptual until the guest access flow is chosen.

- **Household / invitation:** mailing name, invitation token or lookup key, RSVP deadline, notes.
- **Guest:** name, attendance response, meal choice if applicable, dietary notes, and plus-one
  relationship.
- **Submission metadata:** first-submitted and last-updated timestamps; optionally an event log
  for troubleshooting changes.

Security and privacy baseline:

- Generate high-entropy invitation tokens; never use sequential database IDs as access secrets.
- Store a hash of each token when practical, so a database read does not expose usable links.
- Validate and authorize every RSVP read and write on the server.
- Rate-limit lookup and submission endpoints and use generic errors that do not reveal the guest
  list.
- Collect only information needed for the event. Do not store payment information or sensitive
  identity documents.
- Restrict production database access to the maintainers and keep credentials in deployment
  environment variables, never in Git.
- Provide a CSV export and define a date after the wedding for deleting guest data and backups as
  provider retention permits.

## Environment strategy

- **Local:** Docker PostgreSQL with disposable development data.
- **Preview:** no production guest data. Initially use a shared non-production database with
  seeded fictional guests; consider per-branch databases only if migrations make that valuable.
- **Production:** dedicated Neon database/branch with narrowly scoped credentials.

The canonical production URL is `https://www.carolineandryan.org`. The apex domain permanently
redirects to `www`. DNS remains managed by Squarespace Domains and points the apex and `www` records
to the values assigned by Vercel.

Database migrations should run as an explicit release step with a production-safe Prisma command,
not unpredictably during application startup. The exact release workflow will be decided when the
first schema is created.

## Cost expectation

The expected recurring platform cost is $0 while Vercel Hobby and Neon Free remain within their
published allowances. The likely unavoidable cost is a custom domain, generally billed annually
by the chosen registrar. Optional email, paid backups, or upgraded collaboration/support can add
cost later, but none is required for the first usable release.

Free-tier allowances and terms can change, so re-check them before the public launch.

## Open decisions

We should resolve these roughly in order:

1. Accept or replace the Vercel + Neon baseline.
2. Choose how guests identify their invitation and update an RSVP.
3. Define the exact RSVP questions, household/plus-one rules, and meal-choice behavior.
4. Decide whether guests receive confirmation or reminder emails.
5. Choose domain/registrar, analytics, monitoring, backup, and post-wedding data-retention policy.

## Decision log

| Date       | Decision                                                  | Status   | Notes                                                                                        |
| ---------- | --------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| 2026-07-11 | Begin with Vercel + Neon as the architecture candidate    | Proposed | Optimizes for low cost and low maintenance while fitting the existing stack.                 |
| 2026-07-11 | Host the application on Vercel Hobby                      | Accepted | One code maintainer removes the relevant Hobby Git collaboration concern.                    |
| 2026-07-11 | Use GitHub checks and Vercel Git deployments for CI/CD    | Accepted | Pull requests get checks and previews; merges to `main` deploy production.                   |
| 2026-07-11 | Use `www.carolineandryan.org` as the canonical domain     | Accepted | The apex domain permanently redirects to `www`; Squarespace retains DNS.                     |
| 2026-07-11 | Protect hosted development with a removable password gate | Accepted | All Vercel deployments are gated for 30 days per session; local runs bypass it.              |
| 2026-07-11 | Store processed public images in Vercel Blob              | Accepted | Originals stay ignored; named immutable variants are generated and synchronized.             |
| 2026-08-05 | Add a dedicated single-maintainer admin portal            | Accepted | Separate passphrase auth protects an unlinked `/admin` shell and all server data boundaries. |
