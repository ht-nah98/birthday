#!/usr/bin/env bash
# assets/src/pNN.jpg + assets/cut/pNN.png → assets/web/pNN.jpg, cNN.webp (ImageMagick)
set -euo pipefail; cd "$(dirname "$0")/.."; mkdir -p assets/web
for f in assets/src/p*.jpg; do convert "$f" -auto-orient -resize '2048x2048>' -quality 92 "assets/web/$(basename "$f")"; done
for f in assets/cut/p*.png; do n=$(basename "$f" .png); convert "$f" -resize '1600x1600>' "assets/web/c${n#p}.webp"; done
