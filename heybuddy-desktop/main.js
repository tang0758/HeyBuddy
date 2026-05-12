const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const http = require('http');

/**
 * HeyBuddy Desktop Notifier
 * 版本: v2.12 - 彻底禁用 ASAR 模式，使用物理路径直接加载
 */

app.disableHardwareAcceleration();

let mainWindow;
let tray = null;
let currentResponse = null;
const PORT = 19999;

process.on('uncaughtException', (error) => {
    dialog.showErrorBox('HeyBuddy 运行异常', error.stack || error.message);
});

function createWindow() {
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
            // 物理路径直接引用
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // v2.12: 由于关闭了 ASAR，__dirname 将指向真实的硬盘文件夹，loadFile 不会再失败
    const indexPath = path.join(__dirname, 'index.html');
    mainWindow.loadFile(indexPath).catch(err => {
        dialog.showErrorBox('资源加载失败 v1.0.3', `路径: ${indexPath}\n错误: ${err.message}`);
    });
    
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
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
    } catch (e) {}
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
            res.end('HeyBuddy Desktop v1.0.3 is running...');
        }
    });

    server.on('error', (e) => {
        dialog.showErrorBox('网络启动失败', `端口 ${PORT} 启动失败: ${e.message}`);
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
