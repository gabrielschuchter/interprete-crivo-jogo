#!/usr/bin/env bash
# Tons de pele dos protagonistas: assa a pele caucasiana, asiática e africana do MakeHuman (CC0) na UV da proxy
# feminina e masculina e mistura numa escala de cinco tons em public/textures/ps2/pele/<fem|masc>_<0..4>.webp.
set -eu
cd "$(dirname "$0")/../.."
TMP=${FORJA_TMP:-/tmp/forja}/pele; mkdir -p "$TMP"
python3 tools/chars/elenco.py >/dev/null
assa() {  # corpo nome pele_mh
  FORJA_PELE_OUT="$TMP/$1_$2.png" FORJA_EXTRA="{\"corpo\":{\"pele\":\"$3\"}}" \
    python3 tools/chars/build.py tools/chars/elenco.json "$TMP/$1_$2.glb" "player_$1_curto" > "$TMP/$1_$2.log" 2>&1 \
    && echo "ok $1 $2" || { echo "FALHOU $1 $2 (ver $TMP/$1_$2.log)"; return 1; }
}
assa fem caucasiana young_caucasian_female & assa fem asiatica young_asian_female & assa fem africana young_african_female &
assa masc caucasiana young_caucasian_male & assa masc asiatica young_asian_male & assa masc africana young_african_male &
wait
python3 tools/chars/peles.py "$TMP" public/textures/ps2/pele
