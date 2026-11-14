#!/usr/bin/env bash
# Constrói o elenco PS2 inteiro (ou as chaves passadas) em paralelo e comprime com meshopt.
# Uso: tools/chars/lote.sh [saida] [chave...]     (P=3 processos por padrão)
# Brutos e registros ficam em ${FORJA_TMP:-/tmp/forja}; a saída final recebe só os .glb comprimidos.
set -u
cd "$(dirname "$0")/../.."
OUT=${1:-public/models/personagens/ps2}; shift || true
TMP=${FORJA_TMP:-/tmp/forja}
mkdir -p "$OUT" "$TMP"
python3 tools/chars/elenco.py >/dev/null
KEYS=${*:-"$(python3 -c "import json;print(' '.join(json.load(open('tools/chars/elenco.json'))['elenco']))") mob_02_espectro mob_00_fiapo"}
build() {
  k=$1
  if [ "$k" = mob_02_espectro ]; then cmd="python3 tools/chars/criatura.py espectro_lanterna $TMP/$k.glb"
  elif [ "$k" = mob_00_fiapo ]; then cmd="python3 tools/chars/criatura.py fiapo_nevoa $TMP/$k.glb"
  else cmd="python3 tools/chars/build.py tools/chars/elenco.json $TMP/$k.glb $k"; fi
  if $cmd > "$TMP/$k.log" 2>&1 && node tools/pipeline/ps2_post.cjs "$TMP/$k.glb" "$OUT/$k.glb" >> "$TMP/$k.log" 2>&1; then
    echo "ok $k $(du -k "$OUT/$k.glb" | cut -f1) KB"
  else echo "FALHOU $k (ver $TMP/$k.log)"; fi
}
export -f build; export OUT TMP
printf '%s\n' $KEYS | xargs -P "${P:-3}" -I{} bash -c 'build {}'
