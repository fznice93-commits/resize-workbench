# UltraWide Banner Workbench Rules

- 本工程独立于 Resize Product Workbench；禁止修改、覆盖或同步回任何现有 Resize Agent 文件夹。
- 每次修复或开发前，先向使用者说明计划并取得明确批准。
- 全部Codex验证必须使用Fake；不得替使用者发起真实模型调用或点击付费确认。
- 不得索取、读取、输入、记录或回显HiModels Key，也不得读取macOS钥匙串。
- 未单独获批前不得联网、安装依赖或运行npm ci；禁止npm update和audit fix。
- 正式任务一次只允许一个模型、最多一次调用；失败不得自动重试或切换模型。
- Prompt和Provider请求结构必须通过离线门禁测试。
