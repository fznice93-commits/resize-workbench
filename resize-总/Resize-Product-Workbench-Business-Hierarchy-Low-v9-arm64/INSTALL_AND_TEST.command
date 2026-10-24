#!/bin/zsh
set -eu
ROOT="${0:A:h}"
cd "$ROOT"
export LC_ALL=C
export LANG=C

fail(){ print -u2 -- "安装验证失败：$1"; exit 65; }
[[ "$(/usr/bin/uname -s)" == "Darwin" && "$(/usr/bin/uname -m)" == "arm64" ]] || fail "只允许在Apple Silicon arm64 macOS运行。"
./VERIFY_PACKAGE.command
node_path="$(/bin/zsh scripts/resolve-node.zsh)" || fail "需要Node.js 22.13+。请先获得用户批准再安装。"
node_dir="${node_path:h}"
PATH="$node_dir:$PATH"
export PATH
command -v npm >/dev/null || fail "未找到与兼容Node配套的npm。请先获得用户批准处理Node安装。"

before="$(/usr/bin/shasum -a 256 package-lock.json | /usr/bin/awk '{print $1}')"
if [[ "${RESIZE_INSTALL_DRY_RUN:-0}" == "1" ]]; then
  print -- "DRY_RUN=READY ARCH=arm64 NODE=$($node_path -p 'process.versions.node')"
  print -- "将执行：npm ci；prompt:verify；typecheck；test；build。不会启动服务或访问Keychain/HiModels。"
  exit 0
fi

export RESIZE_RUN_MODE=INSTALL_TEST
export RESIZE_PRODUCT_MODE=INSTALL_TEST
export RESIZE_ENABLE_PRODUCTION_KEYCHAIN=0
export RESIZE_REAL_PROVIDER_ENABLED=0
export RESIZE_FAKE_MODE=1
npm ci
after="$(/usr/bin/shasum -a 256 package-lock.json | /usr/bin/awk '{print $1}')"
[[ "$before" == "$after" ]] || fail "package-lock.json在npm ci后发生变化。"
npm run prompt:verify
npm run typecheck
npm test
npm run build
final="$(/usr/bin/shasum -a 256 package-lock.json | /usr/bin/awk '{print $1}')"
[[ "$before" == "$final" ]] || fail "package-lock.json在验证后发生变化。"
print -- "安装与全Fake验证：PASS。未启动服务；下一步请由用户本人打开Production Preview。"
