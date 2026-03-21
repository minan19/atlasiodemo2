#!/usr/bin/env bash

# Simple smoke test for atlasio API in prod mode.
# Assumes apps/api/.env exists and has JWT_SECRET and API_PORT (default 4000).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/apps/api"
API_PORT=${API_PORT:-4000}

if [ ! -f "$API_DIR/.env" ]; then
  echo "apps/api/.env bulunamadı" >&2
  exit 1
fi

# JWT token üret
SECRET=$(grep '^JWT_SECRET=' "$API_DIR/.env" | cut -d= -f2-)
if [ -z "$SECRET" ]; then
  echo "JWT_SECRET boş" >&2
  exit 1
fi

# jsonwebtoken bağımlılığı apps/api altında; yoksa uyar
if [ ! -d "$API_DIR/node_modules/jsonwebtoken" ]; then
  echo "jsonwebtoken bulunamadı. Şu komutu çalıştırın:" >&2
  echo "  pnpm --filter @atlasio/api install" >&2
  exit 1
fi

TOKEN=$(NODE_PATH="$API_DIR/node_modules" SECRET="$SECRET" node -e 'const jwt=require("jsonwebtoken");console.log(jwt.sign({id:"u1",role:"ADMIN",roles:["ADMIN"]}, process.env.SECRET,{expiresIn:"15m"}));')

hdr=(-H "Authorization: Bearer $TOKEN")
base="http://localhost:${API_PORT}"

echo "# health"
curl -sf "$base/health" | jq .

echo "# stream insights"
curl -sf "${hdr[@]}" "$base/reports/stream/insights" | jq .

echo "# instructors insights"
curl -sf "${hdr[@]}" "$base/reports/instructors/insights" | jq .

echo "# export USERS"
REQ=$(curl -sf -X POST "${hdr[@]}" "$base/reports/exports/USERS/request" | jq -r '.requestId')
echo "requestId=$REQ"
curl -sf "${hdr[@]}" "$base/reports/exports/$REQ" | jq .
curl -sfL "${hdr[@]}" "$base/reports/exports/$REQ/download" | head

echo "# security summary"
curl -sf "${hdr[@]}" "$base/security/summary" | jq .

echo "Smoke test tamamlandı"
