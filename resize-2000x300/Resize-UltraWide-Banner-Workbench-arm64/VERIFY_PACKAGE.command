#!/bin/zsh
set -eu
ROOT="${0:A:h}"
cd "$ROOT"
export LC_ALL=C
export LANG=C

fail(){ print -u2 -- "校验失败：$1"; exit 65; }
[[ "$(/usr/bin/uname -s)" == "Darwin" ]] || fail "仅支持macOS。"
architecture="$(/usr/bin/uname -m)"
[[ "$architecture" == "arm64" ]] || fail "本包仅支持Apple Silicon arm64；当前为${architecture}。"
[[ -f PACKAGE_MANIFEST.sha256 ]] || fail "缺少PACKAGE_MANIFEST.sha256。"
while IFS= read -r manifest_line; do
  manifest_path="${manifest_line#*  }"
  [[ -n "$manifest_path" && "$manifest_path" != /* && "$manifest_path" != *"../"* && "$manifest_path" != "PACKAGE_MANIFEST.sha256" ]] || fail "manifest含不安全路径。"
done < PACKAGE_MANIFEST.sha256
/usr/bin/shasum -a 256 -c PACKAGE_MANIFEST.sha256 >/dev/null || fail "包内文件身份不匹配，请停止安装并重新取得分发包。"
while IFS= read -r actual_path; do
  actual_path="${actual_path#./}"
  [[ "$actual_path" == "PACKAGE_MANIFEST.sha256" ]] && continue
  /usr/bin/awk -v expected="$actual_path" 'substr($0,67)==expected{found=1} END{exit !found}' PACKAGE_MANIFEST.sha256 || fail "发现manifest之外的文件：$actual_path"
done < <(/usr/bin/find . -type f -print)
[[ -f src/server/assets/prompts.json && -f scripts/verify-prompts.ts ]] || fail "Prompt门禁资产缺失。"
[[ -f src/server/vision-ocr.swift && -x bin/vision-ocr ]] || fail "Vision OCR源码或可执行文件缺失。"
ocr_arch="$(/usr/bin/file -b bin/vision-ocr)"
[[ "$ocr_arch" == *"arm64"* ]] || fail "Vision OCR可执行文件不是arm64。"

node_status="未找到兼容Node.js 22.13+；请先获得用户批准再安装。"
if node_path="$(/bin/zsh scripts/resolve-node.zsh 2>/dev/null)"; then
  node_version="$($node_path -p 'process.versions.node')"
  node_status="已找到兼容Node v${node_version}。"
fi
print -- "离线包校验：PASS"
print -- "目标架构：arm64"
print -- "$node_status"
print -- "本步骤未联网、未安装、未启动服务、未访问Keychain。"
