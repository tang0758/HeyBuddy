# Gemini CLI Notification Interceptor (WSL-to-Host)

本程序旨在解决在 WSL (Windows Subsystem for Linux) 环境中运行 Gemini CLI 时，无法直接在 Windows 宿主机接收交互授权提示的问题。

版本：**v2.1** (最终稳定版)

## 🌟 核心特性

- **跨系统通信**：利用网络 (HTTP) 协议，绕过不稳定的 WSL Interop 限制，实现 WSL -> Windows 的精准弹窗。
- **多项选择支持**：完美适配 Gemini CLI 的 4 选项菜单 (1. Allow once, 2. Allow for session, etc.)。
- **防止中文乱码**：Windows 端采用 HTA (HTML Application) 技术，支持 UTF-16 编码，中文显示清爽无乱码。
- **延迟注入技术**：针对 PTY 渲染特性，自动延迟指令注入，确保 CLI 100% 接收到授权信号。
- **精美终端体验**：强制开启 256 色/真彩色支持。

## 🏗️ 架构说明

1. **WSL Interceptor (`index.js`)**: 作为一个 PTY 包装器启动 Gemini CLI，监听来自 CLI 的 Hook 信号。
2. **Windows Notifier (`win-notifier-v21.js`)**: 运行在 Windows 宿主机的极简 HTTP 服务器，接收信号并弹出 HTA 网页对话框。
3. **Trigger (`trigger.js`)**: Gemini CLI 的 Notification Hook 脚本。

## 🚀 快速开始

### 1. Windows 宿主机准备
确保已安装 Node.js。在 Windows 终端中运行：
```bash
node win-notifier-v21.js
```
启动后会显示 `🚀 Windows 通知监听器已启动 [版本: v2.1]`。

### 2. WSL 环境配置
进入项目目录并安装依赖：
```bash
cd /mnt/wsl/PHYSICALDRIVE3/gemini/hook
npm install
```

### 3. 配置 Gemini CLI Hook
修改 WSL 里的 `~/.gemini/settings.json`，添加以下内容：
```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "ToolPermission",
        "hooks": [
          {
            "name": "gui-interceptor",
            "type": "command",
            "command": "node /mnt/wsl/PHYSICALDRIVE3/gemini/hook/trigger.js"
          }
        ]
      }
    ]
  }
}
```

### 4. 运行
在 WSL 终端中启动：
```bash
source ./cli-interceptor/proxy.sh
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
