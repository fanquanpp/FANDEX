import 'package:flutter/material.dart';
import 'package:highlight/highlight.dart' show Node, highlight;

import '../../core/tokens.dart';

// 语法卡内嵌紧凑代码视图（无头部、可复制省略）。

class GeoMiniCode extends StatelessWidget {
  final String code;
  final String lang;
  final Color color;

  const GeoMiniCode({super.key, required this.code, required this.lang, required this.color});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);

    InlineSpan nodeSpan(Node node) {
      final style = _styleFor(node.className, palette);
      if (node.children == null || node.children!.isEmpty) {
        return TextSpan(text: node.value, style: style);
      }
      final children = <InlineSpan>[];
      if (node.value != null && node.value!.isNotEmpty) {
        children.add(TextSpan(text: node.value, style: style));
      }
      for (final child in node.children!) {
        children.add(nodeSpan(child));
      }
      return TextSpan(children: children);
    }

    final result = highlight.parse(code, language: lang);
    final nodes = result.nodes ?? [Node(value: code)];

    return ClipPath(
      clipper: const MiniBevel(),
      child: Container(
        color: palette.codeBg,
        padding: const EdgeInsets.all(10),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Text.rich(
            TextSpan(children: [for (final n in nodes) nodeSpan(n)]),
            style: TextStyle(
              color: palette.codeFg,
              fontSize: 12,
              height: 1.5,
              fontFamilyFallback: const ['monospace'],
            ),
          ),
        ),
      ),
    );
  }

  TextStyle? _styleFor(String? cls, GeoPalette palette) {
    switch (cls) {
      case 'keyword':
      case 'selector-tag':
      case 'literal':
      case 'type':
        return TextStyle(color: palette.accent, fontWeight: FontWeight.w700);
      case 'string':
      case 'regexp':
        return const TextStyle(color: Color(0xFF22C55E));
      case 'comment':
      case 'quote':
        return TextStyle(color: palette.fgTertiary, fontStyle: FontStyle.italic);
      case 'number':
      case 'meta':
        return const TextStyle(color: Color(0xFFF97316));
      case 'title':
      case 'function':
      case 'name':
        return TextStyle(color: palette.fgPrimary, fontWeight: FontWeight.w700);
      case 'attr':
      case 'attribute':
      case 'variable':
      case 'params':
        return TextStyle(color: palette.accentHover);
      case 'tag':
        return const TextStyle(color: Color(0xFFEF4444));
      default:
        return null;
    }
  }
}

class MiniBevel extends CustomClipper<Path> {
  const MiniBevel();

  @override
  Path getClip(Size size) {
    final b = 8.0;
    return Path()
      ..moveTo(0, 0)
      ..lineTo(size.width - b, 0)
      ..lineTo(size.width, b)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}
