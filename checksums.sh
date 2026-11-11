#!/bin/sh
# Regenerate kits/checksums.json after replacing a kit zip. shasum -a 256.
cd "$(dirname "$0")/kits" || exit 1
{
  printf '{\n'
  first=1
  for f in *.zip; do
    h=$(shasum -a 256 "$f" | cut -d' ' -f1)
    [ "$first" = 1 ] || printf ',\n'
    printf '  "%s": "%s"' "$f" "$h"
    first=0
  done
  printf '\n}\n'
} > checksums.json
echo "wrote kits/checksums.json"
