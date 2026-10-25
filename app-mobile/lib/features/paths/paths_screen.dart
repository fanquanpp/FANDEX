import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models.dart';
import '../../core/tokens.dart';
import '../../data/prefs.dart';
import '../../data/repositories.dart';
import '../../design/geo_background.dart';
import '../../design/geo_dock.dart';
import '../../design/geo_painters.dart';
import '../../design/geo_press.dart';

class PathsScreen extends ConsumerWidget {
  const PathsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = geoOf(context);
    final order = ref.watch(pathOrderProvider);
    final modules = ref.watch(modulesProvider);

    return Scaffold(
      backgroundColor: palette.bgBase,
      body: GeoBackdrop(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              GeoDock(
                title: '学习路线',
                accent: palette.accent,
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
                child: order.when(
                  loading: () => const GeoLoading(),
                  error: (e, _) => GeoErrorView(
                      message: '路线数据加载失败',
                      onRetry: () => ref.invalidate(pathOrderProvider)),
                  data: (orderList) {
                    final modulesData = modules.value;
                    return _PathsBody(
                        orderList: orderList, modulesData: modulesData);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PathsBody extends ConsumerWidget {
  final List<String> orderList;
  final ModulesData? modulesData;

  const _PathsBody({required this.orderList, required this.modulesData});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = geoOf(context);
    final progress = ref.watch(progressProvider);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 48),
      children: [
        for (var i = 0; i < orderList.length; i++)
          _PathCard(
            moduleId: orderList[i],
            number: i + 1,
            progress: progress,
            modulesData: modulesData,
          ),
        if (orderList.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 80),
            child: Center(
              child:
                  Text('暂无学习路线', style: TextStyle(color: palette.fgTertiary)),
            ),
          ),
      ],
    );
  }
}

class _PathCard extends ConsumerWidget {
  final String moduleId;
  final int number;
  final Map<String, int> progress;
  final ModulesData? modulesData;

  const _PathCard({
    required this.moduleId,
    required this.number,
    required this.progress,
    required this.modulesData,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = geoOf(context);
    final pathAsync = ref.watch(modulePathProvider(moduleId));

    ModuleInfo? module;
    if (modulesData != null) {
      for (final m in modulesData!.modules) {
        if (m.id == moduleId) {
          module = m;
          break;
        }
      }
    }

    final accent = module != null && module.categories.isNotEmpty
        ? Color(modulesData?.categoryColors[module.categories.first]
                ?.toUnsigned(32) ??
            0xFF39C5BB)
        : palette.accent;

    final path = pathAsync.value;
    var nodeCount = 0;
    var doneCount = 0;
    if (path != null) {
      for (final stage in path.stages) {
        for (final node in stage.nodes) {
          nodeCount++;
          if (progress.containsKey('$moduleId/${node.doc}')) doneCount++;
        }
      }
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GeoPress(
        onTap: () => context.push('/paths/$moduleId'),
        bracketColor: accent,
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
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // IntrinsicHeight：无界高度列表内 stretch 行需要先解析固有高度。
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      width: 52,
                      color: accent.withValues(alpha: 0.12),
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      child: Text(
                        number.toString().padLeft(2, '0'),
                        style: TextStyle(
                          color: accent,
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
                              module?.title ?? moduleId,
                              style: TextStyle(
                                  color: palette.fgPrimary,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              path == null
                                  ? '...'
                                  : '${path.stages.length} 阶段 · $nodeCount 节点 · 已完成 $doneCount',
                              style: TextStyle(
                                  color: palette.fgTertiary, fontSize: 11.5),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                child: CustomPaint(
                  size: const Size(double.infinity, 4),
                  painter: TickRulerPainter(
                    color: accent,
                    filledRatio: nodeCount == 0 ? 0 : doneCount / nodeCount,
                    segments: 12,
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
