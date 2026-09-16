#!/usr/bin/env sh
# Copies this plugin into Cursor's local plugin folder for testing.
# Cursor ignores symlinks that point outside ~/.cursor/plugins/local, so this makes a real copy.
set -eu
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${HOME}/.cursor/plugins/local/findymail"
mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SRC"/. "$DEST"/
rm -rf "$DEST/.git" "$DEST/.github" "$DEST/node_modules"
echo "Installed to $DEST. Restart Cursor (or reload the window) and start a new agent thread."
