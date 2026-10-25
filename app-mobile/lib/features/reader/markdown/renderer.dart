import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_math_fork/flutter_math.dart';

import '../../../core/tokens.dart';
import '../../../platform/external.dart';
import '../../../platform/haptics.dart';
import 'blocks.dart';
import 'code_view.dart';
import 'mermaid_view.dart';

// 块模型到 GEOCON 组件的渲染器 — 正文不使用 WebView（mermaid 除外）。

List<Widget> renderBlocks(
  BuildContext context,
  List<MdBlock> blocks, {
  required Color accent,
  Map<int, GlobalKey> headingKeys = const {},
}) {
  final widgets = <Widget>[];
  var headingIdx = 0;
  for (final block in blocks) {
    Key? headingKey;
    if (block is BHeading) {
      headingKey = headingKeys[headingIdx];
      headingIdx++;
    }
    widgets.add(_renderBlock(context, block, accent, headingKey));
  }
  return widgets;
}

Widget _renderBlock(
    BuildContext context, MdBlock block, Color accent, Key? headingKey) {
  final palette = geoOf(context);

  if (block is BHeading) {
    final sizes = {1: 26.0, 2: 22.0, 3: 18.0, 4: 16.5, 5: 15.0, 6: 14.0};
    final fontSize = sizes[block.level] ?? 15;
    return Padding(
      padding: EdgeInsets.only(top: block.level <= 2 ? 26 : 18, bottom: 10),
      key: headingKey,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 3.5,
            height: fontSize * 0.9,
            transform: Matrix4.skewY(-0.4),
            color: block.level <= 2 ? accent : palette.border,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              buildInline(context, block.inlines, accent,
                  baseSize: fontSize, bold: true),
              style: TextStyle(
                color: palette.fgPrimary,
                fontSize: fontSize,
                fontWeight: FontWeight.w800,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
  if (block is BParagraph) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text.rich(
        buildInline(context, block.inlines, accent),
        style:
            TextStyle(color: palette.fgPrimary, fontSize: 15.5, height: 1.625),
      ),
    );
  }

  if (block is BCode) {
    if (block.lang == 'mermaid') {
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: MermaidView(
            code: block.code,
            isDark: palette.bgBase == const Color(0xFF0A0A0A)),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: GeoCodeView(code: block.code, lang: block.lang, accent: accent),
    );
  }

  if (block is BMath) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: GeoMathView(expr: block.expr, block: true, accent: accent),
    );
  }

  if (block is BList) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          for (var i = 0; i < block.items.length; i++)
            _ListItem(
              index: i,
              ordered: block.ordered,
              item: block.items[i],
              accent: accent,
            ),
        ],
      ),
    );
  }

  if (block is BQuote) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: _QuoteView(quote: block, accent: accent),
    );
  }

  if (block is BTable) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: _TableView(table: block, accent: accent),
    );
  }

  if (block is BDivider) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 10),
      child: GeoSlashDivider(),
    );
  }

  if (block is BImage) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: _ImagePlaceholder(alt: block.alt, accent: accent),
    );
  }

  return const SizedBox.shrink();
}

class GeoSlashDivider extends StatelessWidget {
  const GeoSlashDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return SizedBox(
      height: 12,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var i = 0; i < 12; i++)
            Container(
              width: 2,
              height: 12,
              margin: const EdgeInsets.symmetric(horizontal: 3),
              transform: Matrix4.skewX(-0.6),
              color: palette.border.withValues(alpha: i == 11 ? 0.9 : 0.55),
            ),
        ],
      ),
    );
  }
}

class _ListItem extends StatelessWidget {
  final int index;
  final bool ordered;
  final MdListItem item;
  final Color accent;

  const _ListItem(
      {required this.index,
      required this.ordered,
      required this.item,
      required this.accent});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final marker = ordered ? '${index + 1}.' : '-';
    final task = item.taskChecked;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (task != null) ...[
            GestureDetector(
              onTap: () => GeoHaptics.play(GeoHapticPattern.tick),
              child: Container(
                width: 15,
                height: 15,
                margin: const EdgeInsets.only(top: 3),
                decoration: BoxDecoration(
                  border: Border.all(
                      color: task ? accent : palette.borderStrong, width: 1.5),
                  color:
                      task ? accent.withValues(alpha: 0.2) : Colors.transparent,
                ),
                child: task ? Icon(Icons.check, size: 11, color: accent) : null,
              ),
            ),
          ] else ...[
            SizedBox(
              width: 24,
              child: Text(
                marker,
                style: TextStyle(
                  color: ordered ? accent : palette.fgTertiary,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ],
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final b in item.blocks)
                  if (b is BParagraph)
                    Text.rich(
                      buildInline(context, b.inlines, accent),
                      style: TextStyle(
                          color: palette.fgPrimary, fontSize: 15, height: 1.55),
                    )
                  else if (b is BCode)
                    GeoCodeView(code: b.code, lang: b.lang, accent: accent)
                  else if (b is BList)
                    Padding(
                      padding: const EdgeInsets.only(left: 18, top: 2),
                      child: Column(
                        children: [
                          for (var i = 0; i < b.items.length; i++)
                            _ListItem(
                                index: i,
                                ordered: b.ordered,
                                item: b.items[i],
                                accent: accent),
                        ],
                      ),
                    ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuoteView extends StatelessWidget {
  final BQuote quote;
  final Color accent;

  const _QuoteView({required this.quote, required this.accent});

  static const Map<String, (String, Color)> _admonition = {
    'NOTE': ('注记', Color(0xFF39C5BB)),
    'TIP': ('提示', Color(0xFF22C55E)),
    'WARNING': ('警告', Color(0xFFF97316)),
    'DANGER': ('危险', Color(0xFFEF4444)),
    'INFO': ('信息', Color(0xFF39C5BB)),
    'CAUTION': ('谨慎', Color(0xFFF97316)),
    'IMPORTANT': ('重要', Color(0xFF9900FF)),
    'EXAMPLE': ('示例', Color(0xFF66CCFF)),
    'SUCCESS': ('成功', Color(0xFF22C55E)),
    'QUOTE': ('引用', Color(0xFF596671)),
    'QUESTION': ('疑问', Color(0xFFFF8800)),
    'FAILURE': ('失败', Color(0xFFEF4444)),
    'BUG': ('缺陷', Color(0xFFDC2626)),
    'ABSTRACT': ('摘要', Color(0xFF66CCFF)),
    'TODO': ('待办', Color(0xFF9999FF)),
  };

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final meta =
        quote.admonition != null ? _admonition[quote.admonition] : null;
    final faceColor = meta?.$2 ?? accent;
    final label = meta?.$1 ?? '';

    return ClipPath(
      clipper: const TopBevelClipper(),
      child: Container(
        decoration: BoxDecoration(
          color: palette.bgSurface,
          border: Border.all(color: palette.border),
        ),
        // IntrinsicHeight：无界高度列表内 stretch 行需要先解析固有高度。
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 4, color: faceColor),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (label.isNotEmpty) ...[
                        Text(
                          '$label // ${quote.admonition}',
                          style: TextStyle(
                            color: faceColor,
                            fontSize: 10,
                            letterSpacing: 2,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 6),
                      ],
                      for (final b in quote.blocks)
                        if (b is BParagraph)
                          Text.rich(
                            buildInline(context, b.inlines, accent),
                            style: TextStyle(
                                color: palette.fgSecondary,
                                fontSize: 13.5,
                                height: 1.55),
                          )
                        else if (b is BCode)
                          GeoCodeView(
                              code: b.code, lang: b.lang, accent: accent),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class TopBevelClipper extends CustomClipper<Path> {
  const TopBevelClipper();

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

class _TableView extends StatelessWidget {
  final BTable table;
  final Color accent;

  const _TableView({required this.table, required this.accent});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final border = BorderSide(color: palette.border);

    return ClipRect(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Table(
          border: TableBorder(
            horizontalInside: border,
            verticalInside: border,
            top: border,
            bottom: border,
            left: border,
            right: border,
          ),
          defaultColumnWidth: const IntrinsicColumnWidth(),
          children: [
            TableRow(
              decoration: BoxDecoration(color: accent.withValues(alpha: 0.10)),
              children: [
                for (final h in table.header)
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Text(
                      h,
                      style: TextStyle(
                        color: palette.fgPrimary,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
              ],
            ),
            for (final row in table.rows)
              TableRow(
                children: [
                  for (final cell in row)
                    Padding(
                      padding: const EdgeInsets.all(8),
                      child: Text(
                        cell,
                        style: TextStyle(
                            color: palette.fgSecondary,
                            fontSize: 12.5,
                            height: 1.45),
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _ImagePlaceholder extends StatelessWidget {
  final String alt;
  final Color accent;

  const _ImagePlaceholder({required this.alt, required this.accent});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Container(
      height: 84,
      decoration: ShapeDecoration(
        color: palette.bgSurface,
        shape: BeveledRectangleBorder(
          borderRadius: const BorderRadius.only(
              topRight: Radius.circular(GeoRadius.bevel)),
          side: BorderSide(color: palette.border),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 12,
            height: 12,
            transform: Matrix4.rotationZ(0.79),
            decoration:
                BoxDecoration(border: Border.all(color: accent, width: 1.5)),
          ),
          const SizedBox(width: 10),
          Text(
            alt.isEmpty ? '[图]' : '[图] $alt',
            style: TextStyle(color: palette.fgTertiary, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

InlineSpan buildInline(
  BuildContext context,
  List<MdInline> inlines,
  Color accent, {
  double baseSize = 15.5,
  bool bold = false,
}) {
  final palette = geoOf(context);
  final spans = <InlineSpan>[];

  for (final inline in inlines) {
    if (inline is MintPlain) {
      if (inline.text.isEmpty) continue;
      spans.add(
        TextSpan(
          text: inline.text,
          style: TextStyle(
            color: palette.fgPrimary,
            fontSize: baseSize,
            fontWeight:
                (bold || inline.bold) ? FontWeight.w700 : FontWeight.w400,
            fontStyle: inline.italic ? FontStyle.italic : FontStyle.normal,
            decoration: inline.strike
                ? TextDecoration.lineThrough
                : TextDecoration.none,
            height: 1.625,
          ),
        ),
      );
    } else if (inline is MintCode) {
      spans.add(
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 2),
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
            decoration: ShapeDecoration(
              color: palette.codeBg,
              shape: BeveledRectangleBorder(
                borderRadius:
                    const BorderRadius.only(topRight: Radius.circular(4)),
                side: BorderSide(color: palette.border),
              ),
            ),
            child: Text(
              inline.text,
              style: TextStyle(
                color: palette.accent,
                fontSize: baseSize * 0.9,
                fontFamilyFallback: const ['monospace'],
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      );
    } else if (inline is MintLink) {
      spans.add(
        TextSpan(
          text: inline.text,
          style: TextStyle(
            color: accent,
            fontSize: baseSize,
            decoration: TextDecoration.underline,
            decorationColor: accent.withValues(alpha: 0.4),
            height: 1.625,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
          ),
          recognizer: TapGestureRecognizer()
            ..onTap = () => GeoExternal.open(inline.href),
        ),
      );
    } else if (inline is MintMath) {
      spans.add(
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: GeoMathView(expr: inline.expr, block: false, accent: accent),
        ),
      );
    } else if (inline is MintImg) {
      spans.add(
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: Text(
            inline.alt.isEmpty ? '[图]' : '[图] ${inline.alt}',
            style:
                TextStyle(color: palette.fgTertiary, fontSize: baseSize * 0.85),
          ),
        ),
      );
    }
  }

  return TextSpan(children: spans);
}

// 数学公式视图 — flutter_math_fork 原生渲染，渲染失败回退原始文本。
class GeoMathView extends StatelessWidget {
  final String expr;
  final bool block;
  final Color accent;

  const GeoMathView(
      {super.key,
      required this.expr,
      required this.block,
      required this.accent});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final style =
        TextStyle(color: palette.fgPrimary, fontSize: block ? 17 : 15);

    final math = Math.tex(
      expr,
      textStyle: style,
      onErrorFallback: (err) => Text(
        expr,
        style: style.copyWith(
          color: palette.fgTertiary,
          fontFamilyFallback: const ['monospace'],
          fontSize: (block ? 17 : 15) * 0.85,
        ),
      ),
    );

    if (block) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: ShapeDecoration(
          color: palette.bgSurface,
          shape: BeveledRectangleBorder(
            borderRadius: const BorderRadius.only(
                topRight: Radius.circular(GeoRadius.bevel)),
            side: BorderSide(color: palette.border),
          ),
        ),
        child: Center(
            child: SingleChildScrollView(
                scrollDirection: Axis.horizontal, child: math)),
      );
    }
    return math;
  }
}
