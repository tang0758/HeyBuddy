const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;
let tray = null;
let currentResponse = null;
const PORT = 19999;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 420,
        height: 520,
        show: true, // v2.5: 启动即显示，解决托盘不可见问题
        frame: false, 
        transparent: true, 
        resizable: false,
        alwaysOnTop: false, 
        skipTaskbar: false, 
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('index.html');
    
    // 窗口关闭时只是隐藏，除非程序退出
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createTray() {
    try {
        // 使用一个极其简单的红色正方形 Base64，确保 100% 合法
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
        console.log("托盘启动失败 (环境不支持)，将仅使用任务栏图标。");
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

                // 发送信号给 UI，切换到“授权模式”
                mainWindow.webContents.send('show-prompt', { msg: promptMsg, tool: toolName });
                
                mainWindow.center();
                mainWindow.show();
                mainWindow.focus();
                mainWindow.setAlwaysOnTop(true, 'screen-saver');
            });
        } else {
            res.writeHead(200);
            res.end('HeyBuddy Desktop is running...');
        }
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
    // 如果是普通点击隐藏（比如 MANUAL 或取消），窗口隐藏但不置顶
    mainWindow.setAlwaysOnTop(false);
    mainWindow.hide();

    if (currentResponse && !currentResponse.writableEnded) {
        currentResponse.writeHead(200, { 'Content-Type': 'text/plain' });
        currentResponse.end(choice);
        currentResponse = null;
    }
});
