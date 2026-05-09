const http = require('http');

/**
 * HeyBuddy Hook 触发器
 * 版本: v2.4 - 读取 CLI 标准输入的 JSON payload，提取提示信息并传递
 */

const sessionId = process.env.HEYBUDDY_SESSION_ID;

if (!sessionId) {
  process.exit(0);
}

let rawData = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => { 
    rawData += chunk; 
});

process.stdin.on('end', () => {
    let payload = {};
    try { 
        payload = JSON.parse(rawData); 
    } catch(e) {}

    const postData = JSON.stringify({
        session_id: sessionId,
        message: payload.message || 'Gemini CLI 需要您的确认继续执行',
        tool: payload.details && payload.details.tool_name ? payload.details.tool_name : 'Unknown Tool'
    });

    const options = {
        hostname: 'localhost',
        port: 18888,
        path: '/trigger-approval',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
        },
    };

    const req = http.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
            process.exit(0);
        });
    });

    req.on('error', (error) => {
        process.exit(0);
    });

    req.write(postData);
    req.end();
});
