const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    onShowPrompt: (callback) => ipcRenderer.on('show-prompt', (_event, data) => callback(data)),
    sendChoice: (choice) => ipcRenderer.send('user-choice', choice)
});