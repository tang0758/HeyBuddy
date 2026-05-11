const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const http = require('http');

// v2.6: 彻底禁用硬件加速，解决大部分打包后的闪退问题
app.disableHardwareAcceleration();

let mainWindow;
let tray = null;
let currentResponse = null;
const PORT = 19999;

// 全局错误捕获：防止程序静默死亡
process.on('uncaughtException', (error) => {
    dialog.showErrorBox('HeyBuddy 运行异常', error.message || '未知内核错误');
});

function createWindow() {
    try {
        mainWindow = new BrowserWindow({
            width: 420,
            height: 520,
            show: true,
            frame: false, 
            transparent: true, 
            resizable: false,
            alwaysOnTop: false, 
            skipTaskbar: false, 
            webPreferences: {
                // 使用绝对路径解析
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        mainWindow.loadFile('index.html').catch(err => {
            dialog.showErrorBox('资源加载失败', `无法找到 index.html\nAppPath: ${app.getAppPath()}\nError: ${err.message}`);
        });
        
        mainWindow.on('close', (event) => {
            if (!app.isQuitting) {
                event.preventDefault();
                mainWindow.hide();
            }
        });
    } catch (e) {
        dialog.showErrorBox('创建窗口失败', e.message);
    }
}

function createTray() {
    try {
        const b64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAcSURBVDhPY/zPQAIMo/7DB8bDAxjwk+YjA4OQjZgAAI2fH1i08Xf1AAAAAElFTkSuQmCC';
        const icon = nativeImage.createFromBuffer(Buffer.from(b64, 'base64'));
        tray = new Tray(icon);
        const contextMenu = Menu.buildFromTemplate([
            { label: '显示 HeyBuddy 面板', click: () => mainWindow.show() },
            { type: 'separator' },
            { label: '退出程序', click: () => { app.isQuitting = true; app.quit(); } }
        ]);
        tray.setContextMenu(contextMenu);
        tray.setToolTip('HeyBuddy');
    } catch (e) {
        console.log("托盘启动失败 (环境不支持)");
    }
}

function startHttpServer() {
    const server = http.createServer((req, res) => {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                let promptMsg = '来自远端的指令需要您的确认';
                let toolName = 'Unknown';
                try {
                    const data = JSON.parse(body);
                    promptMsg = data.message || promptMsg;
                    toolName = data.tool || toolName;
                } catch(e) {}

                if (currentResponse && !currentResponse.writableEnded) {
                    currentResponse.writeHead(200);
                    currentResponse.end('CANCEL');
                }
                currentResponse = res;

                mainWindow.webContents.send('show-prompt', { msg: promptMsg, tool: toolName });
                mainWindow.center();
                mainWindow.show();
                mainWindow.focus();
                mainWindow.setAlwaysOnTop(true, 'screen-saver');
            });
        } else {
            res.writeHead(200);
            res.end('HeyBuddy Desktop v2.6 is running...');
        }
    });

    // 监听端口错误（如端口被占用）
    server.on('error', (e) => {
        dialog.showErrorBox('网络启动失败', `端口 ${PORT} 启动失败: ${e.message}\n请检查是否有其他 HeyBuddy 实例正在运行。`);
        app.quit();
    });

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 HeyBuddy Server running on port ${PORT}`);
    });
}

app.whenReady().then(() => {
    createWindow();
    createTray();
    startHttpServer();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

ipcMain.on('user-choice', (event, choice) => {
    if (choice !== 'IDLE') {
        mainWindow.setAlwaysOnTop(false);
        mainWindow.hide();
    } else {
        mainWindow.hide();
    }

    if (currentResponse && !currentResponse.writableEnded) {
        currentResponse.writeHead(200, { 'Content-Type': 'text/plain' });
        currentResponse.end(choice);
        currentResponse = null;
    }
});
