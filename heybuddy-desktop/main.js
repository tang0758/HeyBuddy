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
        show: false, 
        frame: false, 
        transparent: true, 
        resizable: false,
        alwaysOnTop: true, 
        skipTaskbar: false, 
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('index.html');
    
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            if (currentResponse && !currentResponse.writableEnded) {
                currentResponse.writeHead(200, { 'Content-Type': 'text/plain' });
                currentResponse.end('CANCEL');
                currentResponse = null;
            }
        }
    });
}

function createTray() {
    // 使用纯内存 base64 创建图标，避免写入 C 盘导致的权限崩溃
    const emptyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const icon = nativeImage.createFromBuffer(emptyPng);
    
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'HeyBuddy Listener', enabled: false },
        { type: 'separator' },
        { label: 'Quit', click: () => {
            app.isQuitting = true;
            app.quit();
        }}
    ]);
    tray.setToolTip('HeyBuddy Listener');
    tray.setContextMenu(contextMenu);
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
                
                // 将窗口居中并显示
                mainWindow.center();
                mainWindow.show();
                mainWindow.focus();
                
                // Windows 特性：强制闪烁任务栏或前台显示
                if (process.platform === 'win32') {
                    mainWindow.setAlwaysOnTop(true, 'screen-saver');
                }
            });
        } else {
            res.writeHead(200);
            res.end('HeyBuddy Desktop is running...');
        }
    });

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`HeyBuddy Server running on port ${PORT}`);
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
    mainWindow.hide();
    if (currentResponse && !currentResponse.writableEnded) {
        currentResponse.writeHead(200, { 'Content-Type': 'text/plain' });
        currentResponse.end(choice);
        currentResponse = null;
    }
});