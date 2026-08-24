#!/usr/bin/env bash
set -euo pipefail

: "${PGPORT:=55432}"
: "${PR_BASE_SHA:=}"

printf 'CI workspace: %s\n' "$PWD"
test -f package.json
test -f package-lock.json
printf 'package-lock bytes: '
wc -c < package-lock.json

if [[ -n "$PR_BASE_SHA" ]]; then
  export PR_BASE_SHA
fi

npm ci --ignore-scripts
npm run dependency:integrity
npm run dependency:audit
npm run docs:check
npm run lint
npm run typecheck
npm run release:identity
npm run build:api
npm run build:cab
npm run build:web
npm run build:xrp
npm run build:flow
npm run test:postgres
npm run test:release
npm run certify:current
