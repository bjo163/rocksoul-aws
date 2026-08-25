#!/usr/bin/env bash
set -euo pipefail

IMAGE="${IMAGE:-cosmic:local}"

# Do not use a private GHCR cache by default. A clean checkout must build
# without registry credentials or an existing remote image.
docker build --pull -t "$IMAGE" .
