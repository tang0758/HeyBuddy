# HeyBuddy - CLI Notification Interceptor

本程序旨在解决在 WSL (Windows Subsystem for Linux) 环境中运行 Gemini CLI 时，无法直接在 Windows 宿主机接收交互授权提示的问题。

版本：**v3.5** (灵活配置版)

## 🌟 核心特性

- **灵活网络配置**：支持通过 `HEYBUDDY_HOST` 环境变量手动指定目标 IP 和端口，适配远程服务器或非标准 WSL 网络。
- **像素级原生 UI**：修复了 Windows 下的直角透明层问题，实现真正的 24px 大圆角与高斯模糊阴影。
- **Flutter 原生驱动**：彻底抛弃 Electron 路径 Bug，编译为原生 C++/Win32 机器码。
- **语义化按键映射**：支持 `ESC` 通用取消与 1-4 数字映射，适配所有 CLI 菜单。
- **动态 Prompt 捕捉**：弹窗实时显示 Gemini 当前的提示文字，明确“二次确认”的原因。
- **跨系统通信**：基于稳定 HTTP 协议，完美穿透 WSL 与 Windows 网络。

## 🏗️ 架构说明

1. **WSL Interceptor (`index.js`)**: PTY 包装器，负责监控 CLI 并发送 HTTP 指令。
2. **Windows Native App (`heybuddy-flutter`)**: Flutter 编写的高颜值原生客户端，负责弹窗交互。
3. **Trigger (`trigger.js`)**: 经过增强的 Hook 触发器，支持 Payload 解析。

## 🚀 快速开始

### 1. Windows 宿主机准备
建议在物理机运行：
```powershell
cd E:\aicoding\gemini\hook\heybuddy-flutter
flutter run -d windows
```

### 2. WSL 环境运行
```bash
cd /mnt/wsl/PHYSICALDRIVE3/gemini/hook
source ./cli-interceptor/proxy.sh

# 默认模式 (自动探测 Windows IP)
node index.js gemini "你的指令"

# 自定义模式 (手动指定宿主机 IP 和端口)
export HEYBUDDY_HOST="192.168.1.100:19999"
node index.js gemini "你的指令"
```

## 🛠️ 文件说明
- `index.js`: WSL 拦截器主程序。
- `win-notifier-v21.js`: Windows 弹窗监听器（拷贝至 Windows 运行）。
- `trigger.js`: 触发脚本。
- `cli-interceptor/proxy.sh`: 代理配置脚本。

## 📝 注意事项
- 确保 Windows 防火墙允许 19999 端口的内网访问。
- 如果 Windows 宿主机 IP 发生变化，拦截器会自动通过 `getHostIP()` 重新计算。
- 弹窗采用“系统模态”，会自动置于所有窗口最前方。

---
Created by Gemini CLI Interceptor Setup Agent.
