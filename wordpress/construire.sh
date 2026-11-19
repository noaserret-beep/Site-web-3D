#!/usr/bin/env bash
# Construit l'extension WordPress prête à installer : dist/maison-mellow-3d.zip
# (l'extension contient le site complet dans son dossier "site/")
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist/maison-mellow-3d
rm -rf dist
mkdir -p "$OUT/site"
cp -r wordpress/maison-mellow-3d/. "$OUT/"
cp -r index.html css js assets vendor README.md "$OUT/site/"
python3 - <<'PY'
import os, zipfile
with zipfile.ZipFile('dist/maison-mellow-3d.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk('dist/maison-mellow-3d'):
        for f in files:
            path = os.path.join(root, f)
            z.write(path, os.path.relpath(path, 'dist'))
PY
echo "Extension prête : dist/maison-mellow-3d.zip"
