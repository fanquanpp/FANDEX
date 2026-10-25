import 'package:flutter/material.dart';

import '../../core/tokens.dart';

// 跨屏公共小件。

class DifficultyBadge extends StatelessWidget {
  final String difficulty;
  final GeoPalette palette;

  const DifficultyBadge(
      {super.key, required this.difficulty, required this.palette});

  static const Map<String, (String, Color)> _map = {
    'beginner': ('入门', Color(0xFF22C55E)),
    'intermediate': ('进阶', Color(0xFFF97316)),
    'advanced': ('高级', Color(0xFFEF4444)),
  };

  @override
  Widget build(BuildContext context) {
    final (label, color) = _map[difficulty] ?? ('入门', const Color(0xFF22C55E));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: ShapeDecoration(
        color: color.withValues(alpha: 0.14),
        shape: BeveledRectangleBorder(
          borderRadius:
              BorderRadius.only(topRight: Radius.circular(GeoRadius.bevelTiny)),
          side: BorderSide(color: color.withValues(alpha: 0.5)),
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
            color: color,
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 1),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String label;
  final Color color;
  final String? trailing;

  const SectionHeader(
      {super.key, required this.label, required this.color, this.trailing});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 22, 0, 10),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 14,
            transform: Matrix4.skewY(-0.4),
            color: color,
          ),
          const SizedBox(width: 9),
          Text(
            label,
            style: TextStyle(
              color: palette.fgPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
            ),
          ),
          const Spacer(),
          if (trailing != null)
            Text(
              trailing!,
              style: TextStyle(
                color: palette.fgTertiary,
                fontSize: 11,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
        ],
      ),
    );
  }
}

// GeoMicroLabel：`01 // MODULE` 式微型编号标签。
class GeoMicroLabel extends StatelessWidget {
  final String text;
  final Color color;

  const GeoMicroLabel({super.key, required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        color: color,
        fontSize: 9.5,
        letterSpacing: 2.4,
        fontWeight: FontWeight.w800,
        fontFeatures: const [FontFeature.tabularFigures()],
      ),
    );
  }
}
