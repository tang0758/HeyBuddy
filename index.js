const pty = require('node-pty');
const express = require('express');
const { execSync } = require('child_process');
const http = require('http');
const crypto = require('crypto');

/**
 * HeyBuddy WSL 拦截器 (Interceptor)
 * 版本: v3.5 - 增加灵活配置系统 (支持 HEYBUDDY_HOST 环境变量)
 */

const VERSION = "v3.5";
const app = express();
const port = 18888;

const SESSION_ID = crypto.randomBytes(8).toString('hex');

app.use(express.json());

const getHostIP = () => {
    try {
        const hostIp = execSync("grep nameserver /etc/resolv.conf | awk '{print $2}'").toString().trim();
        if (hostIp) return hostIp;
    } catch (e) {}
    try {
        const hostIp = execSync("ip route | grep default | awk '{print $3}'").toString().trim();
        if (hostIp) return hostIp;
    } catch (e) {}
    return '127.0.0.1';
};

// --- 核心改进：配置优先级 (环境变量 > 自动探测) ---
const configHost = process.env.HEYBUDDY_HOST; // 支持 "IP:PORT" 或 "IP"
let HOST_IP;
let WIN_LISTENER_PORT;

if (configHost) {
    const parts = configHost.split(':');
    HOST_IP = parts[0];
    WIN_LISTENER_PORT = parts[1] ? parseInt(parts[1]) : 19999;
} else {
    HOST_IP = getHostIP();
    WIN_LISTENER_PORT = 19999;
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node index.js <command> [args...]');
    process.exit(1);
}

const ptyProcess = pty.spawn(args[0], args.slice(1), {
    name: 'xterm-256color',
    cols: 160,
    rows: 40,
    cwd: process.cwd(),
    env: { 
        ...process.env, 
        TERM: 'xterm-256color', 
        COLORTERM: 'truecolor',
        FORCE_COLOR: '1',
        HEYBUDDY_SESSION_ID: SESSION_ID
    }
});

ptyProcess.onData((data) => process.stdout.write(data));
process.stdin.on('data', (data) => ptyProcess.write(data));
if (process.stdin.isTTY) process.stdin.setRawMode(true);

ptyProcess.onExit(({ exitCode }) => {
    console.log(`\n[HeyBuddy] Process exited with code ${exitCode}`);
    process.exit(exitCode);
});

const sendNetworkNotification = (promptMessage, toolName, callback) => {
    console.log(`[HeyBuddy] 📡 正在发送请求到 Windows 宿主机 (${HOST_IP}:${WIN_LISTENER_PORT})...`);
    
    const postData = JSON.stringify({ message: promptMessage, tool: toolName });

    const req = http.request({
        hostname: HOST_IP,
        port: WIN_LISTENER_PORT,
        path: '/trigger-approval', // 确保路径正确
        method: 'POST',
        timeout: 120000,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        console.log(`[HeyBuddy] 📥 收到 Windows 响应状态码: ${res.statusCode}`);
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            const choice = rawData.trim();
            console.log(`[HeyBuddy] 🆗 用户选择结果: ${choice}`);
            callback(choice);
        });
    });

    req.on('error', (e) => {
        console.error(`[HeyBuddy] ❌ 网络连接失败: ${e.message}`);
        console.error(`请检查：1. Windows 端 HeyBuddy 是否在运行 2. 防火墙是否放行了 19999 端口`);
        callback('CANCEL'); // 失败默认发送取消信号
    });

    req.write(postData);
    req.end();
};

app.post('/trigger-approval', (req, res) => {
    const receivedSessionId = req.body.session_id;

    if (receivedSessionId !== SESSION_ID) {
        console.log(`[HeyBuddy] 🛡️ 拒绝了未授权的请求 (ID 不匹配)`);
        return res.status(403).send('Unauthorized');
    }

    const promptMessage = req.body.message || "请求确认";
    const toolName = req.body.tool || "Unknown";

    console.log('\n[HeyBuddy] 🔔 收到 Gemini 授权 Hook...');
    sendNetworkNotification(promptMessage, toolName, (semanticChoice) => {
        let ptyInput = '';
        switch(semanticChoice) {
            case 'ALLOW':   ptyInput = '1\r'; break;
            case 'SESSION': ptyInput = '2\r'; break;
            case 'MANUAL':
                console.log(`[HeyBuddy] 🔀 进入手动模式，请在终端操作。`);
                return;
            case 'CANCEL':  ptyInput = '\u001b'; break; // ESC 键
            default: ptyInput = '\u001b';
        }

        setTimeout(() => {
            console.log(`[HeyBuddy] ⌨️ 注入指令: ${semanticChoice}`);
            ptyProcess.write(ptyInput);
        }, 1000);
    });
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log('=========================================');
    console.log(`🚀 HeyBuddy WSL 拦截器已启动 [版本: ${VERSION}]`);
    console.log(`会话 ID: ${SESSION_ID}`);
    console.log(`配置来源: ${process.env.HEYBUDDY_HOST ? '环境变量' : '自动探测'}`);
    console.log(`目标宿主机: ${HOST_IP}:${WIN_LISTENER_PORT}`);
    console.log('=========================================');
});
