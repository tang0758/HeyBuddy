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

## 阶段四：跨平台桌面客户端演进 (已完成) ✅
- [x] 初始化基于 Flutter 的 `heybuddy-flutter` 架构。
- [x] 实现原生异步 HTTP 服务器 (Shelf) 监听 19999 端口。
- [x] 使用 `window_manager` 实现原生窗口置顶与自动聚焦。
- [x] 适配 Material 3 风格，实现高颜值呼吸灯待机与动态授权界面。
- [x] 解决 Windows 本地网络代理与防火墙导致的通讯瓶颈。
- [x] 验证 WSL -> Windows Flutter 原生授权流程 100% 成功。
- [x] (可选) 增加自定义系统托盘图标支持。

## 阶段五：发布与维护 (进行中) 🚀
- [ ] 导出最终的 Flutter Windows Release 版本 (.exe)。
- [ ] 更新 GitHub 仓库说明与部署指南。
- [ ] 尝试在 MacOS 环境下编译并运行测试。
