# HeyBuddy 项目代办清单 (Tasks)

以下是 HeyBuddy 技能化与跨平台桌面版的实施状态追踪：

## 阶段一：核心架构开发 (已完成) ✅
- [x] 研究 Gemini CLI Hook 机制与 PTY 交互原理。
- [x] 开发 WSL 侧 `index.js` PTY 拦截器。
- [x] 开发 Windows 侧 `win-notifier-v21.js` (HTA UI)。
- [x] 实现基于 HTTP 的跨系统通知通信。
- [x] 解决 PTY `powershell.exe` 调用失效及 256色 兼容问题。
- [x] 实现 `trigger.js` 传递动态 Prompt 文字。
- [x] 实现 `ESC` 键通用取消与 1-4 数字语义映射。
- [x] 实现 Session ID 进程隔离与 30 秒静默期 (Bypass 模式)。

## 阶段二：版本化与 Git 提交 (已完成) ✅
- [x] 梳理项目结构，移除无用的调试与模板文件。
- [x] 添加 `README.md` 与 `HOW_TO_RUN.md` 文档。
- [x] 初始化本地 Git 仓库并完成多轮增量提交。
- [x] 将项目重命名为更具泛用性的 "HeyBuddy"。
- [x] 推送代码至 GitHub 远程仓库 (`tang0758/HeyBuddy.git`)。

## 阶段三：自动化技能封装 (已完成) ✅
- [x] 运用 `skill-creator` 工具链初始化 `heybuddy-skill`。
- [x] 将核心代码整合至技能的 `assets/src/` 资产目录中。
- [x] 编写 `SKILL.md` 指导 Gemini CLI 进行环境准备、Hook 注入及 npm 安装。
- [x] 打包生成 `heybuddy.skill` 压缩包。
- [x] 将打包文件提交至仓库的 `release/` 目录。

## 阶段四：跨平台桌面客户端演进 (进行中) 🚀
- [x] 初始化基于 Electron 的 `heybuddy-desktop` 目录结构。
- [x] 编写 `main.js` (后台托盘+HTTP 服务) 与 `preload.js` (IPC 桥接)。
- [x] 编写支持 Windows 11 Fluent 风格的 `index.html` 极美前端交互界面。
- [x] 配置 `package.json` 的 `electron-builder` 构建脚本。
- [ ] 解决 Windows 本地网络代理导致的 Electron 二进制包下载损坏问题 (`zip: not a valid zip file`)。
- [ ] 成功执行 `npm run build:win` 生成独立的 `.exe` 安装包。
- [ ] 测试生成的桌面版能否静默待在系统托盘，并准确响应 WSL 发来的弹窗请求。
- [ ] (可选) 增加自定义系统托盘图标 (`icon.png`/`icon.ico`)。
