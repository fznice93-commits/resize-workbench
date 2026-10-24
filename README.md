# Resize 图片工作台

两个在 Apple Silicon Mac 上运行的本地图片工作台：多尺寸图片处理与 2000×300 横幅处理。

## 使用

需要 Node.js 22.13 或更高版本。首次从 GitHub 下载后，分别进入两个 Resize 子目录运行 `npm ci` 安装锁定依赖。

回到根目录，双击「打开两个网站.command」启动模拟预览。真实生成前，双击对应「配置Key.command」，在本机网页填写自己的 HiModels Key，再打开「正式使用.command」。真实调用由使用者在页面确认，可能产生费用。

服务只监听本机 127.0.0.1。此仓库不是 GitHub Pages 网站，后端、SQLite、图片处理和 macOS Keychain 不能直接运行在 GitHub Pages 上。

本地数据、图片、日志、密钥和 node_modules 不上传。请勿在 Issues 或提交中粘贴 API Key。
