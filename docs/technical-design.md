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

| Area                | Status   | Current direction                                                                      |
| ------------------- | -------- | -------------------------------------------------------------------------------------- |
| Application hosting | Accepted | Vercel Hobby                                                                           |
| CI/CD               | Accepted | GitHub required checks + Vercel Git deployments                                        |
| RSVP database       | Proposed | Neon Free PostgreSQL through Prisma                                                    |
| Guest RSVP access   | Open     | Private per-household invitation token or shared lookup flow                           |
| Admin access        | Open     | Minimal authenticated admin page or database-console-only workflow                     |
| Email               | Open     | No transactional email initially, or a low-volume provider if confirmations are wanted |
| Domain              | Open     | Custom domain purchased separately and connected to Vercel                             |
| Analytics           | Open     | Privacy-friendly, minimal analytics or none                                            |

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
3. Decide whether an admin interface is worth building.
4. Define the exact RSVP questions, household/plus-one rules, and meal-choice behavior.
5. Decide whether guests receive confirmation or reminder emails.
6. Choose domain/registrar, analytics, monitoring, backup, and post-wedding data-retention policy.

## Decision log

| Date       | Decision                                               | Status   | Notes                                                                        |
| ---------- | ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------- |
| 2026-07-11 | Begin with Vercel + Neon as the architecture candidate | Proposed | Optimizes for low cost and low maintenance while fitting the existing stack. |
| 2026-07-11 | Host the application on Vercel Hobby                   | Accepted | One code maintainer removes the relevant Hobby Git collaboration concern.    |
| 2026-07-11 | Use GitHub checks and Vercel Git deployments for CI/CD | Accepted | Pull requests get checks and previews; merges to `main` deploy production.   |
