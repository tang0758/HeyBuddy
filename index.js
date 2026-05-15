const pty = require('node-pty');
const express = require('express');
const { execSync } = require('child_process');
const http = require('http');
const crypto = require('crypto');
const os = require('os');
const path = require('path');

/**
 * HeyBuddy 跨平台拦截器 (Interceptor)
 * 版本: v3.8 - 完美支持 Windows/Linux/WSL 全平台
 * 修复: Windows 下的进程启动寻址问题
 */

const VERSION = "v3.8";
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

const getExecutable = (cmd) => {
    if (!IS_WIN) return cmd;
    try {
        const fullPath = execSync(`where ${cmd}`).toString().split('\r\n')[0].trim();
        return fullPath;
    } catch (e) {
        return cmd.toLowerCase().endsWith('.cmd') ? cmd : `${cmd}.cmd`;
    }
};

const configHost = process.env.HEYBUDDY_HOST;
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

const executable = getExecutable(args[0]);

const ptyProcess = pty.spawn(executable, args.slice(1), {
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
            ptyProcess.write(ptyInput);
        }, 1000);
    });
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log('=========================================');
    console.log(`🚀 HeyBuddy 拦截器已启动 [版本: ${VERSION}]`);
    console.log(`会话 ID: ${SESSION_ID}`);
    console.log(`运行平台: ${os.platform()}`);
    console.log(`目标宿主机: ${HOST_IP}:${WIN_LISTENER_PORT}`);
    console.log('=========================================');
});
