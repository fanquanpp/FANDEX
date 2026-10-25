import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models.dart';
import '../../core/tokens.dart';
import '../../data/repositories.dart';
import '../../design/geo_background.dart';
import '../../design/geo_dock.dart';
import '../../design/geo_motion.dart';
import '../common.dart';
import '../../design/geo_painters.dart';
import 'code_clip.dart';

class SyntaxDetailScreen extends ConsumerStatefulWidget {
  final String langId;

  const SyntaxDetailScreen({super.key, required this.langId});

  @override
  ConsumerState<SyntaxDetailScreen> createState() => _SyntaxDetailScreenState();
}

class _SyntaxDetailScreenState extends ConsumerState<SyntaxDetailScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final cardsAsync = ref.watch(syntaxCardsProvider(widget.langId));
    final langs =
        ref.watch(syntaxLanguagesProvider).value ?? const <SyntaxLanguage>[];

    SyntaxLanguage? lang;
    for (final l in langs) {
      if (l.id == widget.langId) {
        lang = l;
        break;
      }
    }
    final color = _langColor(lang);

    return Scaffold(
      backgroundColor: palette.bgBase,
      body: GeoBackdrop(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              GeoDock(
                title: lang?.title ?? widget.langId,
                accent: color,
                leading: IconButton(
                  icon: Icon(Icons.arrow_back, color: palette.fgPrimary),
                  onPressed: () => context.pop(),
                ),
                actions: [
                  IconButton(
                    icon: Icon(Icons.home_outlined,
                        size: 19, color: palette.fgSecondary),
                    onPressed: () => context.go('/'),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: TextField(
                  onChanged: (v) => setState(() => _query = v),
                  style: TextStyle(color: palette.fgPrimary, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: '搜索语法点 / 代码 / 章节',
                    hintStyle:
                        TextStyle(color: palette.fgTertiary, fontSize: 13),
                    prefixIcon:
                        Icon(Icons.search, size: 19, color: palette.fgTertiary),
                    filled: true,
                    fillColor: palette.bgSurface,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: const BorderRadius.only(
                          topRight: Radius.circular(GeoRadius.bevelSmall)),
                      borderSide: BorderSide(color: palette.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: const BorderRadius.only(
                          topRight: Radius.circular(GeoRadius.bevelSmall)),
                      borderSide: BorderSide(color: color),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: cardsAsync.when(
                  loading: () => const GeoLoading(),
                  error: (e, _) => GeoErrorView(
                      message: '加载失败',
                      onRetry: () =>
                          ref.invalidate(syntaxCardsProvider(widget.langId))),
                  data: (cards) =>
                      _CardsBody(cards: cards, query: _query, color: color),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _langColor(SyntaxLanguage? lang) {
    final hex = (lang?.color ?? '#39C5BB').replaceFirst('#', '');
    final v = int.tryParse(hex.length == 6 ? 'FF$hex' : hex, radix: 16);
    return Color(v ?? 0xFF39C5BB);
  }
}

class _CardsBody extends ConsumerWidget {
  final List<SyntaxCard> cards;
  final String query;
  final Color color;

  const _CardsBody(
      {required this.cards, required this.query, required this.color});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = geoOf(context);
    final q = query.trim().toLowerCase();
    final filtered = q.isEmpty
        ? cards
        : cards
            .where((c) =>
                c.name.toLowerCase().contains(q) ||
                c.formula.toLowerCase().contains(q) ||
                c.code.toLowerCase().contains(q) ||
                c.section.toLowerCase().contains(q))
            .toList();

    // 按 section 分组。
    final groups = <String, List<SyntaxCard>>{};
    for (final c in filtered) {
      groups.putIfAbsent(c.section.isEmpty ? '通用' : c.section, () => []).add(c);
    }

    // docTitle 反查文档路由。
    final entries = ref.watch(docIndexProvider).value ?? const <DocEntry>[];
    DocEntry? findByTitle(String title) {
      for (final e in entries) {
        if (e.title == title) return e;
      }
      return null;
    }

    var idx = 0;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 48),
      children: [
        for (final entry in groups.entries) ...[
          SectionHeader(
              label: entry.key,
              color: color,
              trailing: '${entry.value.length}'),
          ...entry.value.map((c) {
            final doc = findByTitle(c.docTitle);
            return GeoEntrance(
              index: idx++,
              child: _SyntaxCardView(
                card: c,
                color: color,
                onOpen: doc == null
                    ? null
                    : () => context.push('/doc/${doc.module}/${doc.slug}'),
              ),
            );
          }),
        ],
        if (filtered.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 60),
            child: Column(
              children: [
                CustomPaint(
                  size: const Size(48, 48),
                  painter: WireframePolygonPainter(
                      color: palette.border, sides: 3, vertexDots: false),
                ),
                const SizedBox(height: 14),
                Text('无匹配语法点',
                    style: TextStyle(color: palette.fgTertiary, fontSize: 13)),
              ],
            ),
          ),
      ],
    );
  }
}

class _SyntaxCardView extends StatelessWidget {
  final SyntaxCard card;
  final Color color;
  final VoidCallback? onOpen;

  const _SyntaxCardView({required this.card, required this.color, this.onOpen});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        decoration: ShapeDecoration(
          color: palette.bgSurface,
          shape: BeveledRectangleBorder(
            borderRadius: const BorderRadius.only(
                topRight: Radius.circular(GeoRadius.bevel)),
            side: BorderSide(color: palette.border),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 2),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      card.name,
                      style: TextStyle(
                          color: palette.fgPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w700),
                    ),
                  ),
                  if (onOpen != null)
                    GestureDetector(
                      onTap: onOpen,
                      child: Row(
                        children: [
                          Text(
                            card.docTitle,
                            style: TextStyle(color: color, fontSize: 10.5),
                          ),
                          Icon(Icons.chevron_right, size: 13, color: color),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            if (card.formula.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 6),
                child: Text(
                  card.formula,
                  style: TextStyle(
                      color: palette.fgSecondary, fontSize: 12.5, height: 1.45),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 10),
              child:
                  GeoMiniCode(code: card.code, lang: card.lang, color: color),
            ),
          ],
        ),
      ),
    );
  }
}
