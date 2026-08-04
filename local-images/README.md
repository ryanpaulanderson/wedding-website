# Local image sources

Put a web-quality JPEG, PNG, WebP, or AVIF source beside a tracked file named
`<source-name>.image.json`. Image binaries in this directory are intentionally ignored by Git and
Vercel; sidecars and this README remain tracked.

## Unselected photo library

Keep photos that have not been assigned to the site under `library/`, organized by occasion or
trip. Leave them without `*.image.json` sidecars until a placement and crop are chosen. The image
pipeline ignores unconfigured sources, so `pnpm images:sync` cannot accidentally publish the whole
private library.

See `library/README.md` for the current inventory and visual notes. When a photo is selected, add a
sidecar beside it with only the variants the site needs, then run `pnpm images:prepare` to review the
generated crops locally before syncing them.

Run `pnpm images:prepare` to validate the sidecars and generate ignored local derivatives. Run
`pnpm images:sync` only after a public Blob store is connected and `.env.local` contains the pulled
`BLOB_READ_WRITE_TOKEN`.
