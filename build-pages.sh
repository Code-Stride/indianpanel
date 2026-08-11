#!/usr/bin/env sh
set -eu

rm -rf dist
mkdir -p dist

cp index.html dist/index.html
cp pronxt-logo.svg dist/pronxt-logo.svg

for directory in dashboard settings accounts get-accounts profile about support privacy terms copyright changelog status docs route-assets; do
  cp -R "$directory" "dist/$directory"
done

echo "Cloudflare Pages output prepared in dist/"
