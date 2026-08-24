#!/usr/bin/env bash
set -euo pipefail

: "${PR_BASE_SHA:=}"
: "${STORAGE_DRIVER:=postgres}"
: "${PGHOST:=127.0.0.1}"
: "${PGPORT:=55432}"
: "${PGUSER:=postgres}"
: "${PGPASSWORD:=postgres-ci-only}"
: "${PGDATABASE:=moonwitness_ci}"

printf '%s\n' '=== MoonWitness release certification ==='
printf 'node=%s\n' "$(node --version)"
printf 'npm=%s\n' "$(npm --version)"
printf 'workspace=%s\n' "$PWD"
printf 'git=%s\n' "$(git --version)"
printf 'package-lock-bytes=%s\n' "$(wc -c < package-lock.json)"

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

printf '%s\n' '=== MoonWitness release certification PASSED ==='
