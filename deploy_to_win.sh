#!/bin/bash

# =================================================================
# HeyBuddy 自动化部署与环境准备脚本 (Deployment Agent v3.0)
# 支持 Electron (desktop) 和 Flutter (native) 两种架构的同步
# =================================================================

PROJECT_TYPE=${1:-"flutter"} # 默认同步 flutter

if [ "$PROJECT_TYPE" == "electron" ]; then
    WSL_SOURCE_DIR="/mnt/wsl/PHYSICALDRIVE3/gemini/hook/heybuddy-desktop"
    WIN_TARGET_DIR="/mnt/e/aicoding/gemini/hook/heybuddy-desktop"
    FILES=("main.js" "package.json" "index.html" "preload.js")
else
    WSL_SOURCE_DIR="/mnt/wsl/PHYSICALDRIVE3/gemini/hook/heybuddy-flutter"
    WIN_TARGET_DIR="/mnt/e/aicoding/gemini/hook/heybuddy-flutter"
    FILES=("pubspec.yaml" "lib/main.dart")
fi

echo "🤖 启动部署机器人 (Deployment Agent)..."
echo "目标模式: $PROJECT_TYPE"
echo "================================================================="

# 1. 检查目标目录是否存在
mkdir -p "$WIN_TARGET_DIR/lib"

echo "📦 正在同步代码至 Windows (E盘)..."

# 2. 循环同步文件
for file in "${FILES[@]}"; do
    if [ -f "$WSL_SOURCE_DIR/$file" ]; then
        cp -v "$WSL_SOURCE_DIR/$file" "$WIN_TARGET_DIR/$file"
    fi
done

echo "================================================================="
echo "🎉 $PROJECT_TYPE 项目同步完成！"
echo ""
if [ "$PROJECT_TYPE" == "flutter" ]; then
    echo "👉 下一步 (Windows 侧):"
    echo "   1. 确保安装了 Flutter SDK 和 VS Build Tools"
    echo "   2. cd E:\aicoding\gemini\hook\heybuddy-flutter"
    echo "   3. flutter pub get"
    echo "   4. flutter run -d windows"
fi
