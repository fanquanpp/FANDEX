import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models.dart';
import '../../core/tokens.dart';
import '../../data/prefs.dart';
import '../../data/repositories.dart';
import '../../design/geo_background.dart';
import '../../design/geo_dock.dart';
import '../../design/geo_drawer.dart';
import '../../design/geo_motion.dart';
import '../../design/geo_press.dart';
import '../../platform/external.dart';
import '../common.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String? _filter;

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final modules = ref.watch(modulesProvider);
    final docs = ref.watch(docIndexProvider);

    return Scaffold(
      backgroundColor: palette.bgBase,
      drawer: GeoDrawer(location: GoRouterState.of(context).matchedLocation),
      body: GeoBackdrop(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              GeoDock(
                title: 'FANDEX',
                accent: palette.accent,
                leading: Builder(
                  builder: (ctx) => IconButton(
                    icon: Icon(Icons.menu, color: palette.fgPrimary),
                    onPressed: () => Scaffold.of(ctx).openDrawer(),
                  ),
                ),
                segment: _segments(context, palette),
              ),
              Expanded(
                child: modules.when(
                  loading: () => const GeoLoading(),
                  error: (e, _) => GeoErrorView(
                    message: '内容加载失败',
                    onRetry: () => ref.invalidate(modulesProvider),
                  ),
                  data: (modulesData) {
                    final docIndex = docs.value ?? const <DocEntry>[];
                    return _HomeBody(
                      modulesData: modulesData,
                      docIndex: docIndex,
                      filter: _filter,
                      onFilter: (f) =>
                          setState(() => _filter = _filter == f ? null : f),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<DockSegmentAction> _segments(BuildContext context, GeoPalette palette) {
    return [
      DockSegmentAction(
          icon: Icons.code,
          tooltip: '语法速览',
          onTap: () => context.go('/syntax')),
      DockSegmentAction(
          icon: Icons.explore_outlined,
          tooltip: '学习路线',
          onTap: () => context.go('/paths')),
      DockSegmentAction(
          icon: Icons.search,
          tooltip: '搜索',
          onTap: () => context.go('/search')),
      DockSegmentAction(
        icon: Icons.open_in_new,
        tooltip: '源仓库',
        onTap: () => GeoExternal.open('https://github.com/fanquanpp/FANDEX'),
      ),
      DockSegmentAction(
        icon: Icons.contrast,
        tooltip: '主题快切',
        onTap: () {
          final ctrl = ref.read(settingsProvider.notifier);
          ctrl.setTheme(ctrl.nextTheme());
        },
      ),
    ];
  }
}

class _HomeBody extends ConsumerWidget {
  final ModulesData modulesData;
  final List<DocEntry> docIndex;
  final String? filter;
  final ValueChanged<String> onFilter;

  const _HomeBody({
    required this.modulesData,
    required this.docIndex,
    required this.filter,
    required this.onFilter,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final counts = <String, int>{};
    for (final d in docIndex) {
      counts[d.module] = (counts[d.module] ?? 0) + 1;
    }

    final grouped = <String, List<ModuleInfo>>{};
    for (final m in modulesData.modules) {
      if (filter != null && !m.categories.contains(filter)) continue;
      final cat = m.categories.isNotEmpty ? m.categories.first : 'tools';
      grouped.putIfAbsent(cat, () => []).add(m);
    }
    final order = modulesData.categoryOrder.isEmpty
        ? grouped.keys.toList()
        : modulesData.categoryOrder;

    var entranceIndex = 0;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 48),
      children: [
        GeoEntrance(
          index: entranceIndex++,
          child:
              _HeroHeader(modulesData: modulesData, docCount: docIndex.length),
        ),
        GeoEntrance(
          index: entranceIndex++,
          child: _CategoryChips(
            modulesData: modulesData,
            filter: filter,
            onFilter: onFilter,
          ),
        ),
        for (final cat in order)
          if (grouped[cat] != null && grouped[cat]!.isNotEmpty) ...[
            SectionHeader(
              label: modulesData.categoryLabels[cat] ?? cat,
              color: Color(modulesData.categoryColors[cat]?.toUnsigned(32) ??
                  0xFF39C5BB),
              trailing: '${grouped[cat]!.length} 模块',
            ),
            ...grouped[cat]!.map((m) {
              return GeoEntrance(
                index: entranceIndex++,
                child: _ModuleCard(
                  module: m,
                  color: Color(
                      modulesData.categoryColors[cat]?.toUnsigned(32) ??
                          0xFF39C5BB),
                  number: modulesData.modules.indexOf(m) + 1,
                  docCount: counts[m.id] ?? 0,
                ),
              );
            }),
          ],
      ],
    );
  }
}

class _HeroHeader extends StatelessWidget {
  final ModulesData modulesData;
  final int docCount;

  const _HeroHeader({required this.modulesData, required this.docCount});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Padding(
      padding: const EdgeInsets.only(top: 26, bottom: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GeoMicroLabel(text: '01 // FULL-STACK INDEX', color: palette.accent),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'FANDEX',
                style: TextStyle(
                    color: palette.fgPrimary,
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    height: 1.1,
                    letterSpacing: 3),
              ),
              const SizedBox(width: 10),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Container(
                  width: 14,
                  height: 14,
                  transform: Matrix4.rotationZ(0.79),
                  decoration: BoxDecoration(
                      border: Border.all(color: palette.accent, width: 2)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            '${modulesData.categoryOrder.length} 分类 · ${modulesData.modules.length} 模块 · $docCount 篇文档',
            style: TextStyle(color: palette.fgSecondary, fontSize: 13),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              for (var i = 0; i < 7; i++)
                Container(
                  width: 18 + i * 4.0,
                  height: 3,
                  margin: const EdgeInsets.only(right: 4),
                  color: i == 6 ? palette.accent : palette.border,
                  transform: Matrix4.skewY(-0.5),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  final ModulesData modulesData;
  final String? filter;
  final ValueChanged<String> onFilter;

  const _CategoryChips(
      {required this.modulesData,
      required this.filter,
      required this.onFilter});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    // 对齐 web 端：无模块归属的分类（如数学）不显示筛选入口。
    final catsWithModules = modulesData.categoryOrder
        .where((c) => modulesData.modules.any((m) => m.categories.contains(c)))
        .toList();
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (final cat in catsWithModules)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GeoSelectionPulse(
                selected: filter == cat,
                child: GeoPress(
                  onTap: () => onFilter(cat),
                  bracketColor: Color(
                      modulesData.categoryColors[cat]?.toUnsigned(32) ??
                          0xFF39C5BB),
                  bevel: GeoRadius.bevelSmall,
                  child: AnimatedContainer(
                    duration: GeoMotion.fast,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: ShapeDecoration(
                      color: filter == cat
                          ? Color(modulesData.categoryColors[cat]
                                      ?.toUnsigned(32) ??
                                  0xFF39C5BB)
                              .withValues(alpha: 0.16)
                          : palette.bgSurface,
                      shape: BeveledRectangleBorder(
                        borderRadius: const BorderRadius.only(
                            topRight: Radius.circular(GeoRadius.bevelSmall)),
                        side: BorderSide(
                          color: filter == cat
                              ? Color(modulesData.categoryColors[cat]
                                      ?.toUnsigned(32) ??
                                  0xFF39C5BB)
                              : palette.border,
                        ),
                      ),
                    ),
                    child: Text(
                      modulesData.categoryLabels[cat] ?? cat,
                      style: TextStyle(
                        color: filter == cat
                            ? Color(modulesData.categoryColors[cat]
                                    ?.toUnsigned(32) ??
                                0xFF39C5BB)
                            : palette.fgSecondary,
                        fontSize: 12,
                        fontWeight:
                            filter == cat ? FontWeight.w800 : FontWeight.w400,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ModuleCard extends ConsumerWidget {
  final ModuleInfo module;
  final Color color;
  final int number;
  final int docCount;

  const _ModuleCard(
      {required this.module,
      required this.color,
      required this.number,
      required this.docCount});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = geoOf(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GeoPress(
        onTap: () => context.push('/module/${module.id}'),
        bracketColor: color,
        child: Container(
          decoration: ShapeDecoration(
            color: palette.bgSurface,
            shape: BeveledRectangleBorder(
              borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(GeoRadius.bevel)),
              side: BorderSide(color: palette.border),
            ),
          ),
          // IntrinsicHeight：ListView 内无界高度下 stretch 行需要先解析固有高度。
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: 52,
                  color: color.withValues(alpha: 0.12),
                  alignment: Alignment.center,
                  child: Text(
                    number.toString().padLeft(2, '0'),
                    style: TextStyle(
                      color: color,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          module.title,
                          style: TextStyle(
                              color: palette.fgPrimary,
                              fontSize: 15,
                              fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          module.description,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              color: palette.fgTertiary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(right: 14),
                  child: Center(
                    child: Text(
                      '$docCount 篇',
                      style: TextStyle(color: palette.fgTertiary, fontSize: 11),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
