import 'package:flutter/services.dart';

// 外链打开 — Kotlin/Swift 平台通道实现。
class GeoExternal {
  static const MethodChannel _channel = MethodChannel('fandex/external');

  static Future<void> open(String url) async {
    try {
      await _channel.invokeMethod('openExternal', url);
    } on PlatformException {
      // 忽略：桌面调试环境无处理器。
    } on MissingPluginException {
      // 忽略。
    }
  }
}
