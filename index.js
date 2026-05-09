const pty = require('node-pty');
const express = require('express');
const { execSync } = require('child_process');
const http = require('http');
const crypto = require('crypto');

/**
 * HeyBuddy WSL 拦截器 (Interceptor)
 * 版本: v2.4 - 接收动态提示信息并转发给 Windows
 */

const VERSION = "v2.4";
const app = express();
const port = 18888;
const WIN_LISTENER_PORT = 19999;

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

const HOST_IP = getHostIP();

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
    console.log(`[HeyBuddy] Sending request to Windows host (${HOST_IP}:${WIN_LISTENER_PORT})...`);
    
    const postData = JSON.stringify({ message: promptMessage, tool: toolName });

    const req = http.request({
        hostname: HOST_IP,
        port: WIN_LISTENER_PORT,
        method: 'POST',
        timeout: 120000,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            callback(rawData.trim());
        });
    });

    req.on('error', (e) => {
        console.error(`❌ 无法连接到 Windows 监听程序 (${HOST_IP})。`);
        callback('CANCEL');
    });

    req.write(postData);
    req.end();
};

let muteUntil = 0; // 静默期时间戳

app.post('/trigger-approval', (req, res) => {
    const receivedSessionId = req.body.session_id;

    if (receivedSessionId !== SESSION_ID) {
        return res.status(403).send('Unauthorized');
    }

    // 检查是否处于静默期 (Manual 模式后)
    if (Date.now() < muteUntil) {
        console.log('\n[HeyBuddy] 🔕 拦截器当前处于静默期 (Manual Mode)。已跳过 Windows 弹窗，请在终端内完成操作。');
        return res.sendStatus(200);
    }

    const promptMessage = req.body.message || "请求操作";
    const toolName = req.body.tool || "Unknown";

    console.log('\n[HeyBuddy] Received authorized approval request...');
    sendNetworkNotification(promptMessage, toolName, (semanticChoice) => {
        console.log(`[HeyBuddy] User chose: ${semanticChoice}. Mapping to PTY input...`);
        
        let ptyInput = '';
        switch(semanticChoice) {
            case 'ALLOW':   ptyInput = '1\r'; break;
            case 'SESSION': ptyInput = '2\r'; break;
            case 'MANUAL':
                // 设置 30 秒的静默期
                muteUntil = Date.now() + 30000;
                console.log(`\n[HeyBuddy] 🔀 已交回控制权。未来 30 秒内 HeyBuddy 将保持静默，请直接在 WSL 终端中完成所有的手动选项（包括打开编辑器的二次确认）。`);
                return; // 直接返回，不向 PTY 注入任何字符
            case 'CANCEL':  ptyInput = '\u001b'; break; // ESC 键
            default: ptyInput = '\u001b';
        }

        setTimeout(() => {
            console.log(`[HeyBuddy] Injecting "${semanticChoice}" into PTY.`);
            ptyProcess.write(ptyInput);
        }, 1000);
    });
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log('=========================================');
    console.log(`🚀 HeyBuddy WSL 拦截器已启动 [版本: ${VERSION}]`);
    console.log(`会话 ID: ${SESSION_ID}`);
    console.log(`监听端口: ${port}`);
    console.log(`目标宿主机 IP: ${HOST_IP}`);
    console.log('=========================================');
});
