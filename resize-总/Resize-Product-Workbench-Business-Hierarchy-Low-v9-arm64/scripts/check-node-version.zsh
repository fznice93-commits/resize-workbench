#!/bin/zsh
set -eu

if [[ $# -ne 1 || ! -x "$1" ]]; then
  print -u2 "Resize Product Workbench requires an executable Node.js binary."
  exit 64
fi

node_bin="$1"
version="$($node_bin -p 'process.versions.node' 2>/dev/null)" || {
  print -u2 "Unable to read the selected Node.js version."
  exit 65
}

if [[ ! "$version" =~ '^([0-9]+)\.([0-9]+)\.([0-9]+)' ]]; then
  print -u2 "Unable to parse the selected Node.js version: $version"
  exit 65
fi

major="${match[1]}"
minor="${match[2]}"
if (( major < 22 || (major == 22 && minor < 13) )); then
  print -u2 "Resize Product Workbench requires Node.js 22.13.0 or newer; selected Node.js is v$version."
  print -u2 "Install a supported Node.js version or set RESIZE_NODE_BIN to its node executable."
  exit 66
fi

print -r -- "$version"
