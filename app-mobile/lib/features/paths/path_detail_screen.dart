import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models.dart';
import '../../core/tokens.dart';
import '../../data/prefs.dart';
import '../../data/repositories.dart';
import '../../design/geo_background.dart';
import '../../design/geo_dock.dart';
import '../../design/geo_motion.dart';
import '../../design/geo_press.dart';
import '../common.dart';

class PathDetailScreen extends ConsumerWidget {
  final String moduleId;

  const PathDetailScreen({super.key, required this.moduleId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = geoOf(context);
    final pathAsync = ref.watch(modulePathProvider(moduleId));
    final modules = ref.watch(modulesProvider).value;
    final progress = ref.watch(progressProvider);

    ModuleInfo? module;
    if (modules != null) {
      for (final m in modules.modules) {
        if (m.id == moduleId) {
          module = m;
          break;
        }
      }
    }
    final accent = module != null && module.categories.isNotEmpty
        ? Color(
            modules?.categoryColors[module.categories.first]?.toUnsigned(32) ??
                0xFF39C5BB)
        : palette.accent;

    return Scaffold(
      backgroundColor: palette.bgBase,
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
                child: pathAsync.when(
                  loading: () => const GeoLoading(),
                  error: (e, _) => GeoErrorView(
                    message: '路线加载失败',
                    onRetry: () => ref.invalidate(modulePathProvider(moduleId)),
                  ),
                  data: (path) => _PathDetailBody(
                      path: path,
                      accent: accent,
                      progress: progress,
                      moduleTitle: module?.title),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PathDetailBody extends ConsumerWidget {
  final ModulePath path;
  final Color accent;
  final Map<String, int> progress;
  final String? moduleTitle;

  const _PathDetailBody(
      {required this.path,
      required this.accent,
      required this.progress,
      required this.moduleTitle});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = geoOf(context);
    var entranceIdx = 0;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 48),
      children: [
        GeoEntrance(
          index: entranceIdx++,
          child: Padding(
            padding: const EdgeInsets.only(top: 18, bottom: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GeoMicroLabel(
                    text: 'PATH // ${path.module.toUpperCase()}',
                    color: accent),
                const SizedBox(height: 8),
                Text(
                  '${path.stages.length} 阶段学习路线',
                  style: TextStyle(
                      color: palette.fgPrimary,
                      fontSize: 24,
                      fontWeight: FontWeight.w900),
                ),
                if (path.summary.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    path.summary,
                    style: TextStyle(
                        color: palette.fgSecondary, fontSize: 13, height: 1.5),
                  ),
                ],
              ],
            ),
          ),
        ),
        for (var s = 0; s < path.stages.length; s++) ...[
          GeoEntrance(
            index: entranceIdx++,
            child: _StageBlock(
              stage: path.stages[s],
              stageNumber: s + 1,
              accent: accent,
              progress: progress,
              moduleId: path.module,
            ),
          ),
        ],
      ],
    );
  }
}

class _StageBlock extends StatelessWidget {
  final PathStage stage;
  final int stageNumber;
  final Color accent;
  final Map<String, int> progress;
  final String moduleId;

  const _StageBlock({
    required this.stage,
    required this.stageNumber,
    required this.accent,
    required this.progress,
    required this.moduleId,
  });

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                transform: Matrix4.skewY(-0.15),
                color: accent.withValues(alpha: 0.16),
                child: Text(
                  stageNumber.toString().padLeft(2, '0'),
                  style: TextStyle(
                    color: accent,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      stage.title,
                      style: TextStyle(
                          color: palette.fgPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w800),
                    ),
                    if (stage.subtitle.isNotEmpty)
                      Text(stage.subtitle,
                          style: TextStyle(
                              color: palette.fgTertiary, fontSize: 11.5)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // 数据契约：node.doc 为同模块文档 slug。
          for (final node in stage.nodes)
            _NodeRow(
              node: node,
              accent: accent,
              done: progress.containsKey('$moduleId/${node.doc}'),
              moduleId: moduleId,
            ),
        ],
      ),
    );
  }
}

class _NodeRow extends StatelessWidget {
  final PathNode node;
  final Color accent;
  final bool done;
  final String moduleId;

  const _NodeRow({
    required this.node,
    required this.accent,
    required this.done,
    required this.moduleId,
  });

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 8),
      child: GeoPress(
        onTap: node.doc.isEmpty
            ? null
            : () => context.push('/doc/$moduleId/${node.doc}'),
        bracketColor: accent,
        bevel: GeoRadius.bevelSmall,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
              AnimatedScale(
                scale: done ? 1 : 0,
                duration: GeoMotion.normal,
                curve: Curves.elasticOut,
                child:
                    Icon(Icons.check_circle_outline, size: 16, color: accent),
              ),
              if (done) const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      node.title,
                      style: TextStyle(
                        color: palette.fgPrimary,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (node.desc.isNotEmpty)
                      Text(
                        node.desc,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style:
                            TextStyle(color: palette.fgTertiary, fontSize: 11),
                      ),
                  ],
                ),
              ),
              DifficultyBadge(difficulty: node.difficulty, palette: palette),
            ],
          ),
        ),
      ),
    );
  }
}
