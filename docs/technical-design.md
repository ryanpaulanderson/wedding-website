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

| Area                  | Status   | Current direction                                                              |
| --------------------- | -------- | ------------------------------------------------------------------------------ |
| Application hosting   | Accepted | Vercel Hobby                                                                   |
| CI/CD                 | Accepted | GitHub required checks + Vercel Git deployments                                |
| Public image storage  | Accepted | Gitignored local originals; processed immutable variants in public Vercel Blob |
| Temporary site access | Accepted | Shared password on all Vercel deployments; local execution bypasses it         |
| RSVP database         | Accepted | Separate Neon PostgreSQL resources through Prisma for Preview and Production   |
| Guest RSVP access     | Accepted | Private per-household invitation link plus name lookup; access flows deferred  |
| Admin access          | Accepted | Unlinked passphrase-protected `/admin` portal for the sole maintainer          |
| Email                 | Accepted | Resend via Vercel integration; OpenPGP-encrypted maintainer notifications      |
| Domain                | Accepted | `www.carolineandryan.org`; apex redirects to `www`                             |
| Analytics             | Accepted | Vercel Web Analytics and Speed Insights, with no custom guest-data events      |

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

### Analytics: Vercel Web Analytics and Speed Insights

**Status:** Accepted

Use Vercel Web Analytics for page-view and referrer trends and Vercel Speed Insights for
real-user Core Web Vitals. Both first-party components are mounted once in the root layout, so
they follow the App Router during navigation without adding an application-specific tracking API.
Their client-only boundary returns `null` from each integration's `beforeSend` hook when the
browser exposes an enabled Do Not Track signal (`navigator.doNotTrack` is `"1"` or `"yes"`), so no
telemetry event is sent. Browsers that do not expose that signal continue with Vercel's default,
privacy-focused aggregated telemetry.

Enable Web Analytics and Speed Insights for the Vercel project, then deploy the change. The
Vercel dashboards are the only telemetry destination. Do not add custom events, visitor IDs, or
event properties containing RSVP responses, invitation tokens, email addresses, admin activity,
or other guest data without an explicit privacy decision. Before the public launch and after the
wedding, review the Vercel plan's current usage limits and retention options.

References:

- [Vercel Web Analytics](https://vercel.com/docs/analytics)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)

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

The unlock action applies a bounded, per-instance fixed window of ten attempts per client per ten
minutes before running scrypt password verification. Because serverless instances do not share that
memory, also apply a Vercel Firewall fixed-window rule to `POST /access`: ten requests per IP per ten
minutes, followed by a `429` response.

Removal is deliberately two-stage:

1. Set `SITE_PASSWORD_GATE=disabled` for Production and Preview, redeploy, and verify the site is
   public and indexable.
2. Remove the isolated proxy, access route, session utility, protected layout, tests, environment
   variables, and temporary documentation in a cleanup pull request.

The first step launches the public site; the second carries no launch dependency.

### Admin portal access

**Status:** Accepted

Provide an unlinked administration page at `/admin` for the project's sole maintainer. The portal
reads narrow RSVP summary DTOs directly through an authenticated server-only Prisma boundary. It
does not expose an admin API or mutate formal RSVP records. The separate early-notice view allows authorized review tracking and retries for unsent notice emails.

Admin authentication is independent from the removable hosted-site password gate and is enforced
on every Vercel preview and production deployment. Local execution, including local production
builds, bypasses authentication so development needs no admin credentials or session. The central
`isAdminAuthenticationRequired()` check uses the server environment (`VERCEL === "1"`), never
request headers or the hostname. The page and data boundary share this policy; local dashboards
omit the sign-out control because there is no session to end. `ADMIN_PASSWORD_HASH` stores a salted scrypt hash,
and `ADMIN_SESSION_SECRET` signs a purpose-bound session cookie with a fixed eight-hour lifetime.
The cookie is HTTP-only, scoped to `/admin`, uses strict same-site handling, and is secure on Vercel.
Preview and production use different credentials. Rotating the session secret revokes all active
admin sessions.

On Vercel, the page checks the session before rendering private content, and every admin data read or mutation
must authorize again at its server boundary. The Next.js proxy provides private, non-cacheable,
non-indexable responses and browser security headers, but it is not an authorization layer. The
sign-in action enforces a bounded, per-instance fixed window of ten attempts per client per ten
minutes. Because serverless instances do not share that memory, also apply a Vercel WAF fixed-window
rule to `POST /admin`: ten requests per IP per ten minutes, followed by a `429` response.

This passphrase model is intentionally limited to one maintainer. Move to provider-backed named-user
authentication before adding another administrator, multi-factor authentication, role-based access,
or audit-history requirements.

### RSVP storage: Neon PostgreSQL with Prisma

**Status:** Accepted

Use managed Neon PostgreSQL resources provisioned through the Vercel Marketplace for hosted
environments. Keep local PostgreSQL for development and use Prisma for schema migrations and typed
data access in every environment. Preview and Production use separate resources and credentials.

Why this option was selected:

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

The implemented foundation stores households and their named invited guests. The September 12
extension adds the following fields without enabling uploads or RSVP submission:

- **Household:** existing display name and response timestamps, plus an optional unique
  `invitationTokenHash`. Future private links use a high-entropy token and store only its lowercase
  SHA-256 hash (64 hexadecimal characters). Existing households may have no token; this migration
  does not generate or distribute invitations.
- **Named invited guest:** existing display name and attendance, plus optional
  `dietaryRestrictions` (up to 1,000 characters) and `plusOneAllowed` (false by default).
  The maintainer's future upload is authoritative for plus-one permission, per named guest.
- **Optional plus-one:** `plusOneName` (up to 200 characters), `plusOneAttendance`, and
  `plusOneDietaryRestrictions` (up to 1,000 characters) live on the inviting guest's record.
  This gives each named guest zero or one additional place without creating an unnamed Guest row
  or permitting chains of plus-ones. The plus-one uses the same attending/declined enum as guests;
  null attendance means unanswered. Dietary restrictions are independent for each person.
- **Database invariants:** an unpermitted plus-one has no name, attendance, or dietary data.
  An attending plus-one requires a nonblank name and an attending named guest. Future writes must
  update the related fields atomically; revoking permission must clear all plus-one fields.

Future invitation capacity is the count of named guests plus guests with `plusOneAllowed = true`.
Future attendance totals must count attending named guests and attending plus-ones separately.
The current read-only dashboard still counts named Guest rows only; its queries must be extended
when plus-one upload/submission is implemented, before plus-one responses are collected.

Guests will eventually be able to open a private link directly to their household's RSVP or look
up the invitation by name. This change adds only the supporting token hash field; it adds no guest
access endpoint. Name lookup must resolve ambiguous names and define an authorization mechanism
and abuse controls before exposing private household data. Display names are not unique IDs or
access secrets. RSVP deadlines, meal choices, and submission history remain future work.

### RSVP submission notifications

**Status:** Accepted

Use the Resend Vercel integration's `RESEND_API_KEY` and `RESEND_EMAIL_DOMAIN`. Native server-side
`fetch` sends through Resend's HTTPS API, avoiding another mail transport dependency. The sender
is `rsvp@` the configured, verified domain. Production and Preview credentials remain independently
scoped. Delivery is enabled wherever valid Resend credentials are configured, including Preview
and local development, so the maintainer can verify the complete flow before Production.

OpenPGP.js encrypts the whole message body before it leaves the application's server. The sole
recipient is `ryan@ryanpaulanderson.com`, using the supplied public key with fingerprint
`58c672499966963f14562e0b87be07b6ee595988`. The server-only recipient module bundles this public
material so deployments do not depend on a local file or a mutable external key lookup. Validate
the fingerprint, email identity, and current encryption-key validity on each encryption. Key
rotation requires an explicit reviewed update to the recipient module. No private key is required
or stored.

Send the ASCII-armored ciphertext as a PGP/Inline plain-text email with a generic subject,
`Wedding RSVP notification`. Do not add an unencrypted HTML alternative or guest details in
headers, subjects, attachment names, or provider tags. PGP-capable mail clients, including Proton
Mail, can decrypt this format. Mail services still see routing addresses, subject, timing, and
message size; the Vercel application still processes the original RSVP and PostgreSQL storage
is not PGP-encrypted by this feature. These emails are encrypted but not PGP-signed.

The delivery function awaits Resend, uses a ten-second timeout per attempt, and retries temporary
network/provider failures up to three attempts with identical ciphertext and idempotency keys.
Configuration or encryption failure never falls back to plaintext. Results distinguish provider
acceptance from failures; acceptance alone does not prove inbox delivery or successful decryption.
The explicit status command can check Resend's recorded delivery event when the API key permits it.

The formal household RSVP submission flow remains deferred. The separate early-decline flow below
now uses an atomic database outbox. Reuse that delivery guarantee when connecting formal RSVPs;
email failure must never discard a saved response.

### Early notices: unable to attend

**Status:** Accepted

At the save-the-date stage, `/unable-to-attend` accepts an optional early notice from anyone who
already knows they cannot attend. The homepage links to it while retaining the message that formal
RSVPs open with invitations. No invitation lookup, account, or household token is required. The
temporary site password gate still applies on hosted deployments while enabled.

Store the original freeform names (up to 1,000 characters) and a normalized, lowercase email address
(up to 254 characters) in `early_declines`, separate from households and guests. One notice per
normalized email is enforced by a unique database constraint, including concurrent submissions.
Duplicates receive the same acknowledgment without overwriting names or creating more email jobs.
The form asks for everyone in one notice; corrections and changed plans go directly to Ryan.
This does not verify ownership of an email address and does not automatically change the invitation
list or formal RSVP totals.

Save the notice and two `early_decline_emails` rows in one database transaction. One is a fixed,
unpersonalized guest confirmation with Ryan's reply address: thank them for letting us know, say
we are sorry they cannot attend, and ask them to email Ryan if plans change. No guest public key is
available, so this confirmation is ordinary email. The other contains the names, email and submission
time encrypted to Ryan's pinned public PGP key, using the existing generic subject. Guest-supplied
text is never reflected in the guest email or email headers.

Next.js `after()` attempts delivery after the saved response. Each job claims a two-minute database
lease, persists its exact serialized request before calling Resend, and retains identical bytes and
an outbox-ID idempotency key on every retry. Failed mail remains visible for an authorized manual
retry in `/admin/early-declines`; there is no scheduler or automatic cross-request worker. A process
interruption leaves a recoverable pending job. After 23 hours from an unresolved first send attempt,
stop resending and require delivery reconciliation in Resend, ahead of its 24-hour deduplication
expiry. Do not re-encrypt or reset a possibly accepted job to bypass that limit. Accepted indicates
provider acceptance, not inbox delivery; provider references support bounce/delivery checks.

Configured Preview and local environments send the same guest confirmations and encrypted admin
notifications as Production. Missing configuration leaves a failed job available for retry. Legacy
`PAUSED` jobs from the former environment guard are also retryable without changing the database
schema or resending accepted jobs. Automated tests mock delivery or explicitly clear mail credentials.
Existing maintainer-only synthetic email commands remain available. The admin view shows both email
states, submitted names and address, submission time and
review status, paginated at 25 notices. Every admin read and mutation independently reauthorizes.
Marking a notice reviewed is an acknowledgment that the maintainer has dealt with their guest list;
it does not alter formal guest records.

The public action validates input and consumes a PostgreSQL-backed limit of five attempts per client
per clock hour, before inserting notices or sending mail. HMAC keys use the existing server-only
`ADMIN_SESSION_SECRET` with an early-decline/hour namespace and the same trusted Vercel address
selection as login limiting. No raw IP is retained; expired counters are removed on later submissions.
Hosted submissions fail closed if this secret is unavailable. Local execution uses a development-only
key. This limits routine repeat abuse but is not identity verification or a substitute for edge DDoS
protection. No submission data is sent in analytics events, URLs, provider tags, or logs.

Deployment: explicitly apply committed migrations with `pnpm db:migrate:deploy` using each target's
unpooled database URL before enabling this feature there. Never apply migrations in a build or at
startup. The migration only adds separate tables, enums and constraints; it preserves existing data.
Preview needs its own migration for the form to work. Existing Production Resend variables and admin
session secret are reused; no new credentials or paid service are required.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email),
[OpenPGP.js](https://docs.openpgpjs.org/),
[PGP/Inline compatibility](https://proton.me/support/pgp-mime-pgp-inline).

### Security and privacy baseline

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

- **Local:** Docker PostgreSQL with disposable development data, published to the host on loopback
  only.
- **Preview:** one persistent non-production Neon database shared by preview deployments. It begins
  empty; automated tests use only disposable fictional fixtures. Per-deployment branches remain a
  future option if schema development makes them valuable.
- **Production:** a separate Neon database with narrowly scoped credentials and no Preview access.

The canonical production URL is `https://www.carolineandryan.org`. The apex domain permanently
redirects to `www`. DNS remains managed by Squarespace Domains and points the apex and `www` records
to the values assigned by Vercel.

Runtime connections use Neon's pooled `DATABASE_URL`; Prisma CLI operations prefer the direct
`DATABASE_URL_UNPOOLED`. Migrations are committed and applied explicitly with
`pnpm db:migrate:deploy`, first against Preview and then against Production from the exact reviewed
commit. The maintainer injects the target environment in memory with `vercel env run`. Migrations
never run during application startup or every Vercel build, and hosted databases never receive
`prisma migrate dev` or `prisma db push`.

## Cost expectation

The expected recurring platform cost is $0 while Vercel Hobby and Neon Free remain within their
published allowances. The likely unavoidable cost is a custom domain, generally billed annually
by the chosen registrar. Optional email, paid backups, or upgraded collaboration/support can add
cost later, but none is required for the first usable release.

Free-tier allowances and terms can change, so re-check them before the public launch.

## Open decisions

We should resolve these roughly in order:

1. Design private invitation-link and name-lookup authorization and the RSVP update flow.
2. Finalize RSVP questions, deadlines, and meal-choice behavior; dietary and plus-one fields are defined.
3. Decide whether formal RSVP guests receive confirmation or reminder emails; early notices already receive confirmation.
4. Choose analytics, monitoring, backup, and post-wedding data-retention policy.
5. Connect encrypted notifications to the future submission flow with a durable outbox and retry policy.

## Decision log

### 2026-09-12: Email testing in Preview

**Status:** Accepted

Remove the Production-only mail guard at the maintainer's request. Any environment with valid
Resend configuration can send both guest confirmations and encrypted maintainer notifications.
Make legacy paused jobs retryable in admin. Preserve idempotency, encryption and authorization;
automated tests isolate delivery through provider mocks or empty credentials rather than an
application environment restriction. This supersedes the original Production-only email policy.

### 2026-09-12: Early unable-to-attend notices

**Status:** Accepted

Add a freeform early-notice page for save-the-date planning, separate from formal RSVPs. Collect
names and email, prevent duplicate notices, send a fixed guest confirmation and an encrypted
maintainer notification, and provide an independently authorized admin review view. Persist both
email jobs with the notice to retain failures and prevent duplicate sends across retries. The
formal invitation lookup and RSVP flow remain deferred. This extends the earlier model-only scope
at the maintainer's request without changing the formal guest list automatically.

### 2026-09-12: Resend and public-key-encrypted notifications

**Status:** Accepted

Use the maintainer-connected Resend Vercel integration and supplied public PGP key. Add an
encrypted server-side sender and explicit connection, test-delivery, and delivery-status commands.
The body is encrypted before Resend receives it; the public key is pinned alongside the intended
recipient. No plaintext fallback is permitted. The initial Production-only delivery restriction was
superseded by the Preview-testing decision above; early notices now use the durable outbox.

### 2026-09-12: Dietary restrictions and conditional plus-ones

**Status:** Accepted

Add bounded optional dietary notes separately for named guests and their plus-ones. Plus-one
permission belongs to the maintainer's upload and defaults to false. A guest record holds at most
one plus-one's response, enforced with database checks for permission and attending companions.
Add an optional hashed household invitation token to support private links; guests will also be
able to use name lookup once its authorization flow is designed. Scope is the data model and
committed migration only; upload, guest forms, dashboard changes, and email delivery are deferred.

| Date       | Decision                                                   | Status   | Notes                                                                                                            |
| ---------- | ---------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| 2026-07-11 | Begin with Vercel + Neon as the architecture candidate     | Proposed | Optimizes for low cost and low maintenance while fitting the existing stack.                                     |
| 2026-07-11 | Host the application on Vercel Hobby                       | Accepted | One code maintainer removes the relevant Hobby Git collaboration concern.                                        |
| 2026-07-11 | Use GitHub checks and Vercel Git deployments for CI/CD     | Accepted | Pull requests get checks and previews; merges to `main` deploy production.                                       |
| 2026-07-11 | Use `www.carolineandryan.org` as the canonical domain      | Accepted | The apex domain permanently redirects to `www`; Squarespace retains DNS.                                         |
| 2026-07-11 | Protect hosted development with a removable password gate  | Accepted | All Vercel deployments are gated for 30 days per session; local runs bypass it.                                  |
| 2026-07-11 | Store processed public images in Vercel Blob               | Accepted | Originals stay ignored; named immutable variants are generated and synchronized.                                 |
| 2026-08-05 | Add a dedicated single-maintainer admin portal             | Accepted | Separate passphrase auth protects an unlinked `/admin` shell and all server data boundaries.                     |
| 2026-08-05 | Bound password verification and local database exposure    | Accepted | App and edge limits protect scrypt; local PostgreSQL binds only to host loopback.                                |
| 2026-08-05 | Use isolated Neon databases through the Vercel Marketplace | Accepted | Local Docker remains disposable; Preview and Production use separate credentials and explicit Prisma migrations. |
| 2026-08-05 | Use Vercel Web Analytics and Speed Insights                | Accepted | Minimal telemetry; honors Do Not Track and sends no custom guest data.                                           |

### 2026-09-12: Credential-free local admin access

**Status:** Accepted

Local development and local production builds bypass admin authentication to avoid unnecessary
credential setup. Hosted Vercel deployments still fail closed without valid dedicated credentials
and an authenticated session. Every admin data boundary continues to call the central authorization
helper, which applies this environment policy.
