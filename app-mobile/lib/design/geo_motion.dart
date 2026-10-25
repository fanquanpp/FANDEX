import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/tokens.dart';
import 'geo_clip.dart';
import 'geo_painters.dart';

// 入场编排与页面转场。

class GeoEntrance extends StatelessWidget {
  final int index;
  final Widget child;

  const GeoEntrance({super.key, required this.index, required this.child});

  @override
  Widget build(BuildContext context) {
    final delay = GeoMotion.staggerDelay(index);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: GeoMotion.normal,
      curve: Curves.easeOut,
      onEnd: null,
      child: child,
      builder: (context, t, child) {
        // 阶梯延迟用倒放近似：t < 阈值前保持初始态。
        final threshold =
            delay.inMilliseconds / GeoMotion.normal.inMilliseconds * 0.5;
        final p = ((t - threshold) / (1 - threshold)).clamp(0.0, 1.0);
        final eased = Curves.easeOut.transform(p);
        return Opacity(
          opacity: eased,
          child: Transform.translate(
            offset: Offset(0, 12 * (1 - eased)),
            child: child,
          ),
        );
      },
    );
  }
}

// 页面转场：对角 wipe 展开 + 速度线 + 内容微移；返回时逆向收拢。
class GeoWipePage<T> extends CustomTransitionPage<T> {
  final Color lineColor;

  GeoWipePage({
    required super.child,
    required LocalKey super.key,
    this.lineColor = const Color(0xFF39C5BB),
    super.name,
    super.arguments,
    super.restorationId,
  }) : super(
          transitionDuration: GeoMotion.slow,
          reverseTransitionDuration: GeoMotion.slow,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            final t = Curves.easeOut.transform(animation.value);
            final lineT = animation.value;

            return ClipPath(
              clipper: DiagonalWipeClipper(t),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Transform.translate(
                    offset: Offset(24 * (1 - t), 24 * (1 - t)),
                    child: child,
                  ),
                  Positioned.fill(
                    child: IgnorePointer(
                      child: CustomPaint(
                        painter: SpeedLinesPainter(
                            color: lineColor, progress: lineT),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
}
