const http = require('http');

const data = JSON.stringify({
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
  console.error('[Trigger] Error connecting to interceptor:', error.message);
  process.exit(1);
});

req.write(data);
req.end();
