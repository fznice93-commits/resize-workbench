# Resize Product Workbench 内部预览版

这是面向内部试用的本地图片尺寸适配工具。一张PNG、JPEG或WebP原图可选择一个或多个已验证尺寸，应用会按选择顺序严格串行处理，并提供单张PNG与成功结果ZIP下载。

版本：`BUILD-006A`；应用build：`BUILD-005B`；Prompt版本：`FROZEN_v1.1`。

## 运行要求

- Apple Silicon (`arm64`) Mac。
- Node.js 22.13.0或更高版本，推荐兼容的Node 24 LTS版本。
- 首次安装依赖需要访问npm registry；必须先由电脑使用者明确批准。
- 本包不包含Node.js或`node_modules`。

## 安装顺序

1. 完整阅读 `INSTALL_WITH_CODEX.md`。
2. 先运行 `VERIFY_PACKAGE.command` 做离线身份、架构和Node检查。
3. Node不合规时，先取得电脑使用者批准再安装。
4. 网络访问获批后运行 `INSTALL_AND_TEST.command`，按lockfile安装并完成全Fake测试与构建。
5. 首先使用 Production Preview 完成无费用试用，再按需进入Key Setup与Production。

## 三个日常入口

- `Start Resize Production Preview.command`：推荐第一个打开。使用内存Key状态与Fake Provider，可体验上传、多尺寸选择、费用摘要、串行进度、结果墙和ZIP下载，不产生模型费用。
- `Start Resize Key Setup.command`：只用于在本机页面保存、更换或删除HiModels Key。Key必须由电脑使用者本人输入；页面不会回显完整值，也不会联网验证或生成图片。
- `Start Resize Production.command`：正式本地流程。每个批次都必须先查看目标尺寸与最多调用次数，再由电脑使用者本人勾选费用确认并提交。

## 使用与安全

- 服务只监听 `127.0.0.1`，原图在正式生成时会发送给HiModels。
- 正式路线固定为GPT Image 2、quality low；任务严格串行，失败后暂停且不会自动重试。
- 不要把Key粘贴到聊天、终端命令、`.env`、日志、URL或浏览器存储中。
- Codex不得索取、读取、粘贴或回显Key，也不得替使用者点击正式费用确认。
- 安装测试不应启动服务、访问Keychain、访问HiModels或产生费用。

## 故障提示

- “仅支持arm64”：确认电脑是Apple Silicon Mac。
- “未找到Node.js 22.13.0或更高版本”：先让Codex解释安装方案，批准后再安装。
- 文件身份校验失败：停止安装，重新获取ZIP与SHA文件，不要尝试绕过。
- `npm ci`失败：只提供脱敏错误信息；不要运行依赖升级或自动修复命令，也不要修改lockfile。
- 生成失败或停止：页面不会自动重试；检查稳定中文错误后，如需继续，由使用者重新确认。
