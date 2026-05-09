const http = require('http');

/**
 * HeyBuddy Hook 触发器
 * 增加 Session ID 支持，确保只触发关联的拦截器
 */

const sessionId = process.env.HEYBUDDY_SESSION_ID;

// 如果没有 Session ID，说明不是通过 HeyBuddy 启动的，直接退出
if (!sessionId) {
  process.exit(0);
}

const data = JSON.stringify({
  session_id: sessionId,
  timestamp: new Date().toISOString()
});

const options = {
  hostname: 'localhost',
  port: 18888,
  path: '/trigger-approval',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

const req = http.request(options, (res) => {
  res.on('data', () => {});
  res.on('end', () => {
    process.exit(0);
  });
});

req.on('error', (error) => {
  // 静默失败，不干扰 CLI 正常运行
  process.exit(0);
});

req.write(data);
req.end();
