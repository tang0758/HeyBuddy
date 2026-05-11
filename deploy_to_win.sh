#!/bin/bash

# =================================================================
# HeyBuddy 自动化部署与环境准备脚本 (Deployment Agent)
# 职责：确保 WSL 端的最新代码完美同步到 Windows 物理机
# =================================================================

WSL_SOURCE_DIR="/mnt/wsl/PHYSICALDRIVE3/gemini/hook/heybuddy-desktop"
WIN_TARGET_DIR="/mnt/e/aicoding/gemini/hook/heybuddy-desktop"

echo "🤖 启动部署机器人 (Deployment Agent)..."
echo "================================================================="

# 1. 检查目标目录是否存在
if [ ! -d "$WIN_TARGET_DIR" ]; then
    echo "⚠️  Windows 目标目录不存在，正在为您创建..."
    mkdir -p "$WIN_TARGET_DIR"
fi

echo "📦 正在对比并同步最新代码至 Windows (E盘)..."

# 2. 同步核心文件
cp -v "$WSL_SOURCE_DIR/main.js" "$WIN_TARGET_DIR/"
cp -v "$WSL_SOURCE_DIR/package.json" "$WIN_TARGET_DIR/"
cp -v "$WSL_SOURCE_DIR/index.html" "$WIN_TARGET_DIR/"
cp -v "$WSL_SOURCE_DIR/preload.js" "$WIN_TARGET_DIR/"

# 3. 同步图标文件 (如果有)
if [ -f "$WSL_SOURCE_DIR/icon.png" ]; then
    cp -v "$WSL_SOURCE_DIR/icon.png" "$WIN_TARGET_DIR/"
    echo "✅ 图标文件 (icon.png) 同步成功。"
else
    echo "⚠️ 未找到自定义图标文件，将使用默认图标。"
fi

echo "================================================================="
echo "🎉 部署完成！Windows 端代码已是最新。"
echo ""
echo "👉 接下来，请在 Windows 终端中执行："
echo "   1. 确保在目录: E:\aicoding\gemini\hook\heybuddy-desktop"
echo "   2. 运行测试: npm start"
echo "   3. (或) 重新打包: npm run build:win"
