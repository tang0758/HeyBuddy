const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 版本: v2.1 - 最终稳定版
 * 修复: HTA 返回值问题 & 编码问题
 */

const VERSION = "v2.1";
const PORT = 19999;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'POST') {
        console.log(`[${new Date().toLocaleTimeString()}] 收到授权请求...`);

        // 临时文件路径
        const resPath = path.join(process.env.TEMP, 'gemini_res.txt');
        const htaPath = path.join(process.env.TEMP, 'gemini_prompt.hta');
        
        // 默认写入 4 (拒绝)
        fs.writeFileSync(resPath, '4');

        const htmlContent = `
        <title>HeyBuddy 远程授权 v2.1</title>
        <hta:application id="oHTA" border="thin" innerborder="no" scroll="no" maximizebutton="no" minimizebutton="no" />
        <style>
            body { font-family: "Microsoft YaHei", "微软雅黑", sans-serif; background: #f3f3f3; padding: 20px; font-size: 14px; }
            .btn { display: block; width: 100%; padding: 12px; margin-bottom: 10px; cursor: pointer; text-align: left; border: 1px solid #ccc; background: white; outline: none; font-size: 13px; }
            .btn:hover { background: #e1e1e1; border-color: #999; }
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
            <h3>HeyBuddy 操作授权请求</h3>
            <p class="note">来自 WSL 的指令需要您的确认：</p>
            <button class="btn" onclick="select(1)"><b>1. Allow once</b> (仅允许本次操作)</button>
            <button class="btn" onclick="select(2)"><b>2. Allow for this session</b> (本次会话均允许)</button>
            <button class="btn" onclick="select(3)"><b>3. Modify with external editor</b> (打开编辑器修改)</button>
            <button class="btn" onclick="select(4)"><b>4. No, suggest changes</b> (拒绝并建议修改)</button>
        </body>
        `;
        
        // 必须使用 UTF-16LE + BOM 才能让 HTA 正确显示中文
        fs.writeFileSync(htaPath, '\ufeff' + htmlContent, { encoding: 'utf16le' });

        // 运行 HTA
        exec(`mshta "${htaPath}"`, (err) => {
            // HTA 运行结束后，从临时文件读取结果
            let choice = '4';
            try {
                if (fs.existsSync(resPath)) {
                    choice = fs.readFileSync(resPath, 'utf8').trim();
                }
            } catch (e) {
                console.error('读取选择结果失败:', e);
            }

            console.log(`用户最终选择: ${choice}`);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(choice);

            // 清理
            try { if (fs.existsSync(htaPath)) fs.unlinkSync(htaPath); } catch (e) {}
            try { if (fs.existsSync(resPath)) fs.unlinkSync(resPath); } catch (e) {}
        });
    } else {
        res.writeHead(200);
        res.end(`Windows Notifier ${VERSION} is running...`);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('=========================================');
    console.log(`🚀 Windows 通知监听器已启动 [版本: ${VERSION}]`);
    console.log(`监听地址: http://localhost:${PORT}`);
    console.log('=========================================');
});
=====');
});
