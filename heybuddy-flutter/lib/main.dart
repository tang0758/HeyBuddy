import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as io;
import 'package:shelf_router/shelf_router.dart' as shelf_router;
import 'package:window_manager/window_manager.dart';
import 'package:system_tray/system_tray.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 初始化窗口管理器
  await windowManager.ensureInitialized();
  
  // 配置窗口选项 (Frameless 效果主要通过 TitleBarStyle.hidden 实现)
  WindowOptions windowOptions = const WindowOptions(
    size: Size(420, 520),
    center: true,
    backgroundColor: Colors.transparent,
    skipTaskbar: false,
    titleBarStyle: TitleBarStyle.hidden, // 关键：隐藏标题栏实现无边框感
  );
  
  windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.show();
    await windowManager.focus();
  });

  runApp(const HeyBuddyApp());
}

class HeyBuddyApp extends StatefulWidget {
  const HeyBuddyApp({super.key});

  @override
  State<HeyBuddyApp> createState() => _HeyBuddyAppState();
}

class _HeyBuddyAppState extends State<HeyBuddyApp> with WindowListener {
  String _promptMsg = "等待指令中...";
  String _toolName = "-";
  bool _isPrompting = false;
  Completer<String>? _choiceCompleter;

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
    _initSystemTray();
    _startHttpServer();
  }

  @override
  void dispose() {
    windowManager.removeListener(this);
    super.dispose();
  }

  // 1. 初始化系统托盘 (修复参数名为 onClicked)
  Future<void> _initSystemTray() async {
    final SystemTray systemTray = SystemTray();
    try {
      await systemTray.initSystemTray(
        title: "HeyBuddy",
        iconPath: Platform.isWindows ? 'windows/runner/resources/app_icon.ico' : 'assets/icon.png',
      );
      final Menu menu = Menu();
      await menu.buildFrom([
        MenuItemLabel(label: 'Show Dashboard', onClicked: (menuItem) => windowManager.show()), // 修正为 onClicked
        MenuItemLabel(label: 'Exit', onClicked: (menuItem) => exit(0)), // 修正为 onClicked
      ]);
      await systemTray.setContextMenu(menu);
    } catch (e) {
      debugPrint("托盘初始化跳过: $e");
    }
  }

  // 2. 启动后台 HTTP 服务器
  Future<void> _startHttpServer() async {
    final router = shelf_router.Router();

    router.post('/trigger-approval', (Request request) async {
      final payload = await request.readAsString();
      final data = jsonDecode(payload);

      setState(() {
        _promptMsg = data['message'] ?? "请求确认";
        _toolName = data['tool'] ?? "Unknown";
        _isPrompting = true;
      });

      await windowManager.show();
      await windowManager.setAlwaysOnTop(true);
      await windowManager.focus();

      _choiceCompleter = Completer<String>();
      final result = await _choiceCompleter!.future;

      return Response.ok(result);
    });

    try {
      await io.serve(router, '0.0.0.0', 19999);
      debugPrint('HeyBuddy Flutter Server running on port 19999');
    } catch (e) {
      debugPrint("服务器启动失败: $e");
    }
  }

  void _handleChoice(String choice) {
    if (_choiceCompleter != null && !_choiceCompleter!.isCompleted) {
      _choiceCompleter!.complete(choice);
    }
    setState(() {
      _isPrompting = false;
    });
    windowManager.setAlwaysOnTop(false);
    windowManager.hide();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
      ),
      home: Scaffold(
        backgroundColor: Colors.transparent,
        body: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface.withOpacity(0.98),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 20)],
          ),
          child: Column(
            children: [
              // 自定义标题栏 (拖拽区域)
              GestureDetector(
                onPanStart: (details) => windowManager.startDragging(),
                child: Container(
                  color: Colors.transparent,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                  child: Row(
                    children: [
                      const Icon(Icons.bolt_rounded, color: Colors.blue),
                      const SizedBox(width: 10),
                      const Text("HeyBuddy Native", style: TextStyle(fontWeight: FontWeight.bold)),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () => windowManager.hide(),
                      ),
                    ],
                  ),
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: _isPrompting ? _buildPromptUI() : _buildStatusUI(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusUI() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.auto_awesome_rounded, size: 80, color: Colors.blue.withOpacity(0.8)),
          const SizedBox(height: 20),
          const Text("HeyBuddy is Active", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text("Listening on port 19999", style: TextStyle(color: Colors.grey.shade500)),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: () => windowManager.hide(),
            child: const Text("隐藏面板"),
          )
        ],
      ),
    );
  }

  Widget _buildPromptUI() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("系统提示：", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.blue)),
                const SizedBox(height: 8),
                Text(_promptMsg, style: const TextStyle(fontFamily: 'monospace')),
                const SizedBox(height: 10),
                Text("Tool: $_toolName", style: const TextStyle(fontSize: 10, color: Colors.grey)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          _choiceBtn("✅ 仅允许本次", "ALLOW"),
          _choiceBtn("🕒 本会话均允许", "SESSION"),
          _choiceBtn("💻 手动操作", "MANUAL"),
          const Spacer(),
          _choiceBtn("❌ 拒绝", "CANCEL", isDanger: true),
        ],
      ),
    );
  }

  Widget _choiceBtn(String label, String value, {bool isDanger = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: FilledButton.tonal(
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 18),
          backgroundColor: isDanger ? Colors.red.withOpacity(0.1) : null,
          foregroundColor: isDanger ? Colors.red : null,
        ),
        onPressed: () => _handleChoice(value),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}
