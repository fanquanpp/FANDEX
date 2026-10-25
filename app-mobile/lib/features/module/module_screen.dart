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

class ModuleScreen extends ConsumerWidget {
  final String moduleId;

  const ModuleScreen({super.key, required this.moduleId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = geoOf(context);
    final modules = ref.watch(modulesProvider);
    final docs = ref.watch(docIndexProvider);
    final progress = ref.watch(progressProvider);

    final moduleAsync = modules.when(
      loading: () => null,
      error: (e, _) => null,
      data: (data) {
        for (final m in data.modules) {
          if (m.id == moduleId) return m;
        }
        return null;
      },
    );
    final module = moduleAsync;
    final modulesData = modules.value;
    final accent = module != null && module.categories.isNotEmpty
        ? Color(modulesData?.categoryColors[module.categories.first]
                ?.toUnsigned(32) ??
            0xFF39C5BB)
        : palette.accent;

    final moduleDocs =
        docs.value?.where((d) => d.module == moduleId).toList() ??
            const <DocEntry>[];

    return Scaffold(
      backgroundColor: palette.bgBase,
      drawer: GeoDrawer(location: '/module/$moduleId'),
      body: GeoBackdrop(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              GeoDock(
                title: module?.title ?? moduleId,
                accent: accent,
                leading: IconButton(
                  icon: Icon(Icons.arrow_back, color: palette.fgPrimary),
                  onPressed: () => context.pop(),
                ),
                segment: [
                  DockSegmentAction(
                      icon: Icons.home_outlined,
                      tooltip: '首页',
                      onTap: () => context.go('/')),
                  DockSegmentAction(
                    icon: Icons.open_in_new,
                    tooltip: '源仓库',
                    onTap: () =>
                        GeoExternal.open('https://github.com/fanquanpp/FANDEX'),
                  ),
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
                child: module == null
                    ? const GeoLoading()
                    : _ModuleBody(
                        module: module,
                        docs: moduleDocs,
                        progress: progress,
                        accent: accent),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModuleBody extends ConsumerWidget {
  final ModuleInfo module;
  final List<DocEntry> docs;
  final Map<String, int> progress;
  final Color accent;

  const _ModuleBody(
      {required this.module,
      required this.docs,
      required this.progress,
      required this.accent});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = geoOf(context);
    final doneCount =
        docs.where((d) => progress.containsKey('${d.module}/${d.slug}')).length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 48),
      children: [
        GeoEntrance(
          index: 0,
          child: Padding(
            padding: const EdgeInsets.only(top: 30),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GeoMicroLabel(
                    text: '${module.id.toUpperCase()} // MODULE',
                    color: accent),
                const SizedBox(height: 8),
                Text(
                  module.title,
                  style: TextStyle(
                      color: palette.fgPrimary,
                      fontSize: 26,
                      fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                Text(
                  module.description,
                  style: TextStyle(
                      color: palette.fgSecondary, fontSize: 13, height: 1.5),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Text(
                      '${docs.length} 篇 · 已读 $doneCount',
                      style: TextStyle(color: palette.fgTertiary, fontSize: 12),
                    ),
                  ],
                ),
                if (module.officialDocs.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final od in module.officialDocs)
                        GeoPress(
                          onTap: () => GeoExternal.open(od.url),
                          bracketColor: accent,
                          bevel: GeoRadius.bevelTiny,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 5),
                            decoration: ShapeDecoration(
                              color: palette.bgSurface,
                              shape: BeveledRectangleBorder(
                                borderRadius: const BorderRadius.only(
                                    topRight:
                                        Radius.circular(GeoRadius.bevelTiny)),
                                side: BorderSide(color: palette.border),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.link, size: 12, color: accent),
                                const SizedBox(width: 5),
                                Text(od.label,
                                    style: TextStyle(
                                        color: palette.fgSecondary,
                                        fontSize: 11)),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
        SectionHeader(
            label: '文档列表', color: accent, trailing: '${docs.length} 篇'),
        ...docs.asMap().entries.map((e) {
          final i = e.key;
          final d = e.value;
          final done = progress.containsKey('${d.module}/${d.slug}');
          return GeoEntrance(
            index: i + 1,
            child: _DocRow(doc: d, accent: accent, done: done, order: i + 1),
          );
        }),
      ],
    );
  }
}

class _DocRow extends StatelessWidget {
  final DocEntry doc;
  final Color accent;
  final bool done;
  final int order;

  const _DocRow(
      {required this.doc,
      required this.accent,
      required this.done,
      required this.order});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GeoPress(
        onTap: () => context.go('/doc/${doc.module}/${doc.slug}'),
        bracketColor: accent,
        bevel: GeoRadius.bevelSmall,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
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
              Container(
                  width: 3,
                  height: 26,
                  color: accent,
                  transform: Matrix4.skewY(-0.3)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      doc.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          color: palette.fgPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w600),
                    ),
                    if (doc.description.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        doc.description,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style:
                            TextStyle(color: palette.fgTertiary, fontSize: 11),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              DifficultyBadge(difficulty: doc.difficulty, palette: palette),
              const SizedBox(width: 10),
              AnimatedScale(
                scale: done ? 1 : 0,
                duration: GeoMotion.normal,
                curve: Curves.elasticOut,
                child: Icon(Icons.check_box_outlined, size: 17, color: accent),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
