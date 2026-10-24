import 'package:flutter/material.dart';

import '../core/tokens.dart';
import 'geo_painters.dart';

// 顶部常驻 Dock — 信息架构硬性指令：无底部导航，一切入口在 Dock 与抽屉。

class DockSegmentAction {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final bool active;

  const DockSegmentAction({required this.icon, required this.tooltip, required this.onTap, this.active = false});
}

class GeoDock extends StatelessWidget implements PreferredSizeWidget {
  final Widget? leading;
  final String title;
  final Color accent;
  final List<Widget> actions;
  final List<DockSegmentAction> segment;
  final double progress;

  const GeoDock({
    super.key,
    this.leading,
    required this.title,
    this.accent = const Color(0xFF39C5BB),
    this.actions = const [],
    this.segment = const [],
    this.progress = 0,
  });

  @override
  Size get preferredSize => const Size.fromHeight(60);

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return SafeArea(
      bottom: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            height: 56,
            decoration: BoxDecoration(
              color: palette.bgBase.withValues(alpha: 0.92),
              border: Border(bottom: BorderSide(color: palette.border)),
            ),
            child: Row(
              children: [
                if (leading != null)
                  SizedBox(width: 56, height: 56, child: leading)
                else
                  const SizedBox(width: 12),
                const SizedBox(width: 4),
                // 斜切强调面
                Container(
                  width: 4,
                  height: 16,
                  transform: Matrix4.skewY(-0.35),
                  color: accent,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: AnimatedSwitcher(
                    duration: GeoMotion.fast,
                    switchInCurve: Curves.easeOut,
                    switchOutCurve: Curves.easeIn,
                    transitionBuilder: (child, anim) => FadeTransition(
                      opacity: anim,
                      child: ScaleTransition(scale: Tween(begin: 0.96, end: 1.0).animate(anim), child: child),
                    ),
                    child: Text(
                      key: ValueKey(title),
                      title.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: palette.fgPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                ),
                ...actions,
                if (segment.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(right: 10, left: 6),
                    height: 36,
                    decoration: BoxDecoration(
                      color: palette.bgElevated,
                      border: Border.all(color: palette.border),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (var i = 0; i < segment.length; i++) ...[
                          if (i > 0) Container(width: 1, height: 36, color: palette.border),
                          _SegmentButton(action: segment[i], palette: palette, accent: accent),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          ),
          // 阅读进度标尺
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: progress.clamp(0.0, 1.0)),
            duration: GeoMotion.instant,
            builder: (context, value, _) {
              return CustomPaint(
                size: const Size(double.infinity, 2.5),
                painter: TickRulerPainter(color: accent, filledRatio: value, segments: 24),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _SegmentButton extends StatelessWidget {
  final DockSegmentAction action;
  final GeoPalette palette;
  final Color accent;

  const _SegmentButton({required this.action, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: action.tooltip,
      child: InkWell(
        onTap: action.onTap,
        child: Container(
          width: 38,
          height: 34,
          alignment: Alignment.center,
          color: action.active ? accent.withValues(alpha: 0.16) : Colors.transparent,
          child: AnimatedScale(
            scale: action.active ? 1.1 : 1.0,
            duration: GeoMotion.fast,
            curve: Curves.easeOut,
            child: Icon(
              action.icon,
              size: 18,
              color: action.active ? accent : palette.fgSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
