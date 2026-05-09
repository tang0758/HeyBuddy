const pty = require('node-pty');
const express = require('express');
const { exec, execSync } = require('child_process');
const notifier = require('node-notifier');
const os = require('os');

const app = express();
const port = 18888;

app.use(express.json());

const isWSL = () => {
    try {
        const release = execSync('uname -a').toString().toLowerCase();
        return release.includes('microsoft') || release.includes('wsl');
    } catch (e) { return false; }
};

const IN_WSL = isWSL();

// 直接硬编码您机器上验证过的绝对路径
const PS_PATH = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';

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
        FORCE_COLOR: '3'
    }
});

ptyProcess.onData((data) => process.stdout.write(data));
process.stdin.on('data', (data) => ptyProcess.write(data));
if (process.stdin.isTTY) process.stdin.setRawMode(true);

ptyProcess.onExit(({ exitCode }) => {
    console.log(`\n[Interceptor] Process exited with code ${exitCode}`);
    process.exit(exitCode);
});

const sendNotification = (callback) => {
    if (IN_WSL) {
        console.log(`[Interceptor] Calling Windows Host PowerShell at: ${PS_PATH}`);
        const psCommand = `${PS_PATH} -NoProfile -ExecutionPolicy Bypass -Command "& {
            Add-Type -AssemblyName PresentationFramework;
            $result = [System.Windows.MessageBox]::Show('Gemini CLI 需要您的确认继续执行。是否同意？', 'Gemini CLI 授权', 'YesNo', 'Question', 'Button1', 'DefaultDesktopOnly');
            echo $result
        }"`;

        exec(psCommand, (err, stdout) => {
            if (err) {
                console.error('WSL Notification Error:', err.message);
                return;
            }
            callback(stdout.trim() === 'Yes' ? 'approve' : 'deny');
        });
    } else {
        notifier.notify({
            title: 'Gemini CLI 授权请求',
            message: 'CLI 需要您的确认继续执行。',
            wait: true,
            actions: ['确认', '拒绝']
        }, (err, response) => {
            callback((response === '确认' || response === 'activate') ? 'approve' : 'deny');
        });
    }
};

app.post('/trigger-approval', (req, res) => {
    console.log('\n[Interceptor] Received approval request...');
    sendNotification((decision) => {
        if (decision === 'approve') {
            console.log('[Interceptor] User approved. Sending "y"');
            ptyProcess.write('y\r');
        } else {
            console.log('[Interceptor] User denied. Sending "n"');
            ptyProcess.write('n\r');
        }
    });
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`[Interceptor] Server listening on http://localhost:${port}`);
    console.log(`[Interceptor] Mode: ${IN_WSL ? 'WSL-to-Host' : 'Native'}`);
});
