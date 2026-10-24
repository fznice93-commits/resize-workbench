# 2000×300 UltraWide Banner Workbench

这是与现有 Resize Product Workbench 完全隔离的 macOS 本地平台，只处理严格 `2000×300 px` 的超宽横幅。

## 使用条件

- Apple Silicon（arm64）Mac。
- Node.js `22.13.0` 或更高版本；推荐 Node 24。
- 压缩包已包含当前锁定的 `node_modules`，正常使用不需要运行 `npm ci`。
- 每位使用者必须在自己的 Mac 上配置自己的 HiModels Key。

## 模型

- `gpt-image-2`
- `gemini-3.1-flash-lite-image`
- `gemini-3.1-flash-image`
- `gemini-3-pro-image`

每个任务只能选择一个模型，最多调用一次。失败立即停止，不会自动重试、自动降级或切换模型。

## Gemini 3.1 Flash Image 管线

1. 只向模型请求其原生 `8:1 / 1K` 横向画幅，不发送 `2000×300` 或 `20:3`。
2. Prompt要求模型在一次调用中选择适合原图的超宽构图策略，并将语义内容放在安全区域。
3. 本地根据实际返回尺寸计算中央最大整数 `20:3` 裁切区域。
4. 使用高质量缩放输出严格 `2000×300 PNG`。
5. 本地检查尺寸、边缘残片，以及关键数字、URL、品牌文字的缺失或异常重复。

模型可返回 Sharp 能解码的 PNG、JPEG 或 WebP；本地最终结果始终为严格 `2000×300 PNG`。

## 推荐启动顺序

1. 双击 `VERIFY_PACKAGE.command`，确认显示“离线包校验：PASS”。
2. 双击 `Start UltraWide Production Preview.command` 完成 Fake 流程。Preview 不联网、不读取 Keychain、不产生费用。
3. 双击 `Start UltraWide Key Setup.command`，由使用者本人在本机页面输入自己的 HiModels Key。页面不会回显 Key。
4. 双击 `Start UltraWide Production.command` 进行正式使用。
5. 每次真实调用前，由使用者本人核对模型和调用次数，亲自勾选付费确认。

不要把 Key 发送给 Codex、聊天、同事、日志或截图。不同同事之间不共享 Keychain 数据。

## 失败与本地复检

如果模型已经返回图片，但本地后处理或质量门禁失败，页面可能提供“仅重新本地校验”：

- 复用已保存的中间图；
- 不访问 Provider；
- 不读取 Key；
- 不产生新的模型调用或费用；
- 不会修改或修复不合格图片；
- 只有通过当前全部门禁后才会提供下载。

## 数据与隐私

- 服务只监听 `127.0.0.1`。
- Key 保存在独立的 macOS Keychain 服务中。
- 任务图片、日志和数据库不包含在本分发包内。
- 安全记录只保留必要的返回格式、尺寸和检查计数，不记录图片、Key 或 OCR 文字。
- 任务文件按本地保留策略清理。

## 开发或重新安装依赖

只有在确实需要重新安装或开发验证时，才阅读 `INSTALL_WITH_CODEX.md` 并运行 `INSTALL_AND_TEST.command`。该流程会执行联网 `npm ci`，必须由使用者明确批准。禁止运行 `npm update` 或 `npm audit fix`。
