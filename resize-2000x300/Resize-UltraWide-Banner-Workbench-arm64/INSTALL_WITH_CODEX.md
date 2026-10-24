# 使用 Codex 校验和安装 UltraWide Banner Workbench

本包仅面向 Apple Silicon（arm64）Mac。包内已经包含锁定好的运行依赖和构建产物，普通使用者通常不需要联网安装依赖。

## 解压前校验 ZIP

把 ZIP 与同名 `.sha256` 文件放在同一目录，在终端进入该目录并执行：

```zsh
/usr/bin/shasum -a 256 -c "Resize-UltraWide-Banner-Workbench-arm64-colleague.zip.sha256"
```

必须看到 `OK` 才继续解压。

## 解压后的纯离线校验

双击 `VERIFY_PACKAGE.command`。它只会校验包内文件、Apple Silicon arm64、Prompt、OCR helper，并查找兼容的 Node.js；不会联网、安装、启动服务或访问 Keychain。

## 给 Codex 的建议请求

> 请完整阅读包内 AGENTS.md、README.md 和 INSTALL_WITH_CODEX.md。先运行 VERIFY_PACKAGE.command 做纯离线校验，不要联网、安装、启动正式服务或读取钥匙串。向我报告校验结果和 Node 状态。包内已经包含 node_modules；除非离线校验或启动明确显示依赖损坏，否则不要运行 npm ci。若确实需要联网安装，必须先单独请求我的批准。禁止 npm update 和 npm audit fix，所有 Codex 验证必须 Fake-only。

## 正常使用

1. 双击 `Start UltraWide Production Preview.command`，先完成 Fake 流程。
2. 双击 `Start UltraWide Key Setup.command`，由使用者本人输入自己的 HiModels Key。
3. 双击 `Start UltraWide Production.command`。
4. 每次真实任务都由使用者本人核对模型、调用数量并勾选确认。

Codex 或其他 AI 不得代替使用者输入 Key、读取 Keychain、发起真实模型调用或点击付费确认。

## 仅在依赖确实缺失时重新安装

`INSTALL_AND_TEST.command` 会执行联网 `npm ci`、Prompt 门禁、类型检查、全部 Fake 测试和构建。运行前必须获得使用者对 npm registry 网络访问的单独明确批准。

禁止运行 `npm update`、`npm audit fix` 或 `npm audit fix --force`。安装与测试过程不得启动正式 Provider，不得访问 Keychain。
