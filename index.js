const pty = require('node-pty');
const express = require('express');
const { execSync } = require('child_process');
const http = require('http');

/**
 * WSL 拦截器 (Interceptor)
 * 版本: v2.1 - 增加注入延迟 & 多项选择适配
 */

const VERSION = "v2.1";
const app = express();
const port = 18888;
const WIN_LISTENER_PORT = 19999;

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
        FORCE_COLOR: '1'
    }
});

ptyProcess.onData((data) => process.stdout.write(data));
process.stdin.on('data', (data) => ptyProcess.write(data));
if (process.stdin.isTTY) process.stdin.setRawMode(true);

ptyProcess.onExit(({ exitCode }) => {
    console.log(`\n[Interceptor] Process exited with code ${exitCode}`);
    process.exit(exitCode);
});

const sendNetworkNotification = (callback) => {
    console.log(`[Interceptor] Sending request to Windows host (${HOST_IP}:${WIN_LISTENER_PORT})...`);
    
    const req = http.request({
        hostname: HOST_IP,
        port: WIN_LISTENER_PORT,
        method: 'POST',
        timeout: 120000 
    }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            callback(rawData.trim());
        });
    });

    req.on('error', (e) => {
        console.error(`❌ 无法连接到 Windows 监听程序 (${HOST_IP})。`);
        callback('4');
    });

    req.end();
};

app.post('/trigger-approval', (req, res) => {
    console.log('\n[Interceptor] Received approval request...');
    sendNetworkNotification((choice) => {
        console.log(`[Interceptor] User selected choice: ${choice}. Waiting for CLI to be ready...`);
        // v2.1 核心改进：延迟 1000ms 注入，确保 Gemini 已经准备好接收输入
        setTimeout(() => {
            console.log(`[Interceptor] Injecting choice "${choice}" into PTY.`);
            ptyProcess.write(`${choice}\r`);
        }, 1000);
    });
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log('=========================================');
    console.log(`🚀 WSL 拦截器已启动 [版本: ${VERSION}]`);
    console.log(`监听端口: ${port}`);
    console.log(`目标宿主机 IP: ${HOST_IP}`);
    console.log('=========================================');
});
