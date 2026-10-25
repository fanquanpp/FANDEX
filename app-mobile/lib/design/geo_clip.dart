import 'dart:math' as math;

import 'package:flutter/material.dart';

// GEOCON 裁切器：斜切面与对角扫掠。

class BevelClipper extends CustomClipper<Path> {
  final double bevel;
  final Corner corner;

  const BevelClipper(
      {this.bevel = GeoRadiusDefaults.bevel, this.corner = Corner.topRight});

  @override
  Path getClip(Size size) {
    final b = bevel.clamp(0.0, math.min(size.width, size.height)).toDouble();
    final path = Path()..moveTo(0, 0);
    switch (corner) {
      case Corner.topRight:
        path
          ..lineTo(size.width - b, 0)
          ..lineTo(size.width, b)
          ..lineTo(size.width, size.height)
          ..lineTo(0, size.height);
        break;
      case Corner.topLeft:
        path
          ..lineTo(size.width, 0)
          ..lineTo(size.width, size.height)
          ..lineTo(b, size.height)
          ..lineTo(0, size.height - b);
        break;
      case Corner.bottomRight:
        path
          ..lineTo(size.width, 0)
          ..lineTo(size.width, size.height - b)
          ..lineTo(size.width - b, size.height)
          ..lineTo(0, size.height);
        break;
      case Corner.bottomLeft:
        path
          ..lineTo(size.width, 0)
          ..lineTo(size.width, size.height)
          ..lineTo(b, size.height)
          ..lineTo(0, b);
        break;
    }
    path.close();
    return path;
  }

  @override
  bool shouldReclip(BevelClipper oldClipper) =>
      oldClipper.bevel != bevel || oldClipper.corner != corner;
}

enum Corner { topRight, topLeft, bottomRight, bottomLeft }

class GeoRadiusDefaults {
  static const double bevel = 14;
}

// 对角扫掠：区域 x + y <= coverage（自左上向右下展开）。
class DiagonalWipeClipper extends CustomClipper<Path> {
  final double progress;

  const DiagonalWipeClipper(this.progress);

  @override
  Path getClip(Size size) {
    final w = size.width;
    final h = size.height;
    final cov = progress.clamp(0.0, 1.0001).toDouble() * (w + h);
    final path = Path()..moveTo(0, 0);

    if (cov >= w + h) {
      path.lineTo(w, 0);
      path.lineTo(w, h);
      path.lineTo(0, h);
    } else if (cov <= 0) {
      path.lineTo(0, 0);
    } else {
      // 沿对角边依次取点：上边交点 -> 右边交点（可选）-> 下边交点（可选）-> 左边交点
      final topX = math.min(cov, w).toDouble();
      path.lineTo(topX, 0);
      if (cov > w) {
        final rightY = math.min(cov - w, h).toDouble();
        path.lineTo(w, rightY);
      }
      if (cov > h) {
        final bottomX = math.min(cov - h, w).toDouble();
        path.lineTo(bottomX, h);
      }
      path.lineTo(0, math.min(cov, h).toDouble());
    }
    path.close();
    return path;
  }

  @override
  bool shouldReclip(DiagonalWipeClipper oldClipper) =>
      oldClipper.progress != progress;
}
