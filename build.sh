#!/bin/bash
# Build a distributable .zip for Chrome Web Store or GitHub releases.
# Usage: ./build.sh

set -e

VERSION=$(grep '"version"' manifest.json | sed 's/.*: *"\(.*\)".*/\1/')
OUT="dashboard-v${VERSION}.zip"

# Clean previous build
rm -f "$OUT"

# Package only the extension files
zip -r "$OUT" \
  manifest.json \
  index.html \
  style.css \
  app.js \
  background.js \
  icons/ \
  -x "*.DS_Store"

echo ""
echo "Built: $OUT ($(du -h "$OUT" | cut -f1))"
echo ""
echo "To publish:"
echo "  Chrome Web Store: Upload $OUT at https://chrome.google.com/webstore/devconsole"
echo "  GitHub release:   gh release create v${VERSION} $OUT --title \"v${VERSION}\""
