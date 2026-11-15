#!/bin/sh
set -eu
cd "$(dirname "$0")"
runtime="../../work/runtime/node/bin"
if [ -x "$runtime/node" ]; then
  PATH="$(cd "$runtime" && pwd):$PATH"
  export PATH
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Install Node.js 24 LTS with npm, then run this script again." >&2
  exit 1
fi
if [ ! -x node_modules/.bin/vite ]; then
  npm ci
fi
exec npm run dev -- --host 127.0.0.1
