import 'dart:math' as math;

import 'package:flutter/material.dart';

// GEOCON 绘制件：角标括弧、线框多边形、刻度尺、速度线、蓝图网格回退。

class BracketPainter extends CustomPainter {
  final Color color;
  final double length;
  final double stroke;
  final double inset;

  const BracketPainter({
    required this.color,
    this.length = 10,
    this.stroke = 1.6,
    this.inset = 2,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = stroke
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.butt;

    final l = length;
    final i = inset;
    final w = size.width;
    final h = size.height;

    final paths = [
      Path()
        ..moveTo(i, i + l)
        ..lineTo(i, i)
        ..lineTo(i + l, i),
      Path()
        ..moveTo(w - i - l, i)
        ..lineTo(w - i, i)
        ..lineTo(w - i, i + l),
      Path()
        ..moveTo(w - i, h - i - l)
        ..lineTo(w - i, h - i)
        ..lineTo(w - i - l, h - i),
      Path()
        ..moveTo(i + l, h - i)
        ..lineTo(i, h - i)
        ..lineTo(i, h - i - l),
    ];
    for (final p in paths) {
      canvas.drawPath(p, paint);
    }
  }

  @override
  bool shouldRepaint(BracketPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.length != length;
}

class WireframePolygonPainter extends CustomPainter {
  final Color color;
  final int sides;
  final double phase;
  final double stroke;
  final bool vertexDots;

  const WireframePolygonPainter({
    required this.color,
    this.sides = 6,
    this.phase = 0,
    this.stroke = 1.4,
    this.vertexDots = true,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - stroke;

    final path = Path();
    for (var i = 0; i <= sides; i++) {
      final angle = phase + i * 2 * math.pi / sides - math.pi / 2;
      final p = center + Offset(radius * math.cos(angle), radius * math.sin(angle));
      if (i == 0) {
        path.moveTo(p.dx, p.dy);
      } else {
        path.lineTo(p.dx, p.dy);
      }
    }
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke,
    );

    if (vertexDots) {
      final dot = Paint()..color = color;
      for (var i = 0; i < sides; i++) {
        final angle = phase + i * 2 * math.pi / sides - math.pi / 2;
        final p = center + Offset(radius * math.cos(angle), radius * math.sin(angle));
        canvas.drawCircle(p, stroke + 0.6, dot);
      }
    }
  }

  @override
  bool shouldRepaint(WireframePolygonPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.phase != phase;
}

class TickRulerPainter extends CustomPainter {
  final Color color;
  final int segments;
  final double filledRatio;

  const TickRulerPainter({
    required this.color,
    this.segments = 20,
    required this.filledRatio,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final seg = size.width / segments;
    final gap = math.min(2.0, seg * 0.25);
    final filled = (filledRatio.clamp(0.0, 1.0) * segments).round();

    final filledPaint = Paint()..color = color;
    final emptyPaint = Paint()..color = color.withValues(alpha: 0.22);

    for (var i = 0; i < segments; i++) {
      final rect = Rect.fromLTWH(i * seg, 0, math.max(1.0, seg - gap), size.height);
      canvas.drawRect(rect, i < filled ? filledPaint : emptyPaint);
    }
  }

  @override
  bool shouldRepaint(TickRulerPainter oldDelegate) =>
      oldDelegate.color != color ||
      oldDelegate.filledRatio != filledRatio ||
      oldDelegate.segments != segments;
}

class SpeedLinesPainter extends CustomPainter {
  final Color color;
  final double progress;
  final int count;
  final int seed;

  const SpeedLinesPainter({
    required this.color,
    required this.progress,
    this.count = 9,
    this.seed = 7,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0 || progress >= 1) return;
    final fade = (progress < 0.5 ? progress * 2 : (1 - progress) * 2).clamp(0.0, 1.0);
    if (fade <= 0) return;

    final rng = math.Random(seed);
    final paint = Paint()
      ..color = color.withValues(alpha: 0.55 * fade)
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;

    // 对角线族：与扫掠同向（左上向右下 45 度）的平行短线段。
    final diag = size.width + size.height;
    for (var i = 0; i < count; i++) {
      final anchor = rng.nextDouble() * diag * 0.7;
      final sweep = diag * (0.16 + rng.nextDouble() * 0.22);
      final x1 = anchor.clamp(0.0, size.width);
      final y1 = (anchor - x1).clamp(0.0, size.height);
      final x2 = (x1 + sweep).clamp(0.0, size.width);
      final y2 = (y1 + (x2 - x1)).clamp(0.0, size.height);
      canvas.drawLine(Offset(x1, y1), Offset(x2, y2), paint);
    }
  }

  @override
  bool shouldRepaint(SpeedLinesPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.color != color;
}

class GridPainter extends CustomPainter {
  final Color lineColor;
  final double spacing;
  final Offset drift;

  const GridPainter({
    required this.lineColor,
    this.spacing = 44,
    this.drift = Offset.zero,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = lineColor
      ..strokeWidth = 1;

    final ox = drift.dx % spacing;
    final oy = drift.dy % spacing;

    for (var x = -spacing + ox; x <= size.width + spacing; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (var y = -spacing + oy; y <= size.height + spacing; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(GridPainter oldDelegate) =>
      oldDelegate.lineColor != lineColor || oldDelegate.drift != drift;
}
