#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIRECTORY="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIRECTORY}/.." && pwd)"
readonly BLOB_STORE_NAME="wedding-images"

sync_images=false

usage() {
  cat <<'EOF'
Usage: ./scripts/setup-vercel.sh [--sync-images]

Authenticate the Vercel CLI when needed, link this checkout to a Vercel project,
ensure a public wedding-images Blob store is connected, and pull its token into
the ignored .env.local file.

Options:
  --sync-images  Run pnpm images:sync after setup succeeds.
  -h, --help     Show this help text.
EOF
}

for argument in "$@"; do
  case "${argument}" in
    --sync-images)
      sync_images=true
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "${argument}" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v pnpm >/dev/null 2>&1; then
  printf 'pnpm is unavailable. Run this script inside the project Dev Container.\n' >&2
  exit 1
fi

cd "${REPOSITORY_ROOT}"

vercel() {
  pnpm dlx vercel "$@"
}

has_blob_token() {
  local token_value

  [[ -f .env.local ]] || return 1
  token_value="$(sed -n 's/^BLOB_READ_WRITE_TOKEN=//p' .env.local | tail -n 1)"
  token_value="${token_value#\"}"
  token_value="${token_value%\"}"
  [[ -n "${token_value}" ]]
}

pull_blob_token() {
  local pulled_environment
  local updated_environment
  local token_line

  pulled_environment="$(mktemp)"
  updated_environment="$(mktemp)"
  vercel env pull "${pulled_environment}" --yes
  token_line="$(grep '^BLOB_READ_WRITE_TOKEN=' "${pulled_environment}" | tail -n 1 || true)"
  rm -f "${pulled_environment}"

  if [[ -z "${token_line}" ]]; then
    rm -f "${updated_environment}"
    return 1
  fi

  if [[ -f .env.local ]]; then
    grep -v '^BLOB_READ_WRITE_TOKEN=' .env.local >"${updated_environment}" || true
  fi
  printf '%s\n' "${token_line}" >>"${updated_environment}"
  mv "${updated_environment}" .env.local
}

printf 'Checking Vercel authentication...\n'
if ! vercel whoami >/dev/null 2>&1; then
  printf 'Vercel authentication is required. Follow the login prompt or open its URL.\n'
  vercel login
fi

if [[ -f .vercel/project.json ]]; then
  printf 'Using the Vercel project already linked in .vercel/project.json.\n'
else
  printf 'Linking this checkout to a Vercel project...\n'
  vercel link
fi

if ! has_blob_token; then
  printf 'Pulling the Blob token without replacing other local environment values...\n'
  pull_blob_token || true
fi

if ! has_blob_token; then
  printf 'No connected Blob token was found; creating the public %s store...\n' \
    "${BLOB_STORE_NAME}"
  vercel blob create-store "${BLOB_STORE_NAME}" --access public --yes
  pull_blob_token || true
fi

if ! has_blob_token; then
  printf 'Vercel setup completed without a BLOB_READ_WRITE_TOKEN in .env.local.\n' >&2
  printf 'Check that the Blob store is connected to the Development environment.\n' >&2
  exit 1
fi

printf 'Vercel project and public Blob storage are ready.\n'

if [[ "${sync_images}" == true ]]; then
  printf 'Preparing and synchronizing image variants...\n'
  pnpm images:sync
else
  printf 'Run pnpm images:sync when you are ready to upload configured images.\n'
fi
