import 'package:flutter/services.dart';

// GeoHaptics — 双端平台通道：Kotlin Vibrator / Swift UIImpactFeedbackGenerator。
// 通道不可用时回退到 Flutter 内置触感（services 里的 HapticFeedback）。

enum GeoHapticPattern { tick, doubleTick, thud, success }

class GeoHaptics {
  static const MethodChannel _channel = MethodChannel('fandex/haptics');

  static Future<void> play(GeoHapticPattern pattern) async {
    try {
      await _channel.invokeMethod<String>('pattern', pattern.name);
      return;
    } on PlatformException {
      // fallthrough
    } on MissingPluginException {
      // fallthrough
    }
    switch (pattern) {
      case GeoHapticPattern.tick:
        await HapticFeedback.selectionClick();
        break;
      case GeoHapticPattern.doubleTick:
        await HapticFeedback.lightImpact();
        break;
      case GeoHapticPattern.thud:
        await HapticFeedback.mediumImpact();
        break;
      case GeoHapticPattern.success:
        await HapticFeedback.heavyImpact();
        break;
    }
  }
}
