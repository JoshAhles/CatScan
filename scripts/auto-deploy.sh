#!/usr/bin/env bash
# Polls origin/main; if a new commit landed, pulls, rebuilds, and restarts the
# catscan service. Idempotent and safe to run on a timer.
set -euo pipefail

REPO=/opt/catscan
BRANCH=main
LOCK="${RUNTIME_DIRECTORY:-/tmp}/catscan-deploy.lock"

# Single-flight: bail if a previous tick is still running.
exec 9>"$LOCK"
flock -n 9 || { echo "another deploy is running; skipping"; exit 0; }

cd "$REPO"

git fetch --quiet origin "$BRANCH"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0
fi

echo "deploy: $LOCAL → $REMOTE"
git checkout -q "$BRANCH"
git pull --ff-only --quiet origin "$BRANCH"

# Read the bundle-time token from .env so the web rebuild keeps auth working.
TOKEN=$(grep ^CATSCAN_TOKEN= .env | cut -d= -f2-)

pnpm install --frozen-lockfile --prefer-offline
VITE_CATSCAN_TOKEN="$TOKEN" pnpm -r build

sudo systemctl restart catscan
echo "deploy: catscan restarted at $REMOTE"
