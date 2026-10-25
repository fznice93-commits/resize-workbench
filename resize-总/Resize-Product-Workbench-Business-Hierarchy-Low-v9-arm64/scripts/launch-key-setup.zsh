#!/bin/zsh
set -eu
script_dir="${0:A:h}"
project_dir="${script_dir:h:A}"
entry="$project_dir/dist-server/server/main.js"
if [[ ! -f "$project_dir/package.json" ]] || ! /usr/bin/grep -q '"name":"resize-product-workbench"' "$project_dir/package.json"; then print -u2 "启动失败：应用目录身份不正确：$project_dir"; exit 69; fi
if [[ ! -f "$entry" ]]; then print -u2 "启动失败：缺少已构建入口：$entry。请先完成应用构建。"; exit 70; fi
node_bin="$($script_dir/resolve-node.zsh)"
export RESIZE_REAL_PROVIDER_ENABLED=0 RESIZE_KEY_SETUP_ONLY=1 RESIZE_DATA_NAMESPACE=KEY_SETUP RESIZE_RUN_MODE=PRODUCTION RESIZE_ENABLE_PRODUCTION_KEYCHAIN=EXPLICITLY_AUTHORIZED RESIZE_PRODUCT_MODE=KEY_SETUP RESIZE_FAKE_MODE=0
if [[ "${RESIZE_LAUNCH_DRY_RUN:-0}" == "1" ]]; then print -r -- "NODE=$node_bin"; print -r -- "ENTRY=$entry"; print -r -- "MODE=PRODUCTION_KEY_SETUP_ONLY"; print -r -- "KEYCHAIN=MACOS_KEYCHAIN"; print -r -- "PROVIDER=DISABLED"; print -r -- "DATA_NAMESPACE=KEY_SETUP"; print -r -- "STATUS=READY"; exit 0; fi
cd "$project_dir"
exec "$node_bin" "$entry"
