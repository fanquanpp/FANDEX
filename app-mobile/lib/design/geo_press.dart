import 'package:flutter/material.dart';

import '../core/tokens.dart';
import 'geo_painters.dart';
import '../platform/haptics.dart';

// 按压反馈体系：缩放 0.97 + 角标括弧闪现 + 触感 tick。任何可点按面片必须经此包装。

class GeoPress extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final Color? bracketColor;
  final double bevel;
  final bool haptic;

  const GeoPress({
    super.key,
    required this.child,
    this.onTap,
    this.bracketColor,
    this.bevel = GeoRadius.bevel,
    this.haptic = true,
  });

  @override
  State<GeoPress> createState() => _GeoPressState();
}

class _GeoPressState extends State<GeoPress>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  bool _down = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: GeoMotion.fast);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails details) {
    if (widget.onTap == null) return;
    setState(() => _down = true);
    _controller.forward();
    if (widget.haptic) GeoHaptics.play(GeoHapticPattern.tick);
  }

  void _handleTapUp(TapUpDetails details) {
    setState(() => _down = false);
    _controller.reverse();
  }

  void _handleTapCancel() {
    setState(() => _down = false);
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final bracketColor = widget.bracketColor ?? palette.accent;

    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      onTap: widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final t = Curves.easeOut.transform(_controller.value);
          final scale = 1.0 - 0.03 * t;
          return Transform.scale(
            scale: scale,
            child: child,
          );
        },
        child: Stack(
          children: [
            widget.child,
            Positioned.fill(
              child: IgnorePointer(
                child: AnimatedOpacity(
                  opacity: _down ? 1 : 0,
                  duration: GeoMotion.instant,
                  child: CustomPaint(
                    painter: BracketPainter(color: bracketColor),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// 选中脉冲：0.96 -> 1 弹性。
class GeoSelectionPulse extends StatefulWidget {
  final bool selected;
  final Widget child;

  const GeoSelectionPulse(
      {super.key, required this.selected, required this.child});

  @override
  State<GeoSelectionPulse> createState() => _GeoSelectionPulseState();
}

class _GeoSelectionPulseState extends State<GeoSelectionPulse>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: GeoMotion.normal);
    if (widget.selected) _controller.value = 1;
  }

  @override
  void didUpdateWidget(GeoSelectionPulse oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selected != widget.selected && widget.selected) {
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t =
            CurvedAnimation(parent: _controller, curve: Curves.easeOut).value;
        final scale = widget.selected
            ? 0.96 + 0.04 * Curves.elasticOut.transform(t)
            : 1.0;
        return Transform.scale(scale: scale, child: child);
      },
      child: widget.child,
    );
  }
}
