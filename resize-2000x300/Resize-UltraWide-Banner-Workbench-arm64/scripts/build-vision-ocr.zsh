#!/bin/zsh
set -eu

ROOT="${0:A:h:h}"
SOURCE="$ROOT/src/server/vision-ocr.swift"
OUTPUT="$ROOT/bin/vision-ocr"
MODULE_CACHE="$ROOT/bin/.vision-ocr-module-cache"
cleanup(){ /bin/rm -rf "$MODULE_CACHE" }
trap cleanup EXIT INT TERM

[[ "$(/usr/bin/uname -s)" == "Darwin" ]] || {
  print -u2 -- "Vision OCR 仅支持 macOS。"
  exit 65
}
[[ -f "$SOURCE" ]] || {
  print -u2 -- "缺少 Vision OCR 源文件。"
  exit 66
}

/bin/mkdir -p "$ROOT/bin"
/bin/mkdir -p "$MODULE_CACHE"
/usr/bin/xcrun swiftc -O -module-cache-path "$MODULE_CACHE" -framework Vision -framework ImageIO -framework CoreGraphics "$SOURCE" -o "$OUTPUT"
/bin/chmod 755 "$OUTPUT"
print -- "Vision OCR helper build PASS"
