import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:highlight/highlight.dart' show Node, highlight;

import '../../../core/tokens.dart';
import '../../../platform/haptics.dart';

// 代码块 — highlight 包解析 + GEOCON 令牌配色；恒底色深浅两态随主题。

class GeoCodeView extends StatefulWidget {
  final String code;
  final String lang;
  final Color accent;

  const GeoCodeView(
      {super.key,
      required this.code,
      required this.lang,
      required this.accent});

  @override
  State<GeoCodeView> createState() => _GeoCodeViewState();
}

class _GeoCodeViewState extends State<GeoCodeView> {
  bool _copied = false;

  TextSpan _buildSpan(
      BuildContext context, List<Node> nodes, GeoPalette palette) {
    final children = <InlineSpan>[];
    for (final node in nodes) {
      children.add(_nodeToSpan(context, node, palette, null));
    }
    return TextSpan(children: children);
  }

  InlineSpan _nodeToSpan(
      BuildContext context, Node node, GeoPalette palette, TextStyle? base) {
    final style = _styleFor(node.className, palette) ?? base;
    if (node.children == null || node.children!.isEmpty) {
      return TextSpan(text: node.value, style: style);
    }
    final children = <InlineSpan>[];
    if (node.value != null && node.value!.isNotEmpty) {
      children.add(TextSpan(text: node.value, style: style));
    }
    for (final child in node.children!) {
      children.add(_nodeToSpan(context, child, palette, style));
    }
    return TextSpan(children: children, style: style);
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
      case 'addition':
        return const TextStyle(color: Color(0xFF22C55E));
      case 'comment':
      case 'quote':
        return TextStyle(
            color: palette.fgTertiary, fontStyle: FontStyle.italic);
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
      case 'template-variable':
      case 'params':
        return TextStyle(color: palette.accentHover);
      case 'tag':
        return const TextStyle(color: Color(0xFFEF4444));
      case 'built_in':
      case 'symbol':
      case 'builtin-name':
        return TextStyle(
            color: palette.fgSecondary, fontWeight: FontWeight.w600);
      case 'deletion':
        return const TextStyle(color: Color(0xFFEF4444));
      case 'section':
      case 'bullet':
        return TextStyle(color: palette.fgPrimary, fontWeight: FontWeight.w700);
      case 'emphasis':
        return const TextStyle(fontStyle: FontStyle.italic);
      case 'strong':
        return const TextStyle(fontWeight: FontWeight.w800);
      default:
        return null;
    }
  }

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.code));
    GeoHaptics.play(GeoHapticPattern.doubleTick);
    if (!mounted) return;
    setState(() => _copied = true);
    await Future<void>.delayed(const Duration(milliseconds: 1400));
    if (!mounted) return;
    setState(() => _copied = false);
  }

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);

    final result = highlight.parse(widget.code, language: widget.lang);
    final autoDetected = result.language != null;
    final nodes =
        (autoDetected ? result.nodes : null) ?? [Node(value: widget.code)];
    final label =
        widget.lang == 'text' ? (result.language ?? 'text') : widget.lang;

    return ClipPath(
      clipper: const TopBevel(),
      child: Container(
        decoration: BoxDecoration(
          color: palette.codeBg,
          border: Border.all(color: palette.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: palette.border)),
                color: palette.bgSurface,
              ),
              child: Row(
                children: [
                  Text(
                    label.toUpperCase(),
                    style: TextStyle(
                      color: palette.fgTertiary,
                      fontSize: 9.5,
                      letterSpacing: 2.4,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: _copy,
                    behavior: HitTestBehavior.opaque,
                    child: AnimatedSwitcher(
                      duration: GeoMotion.fast,
                      transitionBuilder: (child, anim) =>
                          ScaleTransition(scale: anim, child: child),
                      child: _copied
                          ? Icon(Icons.check,
                              key: const ValueKey('ok'),
                              size: 15,
                              color: palette.success)
                          : Icon(Icons.copy_outlined,
                              key: const ValueKey('copy'),
                              size: 14,
                              color: palette.fgTertiary),
                    ),
                  ),
                ],
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(12),
              child: Text.rich(
                _buildSpan(context, nodes, palette),
                style: TextStyle(
                  color: palette.codeFg,
                  fontSize: 13,
                  height: 1.5,
                  fontFamilyFallback: const ['monospace'],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TopBevel extends CustomClipper<Path> {
  const TopBevel();

  @override
  Path getClip(Size size) {
    final b = 10.0;
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
