#!/usr/bin/env sh
set -eu

# Legacy build script for Cloudflare Pages (static deploy).
# For the Node.js backend, use: npm start
# This script prepares the dist/ directory for static hosting.

rm -rf dist
mkdir -p dist

cp index.html dist/index.html
cp pronxt-logo.svg dist/pronxt-logo.svg

for directory in dashboard settings accounts get-accounts profile about support privacy terms copyright changelog status docs route-assets; do
  cp -R "$directory" "dist/$directory"
done

echo "Cloudflare Pages output prepared in dist/"
