const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * HeyBuddy Windows Notifier
 * 版本: v2.4 - 接收并显示动态提示内容，解释二次弹窗原因
 */

const VERSION = "v2.4";
const PORT = 19999;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'POST') {
        console.log(`[${new Date().toLocaleTimeString()}] 收到授权请求...`);

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            let promptMsg = '来自 WSL 的指令需要您的确认';
            let toolName = '未知工具';
            try {
                const data = JSON.parse(body);
                promptMsg = data.message || promptMsg;
                toolName = data.tool || toolName;
            } catch(e) {}

            console.log(`提示内容: ${promptMsg} (Tool: ${toolName})`);

            const resPath = path.join(process.env.TEMP, 'gemini_res.txt');
            const htaPath = path.join(process.env.TEMP, 'gemini_prompt.hta');
            fs.writeFileSync(resPath, 'CANCEL');

            // 如果工具是 run_shell_command 并且提示里包含 vim/nano 等编辑器
            // 我们可以在界面上给个提示，解释为什么会弹第二次
            let extraNote = '';
            if (toolName === 'run_shell_command' && (promptMsg.includes('vim') || promptMsg.includes('nano'))) {
                extraNote = '<div style="background:#fff3cd; color:#856404; padding:8px; border-radius:4px; margin-bottom:10px; font-size:12px;"><b>⚠️ 编辑器权限请求：</b>您刚才选择了“使用编辑器修改”，Gemini 现正请求运行编辑器（如 vim）。请点击 <b>[✅ 仅允许本次]</b> 即可进入编辑器画面。</div>';
            }

            const htmlContent = `
            <title>HeyBuddy 远程授权 v2.4</title>
            <hta:application id="oHTA" border="thin" innerborder="no" scroll="no" maximizebutton="no" minimizebutton="no" />
            <style>
                body { font-family: "Microsoft YaHei", "微软雅黑", sans-serif; background: #f3f3f3; padding: 20px; font-size: 14px; }
                .btn { display: block; width: 100%; padding: 12px; margin-bottom: 10px; cursor: pointer; text-align: left; border: 1px solid #ccc; background: white; outline: none; font-size: 13px; }
                .btn:hover { background: #e1e1e1; border-color: #999; }
                .btn-deny { color: #d93025; font-weight: bold; }
                h3 { margin-top: 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                .msg-box { background: #e8f0fe; color: #1a73e8; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-family: monospace; word-wrap: break-word; }
            </style>
            <script>
                function select(val) {
                    try {
                        var fso = new ActiveXObject("Scripting.FileSystemObject");
                        var file = fso.CreateTextFile("${resPath.replace(/\\/g, '\\\\')}", true);
                        file.Write(val);
                        file.Close();
                    } catch(e) { alert("写入结果失败: " + e.message); }
                    window.close();
                }
                window.resizeTo(500, 480);
                window.moveTo((screen.width - 500) / 2, (screen.height - 480) / 2);
            </script>
            <body>
                <h3>HeyBuddy 操作授权</h3>
                ${extraNote}
                <div class="msg-box">
                    <b>系统提示：</b><br>${promptMsg}<br><br>
                    <b>请求工具：</b>${toolName}
                </div>
                <button class="btn" onclick="select('ALLOW')">✅ <b>仅允许本次</b> (Allow once)</button>
                <button class="btn" onclick="select('SESSION')">🕒 <b>本会话均允许</b> (Allow for session)</button>
                <button class="btn" onclick="select('MANUAL')">💻 <b>特殊选项，主动回到CLI操作</b> (Manual Mode)</button>
                <button class="btn btn-deny" onclick="select('CANCEL')">❌ <b>拒绝/取消</b> (Deny/Cancel)</button>
            </body>
            `;
            
            fs.writeFileSync(htaPath, '\ufeff' + htmlContent, { encoding: 'utf16le' });

            exec(`mshta "${htaPath}"`, (err) => {
                let choice = 'CANCEL';
                try {
                    if (fs.existsSync(resPath)) {
                        choice = fs.readFileSync(resPath, 'utf8').trim();
                    }
                } catch (e) {}

                console.log(`用户最终决定: ${choice}`);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(choice);

                try { if (fs.existsSync(htaPath)) fs.unlinkSync(htaPath); } catch (e) {}
                try { if (fs.existsSync(resPath)) fs.unlinkSync(resPath); } catch (e) {}
            });
        });
    } else {
        res.writeHead(200);
        res.end(`HeyBuddy Notifier ${VERSION} is running...`);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('=========================================');
    console.log(`🚀 HeyBuddy Windows 监听器 [版本: ${VERSION}]`);
    console.log(`监听地址: http://localhost:${PORT}`);
    console.log('=========================================');
});
