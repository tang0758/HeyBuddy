const pty = require('node-pty');
const express = require('express');
const { execSync } = require('child_process');
const http = require('http');
const crypto = require('crypto');

/**
 * HeyBuddy WSL 拦截器 (Interceptor)
 * 版本: v2.3 - 语义化按键映射 (支持 ESC 取消)
 */

const VERSION = "v2.3";
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

const sendNetworkNotification = (callback) => {
    console.log(`[HeyBuddy] Sending request to Windows host (${HOST_IP}:${WIN_LISTENER_PORT})...`);
    
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
        callback('CANCEL');
    });

    req.end();
};

app.post('/trigger-approval', (req, res) => {
    const receivedSessionId = req.body.session_id;

    if (receivedSessionId !== SESSION_ID) {
        return res.status(403).send('Unauthorized');
    }

    console.log('\n[HeyBuddy] Received authorized approval request...');
    sendNetworkNotification((semanticChoice) => {
        console.log(`[HeyBuddy] User chose: ${semanticChoice}. Mapping to PTY input...`);
        
        // v2.3 核心改进：语义化映射
        let ptyInput = '';
        switch(semanticChoice) {
            case 'ALLOW':   ptyInput = '1\r'; break;
            case 'SESSION': ptyInput = '2\r'; break;
            case 'MODIFY':  ptyInput = '3\r'; break;
            case 'CANCEL':  
                // 发送 ESC 键 (\u001b)，这是 Gemini CLI 的通用取消键
                ptyInput = '\u001b'; 
                break;
            default: ptyInput = '\u001b';
        }

        setTimeout(() => {
            console.log(`[HeyBuddy] Injecting "${semanticChoice}" (raw: ${JSON.stringify(ptyInput)}) into PTY.`);
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
