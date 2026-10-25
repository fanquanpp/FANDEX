import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/frontmatter.dart';
import '../../core/models.dart';
import '../../core/tokens.dart';
import '../../data/prefs.dart';
import '../../data/repositories.dart';
import '../../design/geo_background.dart';
import '../../design/geo_dock.dart';
import '../../design/geo_drawer.dart';
import '../../design/geo_motion.dart';
import '../../design/geo_press.dart';
import '../../platform/haptics.dart';
import '../common.dart';
import 'markdown/blocks.dart';
import 'markdown/renderer.dart';

class ReaderScreen extends ConsumerStatefulWidget {
  final String moduleId;
  final String slug;

  const ReaderScreen({super.key, required this.moduleId, required this.slug});

  @override
  ConsumerState<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends ConsumerState<ReaderScreen> {
  final ScrollController _scroll = ScrollController();
  final Map<int, GlobalKey> _headingKeys = {};
  final List<(int, String)> _headings = [];
  double _progress = 0;
  bool _historyRecorded = false;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  @override
  void didUpdateWidget(ReaderScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.slug != widget.slug) {
      _historyRecorded = false;
      _headings.clear();
      _headingKeys.clear();
      _progress = 0;
      if (_scroll.hasClients) _scroll.jumpTo(0);
    }
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scroll.hasClients) return;
    final max = _scroll.position.maxScrollExtent;
    final p = max <= 0 ? 0.0 : (_scroll.offset / max).clamp(0.0, 1.0);
    if ((p - _progress).abs() > 0.004) {
      setState(() => _progress = p);
    }
  }

  Future<void> _showToc() async {
    if (_headings.isEmpty) return;
    GeoHaptics.play(GeoHapticPattern.tick);
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      shape: const BeveledRectangleBorder(),
      builder: (context) => _TocSheet(
          headings: _headings, palette: geoOf(context), onPick: _jumpTo),
    );
  }

  void _jumpTo(int index) {
    Navigator.of(context).pop();
    final key = _headingKeys[index];
    final keyContext = key?.currentContext;
    if (keyContext != null) {
      Scrollable.ensureVisible(
        keyContext,
        duration: GeoMotion.slow,
        curve: Curves.easeOut,
        alignment: 0.05,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final docAsync =
        ref.watch(docProvider(DocRef(widget.moduleId, widget.slug)));
    final settingsCtrl = ref.read(settingsProvider.notifier);
    final settings = ref.watch(settingsProvider);
    final done = ref.watch(progressProvider
        .select((p) => p.containsKey('${widget.moduleId}/${widget.slug}')));

    // 数据就绪后登记目录锚点。
    ref.listen(docProvider(DocRef(widget.moduleId, widget.slug)), (prev, next) {
      final doc = next.value;
      if (doc == null) return;
      if (!_historyRecorded) {
        _historyRecorded = true;
        final result = parseMarkdown(doc.body);
        _headings.clear();
        _headings.addAll(result.headings);
      }
    });

    final accent = _accentOf(palette);

    return Scaffold(
      backgroundColor: palette.bgBase,
      drawer: GeoDrawer(location: '/doc/${widget.moduleId}/${widget.slug}'),
      body: GeoBackdrop(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              GeoDock(
                title: docAsync.value?.entry.title ?? widget.slug,
                accent: accent,
                progress: _progress,
                leading: IconButton(
                  icon: Icon(Icons.arrow_back, color: palette.fgPrimary),
                  onPressed: () => context.pop(),
                ),
                actions: [
                  IconButton(
                    tooltip: '缩小字号',
                    icon: Icon(Icons.remove,
                        size: 18, color: palette.fgSecondary),
                    onPressed: () =>
                        settingsCtrl.setFontScale(settings.fontScale - 0.1),
                  ),
                  IconButton(
                    tooltip: '放大字号',
                    icon: Icon(Icons.add, size: 18, color: palette.fgSecondary),
                    onPressed: () =>
                        settingsCtrl.setFontScale(settings.fontScale + 0.1),
                  ),
                  IconButton(
                    tooltip: '目录',
                    icon: Icon(Icons.format_list_bulleted,
                        size: 19, color: palette.fgSecondary),
                    onPressed: _showToc,
                  ),
                ],
                segment: [
                  DockSegmentAction(
                    icon:
                        done ? Icons.check_box : Icons.check_box_outline_blank,
                    tooltip: done ? '取消完成' : '标记完成',
                    onTap: () {
                      GeoHaptics.play(GeoHapticPattern.success);
                      ref
                          .read(progressProvider.notifier)
                          .setDone(widget.moduleId, widget.slug, !done);
                    },
                    active: done,
                  ),
                  DockSegmentAction(
                      icon: Icons.home_outlined,
                      tooltip: '首页',
                      onTap: () => context.go('/')),
                  DockSegmentAction(
                    icon: Icons.contrast,
                    tooltip: '主题快切',
                    onTap: () {
                      final ctrl = ref.read(settingsProvider.notifier);
                      ctrl.setTheme(ctrl.nextTheme());
                    },
                  ),
                ],
              ),
              Expanded(
                child: docAsync.when(
                  loading: () => const GeoLoading(),
                  error: (e, _) => GeoErrorView(
                    message: '文档加载失败',
                    onRetry: () => ref.invalidate(
                        docProvider(DocRef(widget.moduleId, widget.slug))),
                  ),
                  data: (doc) => _ReaderBody(
                    doc: doc,
                    accent: accent,
                    headingKeys: _headingKeys,
                    scroll: _scroll,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _accentOf(GeoPalette palette) {
    final modules = ref.read(modulesProvider).value;
    final entry = ref
        .read(docProvider(DocRef(widget.moduleId, widget.slug)))
        .value
        ?.entry;
    final category = entry?.category;
    if (category != null && category.isNotEmpty && modules != null) {
      final hex = modules.categoryColors[category];
      if (hex != null) return Color(hex.toUnsigned(32));
    }
    return palette.accent;
  }
}

class _ReaderBody extends ConsumerWidget {
  final ParsedDoc doc;
  final Color accent;
  final Map<int, GlobalKey> headingKeys;
  final ScrollController scroll;

  const _ReaderBody(
      {required this.doc,
      required this.accent,
      required this.headingKeys,
      required this.scroll});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = geoOf(context);
    final result = parseMarkdown(doc.body);
    // 为每个标题预建锚点，目录跳转经 ensureVisible 定位。
    for (var i = 0; i < result.headings.length; i++) {
      headingKeys.putIfAbsent(i, GlobalKey.new);
    }
    final entries = ref.watch(docIndexProvider).value ?? const <DocEntry>[];
    final moduleDocs =
        entries.where((d) => d.module == doc.entry.module).toList();

    DocEntry? prev;
    DocEntry? next;
    for (var i = 0; i < moduleDocs.length; i++) {
      if (moduleDocs[i].slug == doc.entry.slug) {
        if (i > 0) prev = moduleDocs[i - 1];
        if (i < moduleDocs.length - 1) next = moduleDocs[i + 1];
        break;
      }
    }

    final widgets = renderBlocks(context, result.blocks,
        accent: accent, headingKeys: headingKeys);
    var entranceIdx = 0;

    return ListView(
      controller: scroll,
      padding: const EdgeInsets.fromLTRB(18, 0, 18, 48),
      children: [
        // 元信息头
        GeoEntrance(
          index: entranceIdx++,
          child: Padding(
            padding: const EdgeInsets.only(top: 18),
            child: Row(
              children: [
                DifficultyBadge(
                    difficulty: doc.entry.difficulty, palette: palette),
                const SizedBox(width: 10),
                Text(
                  '更新于 ${doc.entry.updated.isEmpty ? '-' : doc.entry.updated}',
                  style: TextStyle(color: palette.fgTertiary, fontSize: 11),
                ),
                const Spacer(),
                Text(
                  '约 ${readingMinutes(doc.body)} 分钟',
                  style: TextStyle(color: palette.fgTertiary, fontSize: 11),
                ),
              ],
            ),
          ),
        ),
        if (doc.prerequisites.isNotEmpty) ...[
          GeoEntrance(
            index: entranceIdx++,
            child: _LinkStrip(
              label: '前置知识',
              color: palette.warning,
              items: doc.prerequisites,
              onTap: (target) => _openRef(context, target),
            ),
          ),
        ],
        const SizedBox(height: 14),
        for (final w in widgets) GeoEntrance(index: entranceIdx++, child: w),
        if (doc.related.isNotEmpty) ...[
          SectionHeader(label: '相关文档', color: accent),
          _LinkStrip(
            label: 'RELATED',
            color: accent,
            items: doc.related,
            onTap: (target) => _openRef(context, target),
          ),
        ],
        const SizedBox(height: 26),
        if (prev != null || next != null)
          _PersistentDocNav(prev: prev, next: next, accent: accent),
      ],
    );
  }

  void _openRef(BuildContext context, String target) {
    // 引用格式：'模块/文件名'。
    final parts = target.split('/');
    if (parts.length == 2) {
      context.push('/doc/${parts[0]}/${parts[1]}');
    }
  }
}

class _LinkStrip extends StatelessWidget {
  final String label;
  final Color color;
  final List<String> items;
  final ValueChanged<String> onTap;

  const _LinkStrip(
      {required this.label,
      required this.color,
      required this.items,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
                color: color,
                fontSize: 10,
                letterSpacing: 2.4,
                fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final item in items)
                GeoPress(
                  onTap: () => onTap(item),
                  bracketColor: color,
                  bevel: GeoRadius.bevelTiny,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: ShapeDecoration(
                      color: palette.bgSurface,
                      shape: BeveledRectangleBorder(
                        borderRadius: const BorderRadius.only(
                            topRight: Radius.circular(GeoRadius.bevelTiny)),
                        side: BorderSide(color: palette.border),
                      ),
                    ),
                    child: Text(item,
                        style: TextStyle(
                            color: palette.fgSecondary, fontSize: 11.5)),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PersistentDocNav extends StatelessWidget {
  final DocEntry? prev;
  final DocEntry? next;
  final Color accent;

  const _PersistentDocNav(
      {required this.prev, required this.next, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _NavCard(
            entry: prev,
            label: 'PREV',
            icon: Icons.arrow_back,
            accent: accent,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _NavCard(
            entry: next,
            label: 'NEXT',
            icon: Icons.arrow_forward,
            accent: accent,
          ),
        ),
      ],
    );
  }
}

class _NavCard extends StatelessWidget {
  final DocEntry? entry;
  final String label;
  final IconData icon;
  final Color accent;

  const _NavCard(
      {required this.entry,
      required this.label,
      required this.icon,
      required this.accent});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    if (entry == null) return const SizedBox.shrink();
    return GeoPress(
      onTap: () => context.push('/doc/${entry!.module}/${entry!.slug}'),
      bracketColor: accent,
      bevel: GeoRadius.bevelSmall,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: ShapeDecoration(
          color: palette.bgSurface,
          shape: BeveledRectangleBorder(
            borderRadius: const BorderRadius.only(
                topRight: Radius.circular(GeoRadius.bevelSmall)),
            side: BorderSide(color: palette.border),
          ),
        ),
        child: Row(
          children: [
            Icon(icon, size: 14, color: accent),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                entry!.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    color: palette.fgPrimary,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TocSheet extends StatelessWidget {
  final List<(int, String)> headings;
  final GeoPalette palette;
  final ValueChanged<int> onPick;

  const _TocSheet(
      {required this.headings, required this.palette, required this.onPick});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints:
          BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.62),
      decoration: ShapeDecoration(
        color: palette.bgElevated,
        shape: BeveledRectangleBorder(
          borderRadius:
              BorderRadius.only(topLeft: Radius.circular(GeoRadius.bevel)),
          side: BorderSide(color: palette.border),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
              child: Text(
                '目录 // TOC',
                style: TextStyle(
                  color: palette.accent,
                  fontSize: 10,
                  letterSpacing: 3,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.only(bottom: 20),
                itemCount: headings.length,
                itemBuilder: (context, i) {
                  final (level, text) = headings[i];
                  return InkWell(
                    onTap: () => onPick(i),
                    child: Container(
                      padding: EdgeInsets.only(
                        left: 18 + (level - 1) * 16.0,
                        right: 18,
                        top: 9,
                        bottom: 9,
                      ),
                      child: Row(
                        children: [
                          if (level <= 2)
                            Container(
                              width: 3,
                              height: 12,
                              margin: const EdgeInsets.only(right: 10),
                              color: palette.accent
                                  .withValues(alpha: level == 1 ? 0.9 : 0.45),
                            ),
                          Expanded(
                            child: Text(
                              text,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: level <= 2
                                    ? palette.fgPrimary
                                    : palette.fgSecondary,
                                fontSize: level <= 2 ? 13.5 : 12.5,
                                fontWeight: level == 1
                                    ? FontWeight.w700
                                    : FontWeight.w400,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
