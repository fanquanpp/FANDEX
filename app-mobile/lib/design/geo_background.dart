import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/tokens.dart';
import 'geo_painters.dart';

// 蓝图网格背景：GLSL 片元着色器（漂移网格 + 对角扫描线），加载失败回退 GridPainter。
// 设计约束：仅线场，无光斑、无色散。

final shaderProgramProvider = FutureProvider<ui.FragmentProgram?>((ref) async {
  try {
    return await ui.FragmentProgram.fromAsset('assets/shaders/grid.frag');
  } catch (_) {
    return null;
  }
});

class GeoBackdrop extends ConsumerStatefulWidget {
  final Widget? child;
  final bool withSweep;

  const GeoBackdrop({super.key, this.child, this.withSweep = true});

  @override
  ConsumerState<GeoBackdrop> createState() => _GeoBackdropState();
}

class _GeoBackdropState extends ConsumerState<GeoBackdrop>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  final ValueNotifier<double> _time = ValueNotifier<double>(0);

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((elapsed) {
      _time.value = elapsed.inMicroseconds / 1e6;
    });
    _ticker.start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    _time.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final program = ref.watch(shaderProgramProvider).value;

    return Stack(
      fit: StackFit.expand,
      children: [
        // 背景动效经 repaint 通道重绘，禁止 setState 重建整棵子树——
        // 否则每帧重建会让入场动画（TweenAnimationBuilder）被反复重置。
        if (program != null)
          CustomPaint(
            painter: _ShaderGridPainter(
              program: program,
              timeNotifier: _time,
              tint: palette.fgPrimary,
              base: palette.bgBase,
            ),
          )
        else
          CustomPaint(
            painter: _TimedGridPainter(
                lineColor: palette.gridLine, timeNotifier: _time),
          ),
        if (widget.child != null) widget.child!,
      ],
    );
  }
}

class _TimedGridPainter extends CustomPainter {
  final Color lineColor;
  final ValueNotifier<double> timeNotifier;

  _TimedGridPainter({required this.lineColor, required this.timeNotifier})
      : super(repaint: timeNotifier);

  @override
  void paint(Canvas canvas, Size size) {
    final t = timeNotifier.value;
    GridPainter(
      lineColor: lineColor,
      drift: Offset(t * 6 % 44, -t * 4 % 44),
    ).paint(canvas, size);
  }

  @override
  bool shouldRepaint(_TimedGridPainter oldDelegate) => true;
}

class _ShaderGridPainter extends CustomPainter {
  final ui.FragmentProgram program;
  final ValueNotifier<double> timeNotifier;
  final Color tint;
  final Color base;

  _ShaderGridPainter({
    required this.program,
    required this.timeNotifier,
    required this.tint,
    required this.base,
  }) : super(repaint: timeNotifier);

  @override
  void paint(Canvas canvas, Size size) {
    final shader = program.fragmentShader();
    shader.setFloat(0, timeNotifier.value);
    shader.setFloat(1, size.width);
    shader.setFloat(2, size.height);
    shader.setFloat(3, tint.r);
    shader.setFloat(4, tint.g);
    shader.setFloat(5, tint.b);
    shader.setFloat(6, 0);
    // 第 7 槽补齐 std140 对齐余量。
    canvas.drawRect(Offset.zero & size, Paint()..shader = shader);
  }

  @override
  bool shouldRepaint(_ShaderGridPainter oldDelegate) =>
      oldDelegate.tint != tint;
}

// 线框多边形加载态。
class GeoLoading extends StatefulWidget {
  final String label;
  final int sides;

  const GeoLoading({super.key, this.label = 'LOADING', this.sides = 6});

  @override
  State<GeoLoading> createState() => _GeoLoadingState();
}

class _GeoLoadingState extends State<GeoLoading>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 2400))
      ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              return CustomPaint(
                size: const Size(56, 56),
                painter: WireframePolygonPainter(
                  color: palette.accent,
                  sides: widget.sides,
                  phase: _controller.value * 2 * 3.14159,
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          Text(
            widget.label,
            style: TextStyle(
              color: palette.fgTertiary,
              fontSize: 11,
              letterSpacing: 4,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// 错误态：线框三角 + 单次抖动。
class GeoErrorView extends StatefulWidget {
  final String message;
  final VoidCallback? onRetry;

  const GeoErrorView({super.key, required this.message, this.onRetry});

  @override
  State<GeoErrorView> createState() => _GeoErrorViewState();
}

class _GeoErrorViewState extends State<GeoErrorView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shake;

  @override
  void initState() {
    super.initState();
    _shake = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 420))
      ..forward();
  }

  @override
  void dispose() {
    _shake.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: _shake,
            builder: (context, child) {
              final t = _shake.value;
              final dx = t < 1 ? (1 - t) * 6 * (t * 12 % 2 == 0 ? 1 : -1) : 0.0;
              return Transform.translate(offset: Offset(dx, 0), child: child);
            },
            child: CustomPaint(
              size: const Size(56, 56),
              painter: const WireframePolygonPainter(
                  color: Color(0xFFEF4444), sides: 3, vertexDots: false),
            ),
          ),
          const SizedBox(height: 16),
          Text(widget.message,
              style: TextStyle(color: palette.fgSecondary, fontSize: 13)),
          if (widget.onRetry != null) ...[
            const SizedBox(height: 12),
            TextButton(
              onPressed: widget.onRetry,
              child: Text('RETRY',
                  style: TextStyle(
                      color: palette.accent, letterSpacing: 3, fontSize: 12)),
            ),
          ],
        ],
      ),
    );
  }
}
