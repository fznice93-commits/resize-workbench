# 使用 Codex 安装 Resize Product Workbench 内部预览版

本包仅面向 Apple Silicon (`arm64`) Mac 内部试用。它不包含 Node.js 或 `node_modules`；安装依赖会访问 npm registry，必须先由你明确批准。

## 解压前校验ZIP

先把ZIP和同名`.sha256`文件放在同一个目录。打开“终端”，先把下面第一行目录替换成这两个文件实际所在目录，再逐行复制执行：

```zsh
cd "/path/to/the-folder-containing-both-files"
/usr/bin/shasum -a 256 -c "Resize-Product-Workbench-Internal-Preview-arm64.zip.sha256"
```

必须看到 `Resize-Product-Workbench-Internal-Preview-arm64.zip: OK` 才能继续解压。该命令使用macOS自带的`/usr/bin/shasum`，不需要额外哈希工具。

## 给 Codex 的固定请求

解压 ZIP，在 Codex 中把解压后的 `Resize-Product-Workbench-Internal-Preview-arm64` 目录设为工作区，然后粘贴：

> 请完整阅读包内 AGENTS.md 和 INSTALL_WITH_CODEX.md。先运行 VERIFY_PACKAGE.command 做纯离线校验，不要联网、安装、启动服务或读取钥匙串。向我报告校验结果和 Node 状态；如需安装 Node 或运行联网 npm ci，先单独请求我的批准。获批后只运行 INSTALL_AND_TEST.command，禁止 npm update/audit fix，所有验证必须 Fake-only。安装通过后先指导我本人双击 Production Preview 完成 Fake 流程；不要替我输入 Key 或点击正式付费确认。

## 安装流程

1. 双击或由 Codex运行 `VERIFY_PACKAGE.command`。该步骤只校验包内文件、目标架构、Prompt资产身份与Node状态，不联网、不修改系统、不启动应用。
2. 如果未找到 Node.js 22.13+，由 Codex解释选择；只有你批准后才安装兼容版本。推荐 Node 24 LTS兼容版本。
3. 只有你批准 npm registry 网络访问后，运行 `INSTALL_AND_TEST.command`。脚本只执行 `npm ci`、Prompt门禁、typecheck、全Fake常规测试和build，并核对安装前后lockfile SHA不变。
4. 测试通过后，先双击 `Start Resize Production Preview.command`：上传一张自己的测试图，选择多个尺寸，确认Fake批次串行完成并下载ZIP。Preview不读取生产Keychain、不访问HiModels、不产生费用。
5. 需要真实使用时，由你本人双击 `Start Resize Key Setup.command`，只在本机127.0.0.1页面中亲自输入Key。不要把Key发送给Codex或粘贴到聊天。
6. 最后双击 `Start Resize Production.command`。每个真实批次都必须由你本人检查费用摘要、勾选确认并点击；失败不会自动重试。

不要运行 `npm update`、`npm audit fix` 或 `npm audit fix --force`。不要把错误截图中的个人路径、图片或秘密发送给他人；只提供脱敏错误代码。
