---
name: heybuddy
description: 跨平台交互式授权拦截器 v3.6。采用标准嵌套 Hook 结构，确保在 WSL、Ubuntu 及各发行版间的完美兼容。
---

# HeyBuddy 自动化部署指南 (v3.6)

当用户要求安装或配置 HeyBuddy 时，请严格执行以下标准化部署任务：

## 1. 部署核心资产
将该技能包中 `assets/src/` 目录下的所有文件部署到用户指定的目录（默认建议为当前工作区的 `heybuddy-interceptor`）。

## 2. 自动化配置 Hook (核心兼容性逻辑)
请自动修改用户的 `~/.gemini/settings.json` 文件。**必须使用以下标准的嵌套结构**，以确保在不同版本的 Gemini CLI 间兼容：

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "name": "heybuddy-interceptor",
            "type": "command",
            "command": "node <TARGET_DIR>/trigger.js"
          }
        ]
      }
    ]
  }
}
```
*(注意：请将 `<TARGET_DIR>` 替换为实际部署 trigger.js 的绝对路径)*

## 3. 部署成功提示
部署完成后，向用户展示指南：
1. **Windows 侧**：运行 `node win-notifier-v21.js`。
2. **连接配置**：如果是非 WSL 环境，提醒用户设置 `export HEYBUDDY_HOST="Windows_IP:19999"`。
3. **运行**：`node index.js gemini "你的指令"`。
