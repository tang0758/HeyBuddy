const pty = require('node-pty');
const express = require('express');
const { execSync } = require('child_process');
const http = require('http');
const crypto = require('crypto');
const os = require('os');
const path = require('path');

/**
 * HeyBuddy 跨平台拦截器 (Interceptor)
 * 版本: v3.9 - 修复 Windows Error 193 (通过 Shell 转发指令)
 */

const VERSION = "v3.9";
const app = express();
const port = 18888;
const IS_WIN = os.platform() === 'win32';

const SESSION_ID = crypto.randomBytes(8).toString('hex');

app.use(express.json());

const getHostIP = () => {
    if (IS_WIN) return '127.0.0.1';
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

// 获取 Windows 系统的 Shell (通常是 cmd.exe)
const getShell = () => {
    return IS_WIN ? (process.env.ComSpec || 'cmd.exe') : 'bash';
};

const HOST_IP = getHostIP();
const WIN_LISTENER_PORT = 19999;

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node index.js <command> [args...]');
    process.exit(1);
}

// --- 核心修复逻辑 ---
let executable;
let ptyArgs;

if (IS_WIN) {
    // Windows 下：启动 cmd.exe，并利用 /c 执行原始指令及其所有参数
    executable = getShell();
    // 将所有参数拼接成一个完整的字符串
    const fullCommand = args.join(' ');
    ptyArgs = ['/c', fullCommand];
    console.log(`[HeyBuddy] Windows 环境：通过 Shell 转发指令 -> ${fullCommand}`);
} else {
    // Linux/WSL 下：保持原样
    executable = args[0];
    ptyArgs = args.slice(1);
}

const ptyProcess = pty.spawn(executable, ptyArgs, {
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

if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

ptyProcess.onExit(({ exitCode }) => {
    console.log(`\n[HeyBuddy] Process exited with code ${exitCode}`);
    process.exit(exitCode);
});

const sendNetworkNotification = (promptMessage, toolName, callback) => {
    console.log(`[HeyBuddy] 📡 正在发送请求到 Windows 宿主机 (${HOST_IP}:${WIN_LISTENER_PORT})...`);
    const postData = JSON.stringify({ message: promptMessage, tool: toolName });
    const req = http.request({
        hostname: HOST_IP, port: WIN_LISTENER_PORT, path: '/trigger-approval', method: 'POST',
        timeout: 120000,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => { callback(rawData.trim()); });
    });
    req.on('error', (e) => {
        console.error(`[HeyBuddy] ❌ 网络连接失败: ${e.message}`);
        callback('CANCEL');
    });
    req.write(postData);
    req.end();
};

app.post('/trigger-approval', (req, res) => {
    if (req.body.session_id !== SESSION_ID) return res.status(403).send('Unauthorized');
    console.log('\n[HeyBuddy] 🔔 收到 Gemini 授权 Hook...');
    sendNetworkNotification(req.body.message, req.body.tool, (semanticChoice) => {
        let ptyInput = '';
        switch(semanticChoice) {
            case 'ALLOW':   ptyInput = '1\r'; break;
            case 'SESSION': ptyInput = '2\r'; break;
            case 'MANUAL':  console.log(`[HeyBuddy] 🔀 已交回控制权。`); return;
            case 'CANCEL':  ptyInput = '\u001b'; break;
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
    console.log(`🚀 HeyBuddy 拦截器已启动 [版本: ${VERSION}]`);
    console.log(`运行平台: ${os.platform()}`);
    console.log(`会话 ID: ${SESSION_ID}`);
    console.log(`配置来源: ${process.env.HEYBUDDY_HOST ? '环境变量' : (IS_WIN ? '本地模式' : '自动探测')}`);
    console.log(`目标宿主机: ${HOST_IP}:${WIN_LISTENER_PORT}`);
    console.log('=========================================');
});
