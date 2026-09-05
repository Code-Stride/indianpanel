#!/usr/bin/env sh
set -eu

rm -rf dist
mkdir -p dist

cp index.html dist/index.html
cp pronxt-logo.svg dist/pronxt-logo.svg
touch dist/.nojekyll

for directory in dashboard settings accounts get-accounts profile about support privacy terms copyright changelog status docs route-assets logo-options; do
  if [ -d "$directory" ]; then
    cp -R "$directory" "dist/$directory"
  fi
done

echo "Pages output prepared in dist/"
