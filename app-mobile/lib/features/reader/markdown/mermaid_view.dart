import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../core/tokens.dart';

// Mermaid 图 — WebView 加载本地离线宿主页，JS 桥回报高度。
// 手势（捏合缩放/平移/双击适配）由宿主页内核处理，垂直滚动交还原生。

class MermaidView extends StatefulWidget {
  final String code;
  final bool isDark;

  const MermaidView({super.key, required this.code, required this.isDark});

  @override
  State<MermaidView> createState() => _MermaidViewState();
}

class _MermaidViewState extends State<MermaidView> {
  WebViewController? _controller;
  double _height = 220;
  String? _error;
  bool _ready = false;
  bool _sentCode = false;

  @override
  void initState() {
    super.initState();
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            if (request.url.startsWith('data:') ||
                request.url.contains('host.html')) {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
          onPageFinished: (_) {
            if (!mounted) return;
            setState(() => _ready = true);
            _pushCode();
          },
        ),
      )
      ..addJavaScriptChannel(
        'GeoMermaid',
        onMessageReceived: (msg) {
          if (!mounted) return;
          try {
            final data = jsonDecode(msg.message) as Map<String, dynamic>;
            if (data['type'] == 'height') {
              setState(() => _height =
                  ((data['value'] as num?) ?? 220).toDouble().clamp(120, 2400));
            } else if (data['type'] == 'error') {
              setState(() => _error = (data['value'] as String?) ?? '渲染失败');
            }
          } catch (_) {}
        },
      )
      ..loadFlutterAsset('assets/mermaid/host.html');
    _controller = controller;
  }

  @override
  void didUpdateWidget(MermaidView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.code != widget.code) _pushCode();
  }

  void _pushCode() {
    if (!_ready || _sentCode) return;
    _sentCode = true;
    final c = _controller;
    if (c == null) return;
    final theme = widget.isDark ? 'dark' : 'neutral';
    c.runJavaScript('setTheme(${jsonEncode(theme)})');
    c.runJavaScript('renderCode(${jsonEncode(widget.code)})');
  }

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AnimatedContainer(
          duration: GeoMotion.normal,
          curve: Curves.easeOut,
          height: _error != null ? 96 : _height,
          decoration: ShapeDecoration(
            color: palette.bgSurface,
            shape: BeveledRectangleBorder(
              borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(GeoRadius.bevel)),
              side: BorderSide(color: palette.border),
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: _error != null
              ? Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'MERMAID 渲染失败',
                        style: TextStyle(
                            color: palette.danger,
                            fontSize: 10,
                            letterSpacing: 2,
                            fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 6),
                      Expanded(
                        child: Text(
                          _error!,
                          style: TextStyle(
                              color: palette.fgTertiary,
                              fontSize: 11,
                              fontFamilyFallback: const ['monospace']),
                        ),
                      ),
                    ],
                  ),
                )
              : WebViewWidget(controller: _controller!),
        ),
        const SizedBox(height: 6),
        Text(
          'MERMAID 图表 · 双指缩放 / 双击适配',
          textAlign: TextAlign.center,
          style: TextStyle(
              color: palette.fgTertiary, fontSize: 10, letterSpacing: 1.5),
        ),
      ],
    );
  }
}
