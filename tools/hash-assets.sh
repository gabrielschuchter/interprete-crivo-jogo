#!/usr/bin/env bash
# Gera docs/game/assets-sha256.txt: um hash por arquivo publicado em public/, para auditoria e atualização.
# Uso: bash tools/hash-assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
( cd public && find audio models textures -type f | LC_ALL=C sort | xargs sha256sum ) > docs/game/assets-sha256.txt
wc -l docs/game/assets-sha256.txt
