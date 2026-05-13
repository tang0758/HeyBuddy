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
  
  await windowManager.ensureInitialized();
  
  WindowOptions windowOptions = const WindowOptions(
    size: Size(420, 520),
    center: true,
    backgroundColor: Colors.transparent, // 基础透明
    skipTaskbar: false,
    titleBarStyle: TitleBarStyle.hidden,
  );
  
  windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.setAsFrameless();
    await windowManager.setBackgroundColor(Colors.transparent); // 强制擦除背景
    await windowManager.setHasShadow(false); // 关键：关闭系统矩形阴影
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

  Future<void> _initSystemTray() async {
    final SystemTray systemTray = SystemTray();
    try {
      await systemTray.initSystemTray(
        title: "HeyBuddy",
        iconPath: Platform.isWindows ? 'windows/runner/resources/app_icon.ico' : 'assets/icon.png',
      );
      final Menu menu = Menu();
      await menu.buildFrom([
        MenuItemLabel(label: '显示面板', onClicked: (menuItem) => windowManager.show()),
        MenuItemLabel(label: '退出', onClicked: (menuItem) => exit(0)),
      ]);
      await systemTray.setContextMenu(menu);
    } catch (e) {
      debugPrint("Tray Error: $e");
    }
  }

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

    await io.serve(router, '0.0.0.0', 19999);
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
    // 强制使用自定义圆角和阴影，彻底告别直角层
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true, colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue)),
      home: Scaffold(
        backgroundColor: Colors.transparent, // 外部透明
        body: Container(
          margin: const EdgeInsets.all(10), // 为自定义阴影留出空间
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface.withOpacity(0.99),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.5)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.25),
                blurRadius: 15,
                spreadRadius: 2,
                offset: const Offset(0, 5),
              )
            ],
          ),
          child: ClipRRect( // 终极方案：强制裁切圆角
            borderRadius: BorderRadius.circular(24),
            child: Column(
              children: [
                GestureDetector(
                  onPanStart: (details) => windowManager.startDragging(),
                  child: Container(
                    color: Colors.transparent,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                    child: Row(
                      children: [
                        const Icon(Icons.bolt_rounded, color: Colors.blue, size: 20),
                        const SizedBox(width: 10),
                        const Text("HeyBuddy Native v3.4", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                        const Spacer(),
                        IconButton(icon: const Icon(Icons.close, size: 16), onPressed: () => windowManager.hide()),
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
      ),
    );
  }

  Widget _buildStatusUI() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.auto_awesome_rounded, size: 70, color: Colors.blue.withOpacity(0.7)),
          const SizedBox(height: 20),
          const Text("Ready to Serve", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 30),
          FilledButton.tonal(
            onPressed: () => windowManager.hide(),
            child: const Text("Hide Dashboard"),
          )
        ],
      ),
    );
  }

  Widget _buildPromptUI() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.08),
              borderRadius: BorderRadius.circular(15),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Gemini Request:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.blue)),
                const SizedBox(height: 8),
                Text(_promptMsg, style: const TextStyle(fontFamily: 'Consolas', fontSize: 13)),
                const SizedBox(height: 10),
                Text("Tool: $_toolName", style: const TextStyle(fontSize: 10, color: Colors.grey)),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _choiceBtn("✅ Allow Once", "ALLOW"),
          _choiceBtn("🕒 Allow Session", "SESSION"),
          _choiceBtn("💻 Manual", "MANUAL"),
          const Spacer(),
          _choiceBtn("❌ Cancel", "CANCEL", isDanger: true),
        ],
      ),
    );
  }

  Widget _choiceBtn(String label, String value, {bool isDanger = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: FilledButton.tonal(
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
          backgroundColor: isDanger ? Colors.red.withOpacity(0.1) : null,
          foregroundColor: isDanger ? Colors.red : null,
        ),
        onPressed: () => _handleChoice(value),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}
