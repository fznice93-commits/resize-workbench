#!/bin/zsh
set -u

typeset -a candidates labels reports seen
if [[ -n "${RESIZE_NODE_BIN:-}" ]]; then
  candidates+=("$RESIZE_NODE_BIN")
  labels+=("RESIZE_NODE_BIN")
fi
path_node="$(command -v node 2>/dev/null || true)"
if [[ -n "$path_node" ]]; then
  candidates+=("$path_node")
  labels+=("PATH")
fi
user_home="${HOME:-}"
if [[ -n "$user_home" ]]; then
  candidates+=(
    "$user_home/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
    "$user_home/.nvm/current/bin/node"
    "$user_home/.local/share/fnm/current/bin/node"
    "$user_home/.volta/bin/node"
  )
  labels+=("Codex bundled runtime" "nvm current" "fnm current" "Volta")
fi
candidates+=("/opt/homebrew/bin/node" "/usr/local/bin/node")
labels+=("Homebrew Apple Silicon" "Homebrew/系统 PATH")

for (( index=1; index<=${#candidates}; index++ )); do
  candidate="${candidates[$index]}"
  label="${labels[$index]}"
  absolute="${candidate:A}"
  if (( ${seen[(Ie)$absolute]} )); then
    continue
  fi
  seen+=("$absolute")
  if [[ ! -x "$absolute" ]]; then
    reports+=("- $label：$absolute（不存在或不可执行）")
    continue
  fi
  version="$($absolute -p 'process.versions.node' 2>/dev/null)"
  if [[ $? -ne 0 ]]; then
    reports+=("- $label：$absolute（无法读取版本）")
    continue
  fi
  if [[ ! "$version" =~ '^([0-9]+)\.([0-9]+)\.([0-9]+)' ]]; then
    reports+=("- $label：$absolute（版本格式无法识别：$version）")
    continue
  fi
  major="${match[1]}"
  minor="${match[2]}"
  if (( major < 22 || (major == 22 && minor < 13) )); then
    reports+=("- $label：$absolute（v$version，低于22.13.0）")
    continue
  fi
  print -r -- "$absolute"
  exit 0
done

print -u2 "未找到可用的Node.js 22.13.0或更高版本。"
print -u2 "已检查候选："
for report in "${reports[@]}"; do
  print -u2 -r -- "$report"
done
print -u2 "请安装Node.js 22.13+，或将RESIZE_NODE_BIN设为兼容node的绝对路径后重试。"
exit 66
