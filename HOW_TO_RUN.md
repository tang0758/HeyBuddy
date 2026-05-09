# 🚀 快速运行指南 (Quick Run)

每天开始工作时，只需执行以下两步：

### 1. Windows 宿主机 (只需执行一次)
在 Windows 终端启动监听器：
```powershell
node win-notifier-v21.js
```

### 2. WSL 环境 (日常使用)
在 WSL 终端中，先设置代理，然后启动拦截器：
```bash
# 进入目录
cd /mnt/wsl/PHYSICALDRIVE3/gemini/hook

# 注入代理变量
source ./cli-interceptor/proxy.sh

# 运行 Gemini 指令
node index.js gemini "你的指令"
```

---
**提示**：
- 如果点击弹窗后 Gemini 没有立即反应，请检查 Windows 终端是否有报错。
- 建议将 `source ./cli-interceptor/proxy.sh` 加入到 `~/.bashrc` 别名中，更快捷。
