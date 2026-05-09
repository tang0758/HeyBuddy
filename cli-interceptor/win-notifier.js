const http = require('http');
const notifier = require('node-notifier');

/**
 * Windows 通知接收器 (Windows Notifier Listener)
 * 运行在 Windows 宿主机上，接收来自 WSL 或 远程 Linux 服务器的信号并弹窗。
 */

const PORT = 19999;

const server = http.createServer((req, res) => {
    // 允许跨域 (如果以后从浏览器调用)
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'POST') {
        console.log(`[${new Date().toLocaleTimeString()}] 收到授权请求...`);

        notifier.notify({
            title: 'Gemini CLI 远程授权',
            message: '来自 WSL/远程服务器 的指令需要您的确认。',
            wait: true,
            timeout: 60, // 60秒超时
            actions: ['确认', '拒绝'],
            closeLabel: '忽略'
        }, (err, response, metadata) => {
            let decision = 'deny';
            
            // 兼容不同平台的返回结果
            if (response === '确认' || response === 'activate' || metadata?.activationValue === '确认') {
                decision = 'approve';
            }

            console.log(`用户决定: ${decision}`);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(decision);
        });
    } else {
        res.writeHead(200);
        res.end('Windows Notifier is running...');
    }
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用，请检查是否已有一个实例在运行。`);
    } else {
        console.error('服务器错误:', e);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('=========================================');
    console.log('🚀 Windows 通知监听器已启动');
    console.log(`端口: ${PORT}`);
    console.log('说明: 请保持此窗口开启。它将接收来自 WSL 的弹窗请求。');
    console.log('=========================================');
});
