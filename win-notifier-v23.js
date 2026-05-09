const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * HeyBuddy Windows Notifier
 * 版本: v2.3 - 语义化按钮版
 * 解决了: 选项动态变化导致的错位问题，引入 ESC 键取消逻辑
 */

const VERSION = "v2.3";
const PORT = 19999;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'POST') {
        console.log(`[${new Date().toLocaleTimeString()}] 收到授权请求...`);

        const resPath = path.join(process.env.TEMP, 'gemini_res.txt');
        const htaPath = path.join(process.env.TEMP, 'gemini_prompt.hta');
        
        // 默认写入 CANCEL (拒绝)
        fs.writeFileSync(resPath, 'CANCEL');

        const htmlContent = `
        <title>HeyBuddy 远程授权 v2.3</title>
        <hta:application id="oHTA" border="thin" innerborder="no" scroll="no" maximizebutton="no" minimizebutton="no" />
        <style>
            body { font-family: "Microsoft YaHei", "微软雅黑", sans-serif; background: #f3f3f3; padding: 20px; font-size: 14px; }
            .btn { display: block; width: 100%; padding: 12px; margin-bottom: 10px; cursor: pointer; text-align: left; border: 1px solid #ccc; background: white; outline: none; font-size: 13px; }
            .btn:hover { background: #e1e1e1; border-color: #999; }
            .btn-deny { color: #d93025; font-weight: bold; }
            h3 { margin-top: 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            .note { font-size: 12px; color: #666; margin-bottom: 15px; }
        </style>
        <script>
            function select(val) {
                try {
                    var fso = new ActiveXObject("Scripting.FileSystemObject");
                    var file = fso.CreateTextFile("${resPath.replace(/\\/g, '\\\\')}", true);
                    file.Write(val);
                    file.Close();
                } catch(e) {
                    alert("写入结果失败: " + e.message);
                }
                window.close();
            }
            window.resizeTo(480, 420);
            window.moveTo((screen.width - 480) / 2, (screen.height - 420) / 2);
        </script>
        <body>
            <h3>HeyBuddy 操作授权</h3>
            <p class="note">请选择您要对当前操作执行的动作：</p>
            <button class="btn" onclick="select('ALLOW')">✅ <b>仅允许本次</b> (Allow once)</button>
            <button class="btn" onclick="select('SESSION')">🕒 <b>本会话均允许</b> (Allow for session)</button>
            <button class="btn" onclick="select('MODIFY')">📝 <b>打开编辑器修改</b> (Modify with external editor)</button>
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
