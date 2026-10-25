import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';

import '../core/models.dart';
import '../core/tokens.dart';
import '../data/prefs.dart';
import '../data/repositories.dart';
import '../platform/updater.dart';
import 'geo_painters.dart';
import 'geo_press.dart';

// 抽屉 — 品牌区 / 统计 / 快捷导航 / 主题 / 字号刻度 / 模块索引 / 免责声明。

class GeoDrawer extends ConsumerStatefulWidget {
  final String location;

  const GeoDrawer({super.key, required this.location});

  @override
  ConsumerState<GeoDrawer> createState() => _GeoDrawerState();
}

class _GeoDrawerState extends ConsumerState<GeoDrawer> {
  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final settings = ref.watch(settingsProvider);
    final settingsCtrl = ref.read(settingsProvider.notifier);
    final modules = ref.watch(modulesProvider).value;
    final docs = ref.watch(docIndexProvider).value;

    final maxW = MediaQuery.of(context).size.width * 0.84;

    return Drawer(
      backgroundColor: Colors.transparent,
      width: maxW,
      child: ClipPath(
        clipper: const _DrawerEdgeClipper(),
        child: Container(
          color: palette.bgSurface,
          child: SafeArea(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 16),
              children: [
                // 品牌区
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'FANDEX',
                        style: TextStyle(
                          color: palette.fgPrimary,
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 5),
                        child: Text(
                          'GEOCON',
                          style: TextStyle(
                            color: palette.accent,
                            fontSize: 10,
                            letterSpacing: 3,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _StatsRow(modules: modules, docs: docs),
                const SizedBox(height: 8),
                _sectionLabel(context, '快捷导航'),
                _NavItem(
                  icon: Icons.home_outlined,
                  label: '首页',
                  active: widget.location == '/',
                  onTap: () {
                    Navigator.of(context).pop();
                    context.go('/');
                  },
                ),
                _NavItem(
                  icon: Icons.code,
                  label: '语法速览',
                  active: widget.location.startsWith('/syntax'),
                  onTap: () {
                    Navigator.of(context).pop();
                    context.go('/syntax');
                  },
                ),
                _NavItem(
                  icon: Icons.explore_outlined,
                  label: '学习路线',
                  active: widget.location.startsWith('/paths'),
                  onTap: () {
                    Navigator.of(context).pop();
                    context.go('/paths');
                  },
                ),
                _NavItem(
                  icon: Icons.search,
                  label: '搜索',
                  active: widget.location.startsWith('/search'),
                  onTap: () {
                    Navigator.of(context).pop();
                    context.go('/search');
                  },
                ),
                _sectionLabel(context, '外观'),
                _ThemeSegment(
                  current: settings.themeMode,
                  onSelect: settingsCtrl.setTheme,
                ),
                const SizedBox(height: 10),
                _FontScaleRow(
                  scale: settings.fontScale,
                  onChange: settingsCtrl.setFontScale,
                ),
                _sectionLabel(context, '应用更新'),
                const _UpdateSection(),
                _sectionLabel(context, '模块索引'),
                if (modules != null)
                  ..._buildModuleIndex(context, modules)
                else
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: SizedBox(height: 40),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                  child: Text(
                    '内容基于开源知识库 FANDEX · 仅供学习参考',
                    style: TextStyle(color: palette.fgTertiary, fontSize: 11),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildModuleIndex(BuildContext context, ModulesData modules) {
    final widgets = <Widget>[];
    final byCategory = <String, List<ModuleInfo>>{};
    for (final m in modules.modules) {
      final cat = m.categories.isNotEmpty ? m.categories.first : 'tools';
      byCategory.putIfAbsent(cat, () => []).add(m);
    }
    final order = modules.categoryOrder.isEmpty
        ? byCategory.keys.toList()
        : modules.categoryOrder;

    for (final cat in order) {
      final list = byCategory[cat];
      if (list == null || list.isEmpty) continue;
      final color =
          Color(modules.categoryColors[cat]?.toUnsigned(32) ?? 0xFF39C5BB);
      final label = modules.categoryLabels[cat] ?? cat;
      widgets.add(_CategoryHeader(label: label, color: color));
      for (final m in list) {
        final index = modules.modules.indexOf(m) + 1;
        widgets.add(
          _ModuleIndexItem(
            number: index.toString().padLeft(2, '0'),
            title: m.title,
            color: color,
            active: widget.location.startsWith('/module/${m.id}'),
            onTap: () {
              Navigator.of(context).pop();
              context.push('/module/${m.id}');
            },
          ),
        );
      }
    }
    return widgets;
  }
}

class _DrawerEdgeClipper extends CustomClipper<Path> {
  const _DrawerEdgeClipper();

  @override
  Path getClip(Size size) {
    final b = 22.0;
    return Path()
      ..moveTo(0, 0)
      ..lineTo(size.width - b, 0)
      ..lineTo(size.width, size.height * 0.35)
      ..lineTo(size.width - b, size.height)
      ..lineTo(0, size.height)
      ..close();
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

Widget _sectionLabel(BuildContext context, String text) {
  final palette = geoOf(context);
  return Padding(
    padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
    child: Text(
      text.toUpperCase(),
      style: TextStyle(
        color: palette.fgTertiary,
        fontSize: 10,
        letterSpacing: 3,
        fontWeight: FontWeight.w700,
      ),
    ),
  );
}

class _StatsRow extends StatelessWidget {
  final ModulesData? modules;
  final List<DocEntry>? docs;

  const _StatsRow({required this.modules, required this.docs});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final catCount = modules?.categoryOrder.length ?? 0;
    final moduleCount = modules?.modules.length ?? 0;
    final docCount = docs?.length ?? 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
      decoration: BoxDecoration(
        color: palette.bgElevated,
        border: Border.all(color: palette.border),
      ),
      child: Row(
        children: [
          _stat(context, catCount.toString().padLeft(2, '0'), '分类'),
          const SizedBox(width: 20),
          _stat(context, moduleCount.toString().padLeft(2, '0'), '模块'),
          const SizedBox(width: 20),
          _stat(context, docCount.toString(), '文档'),
        ],
      ),
    );
  }

  Widget _stat(BuildContext context, String value, String label) {
    final palette = geoOf(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(value,
            style: TextStyle(
                color: palette.accent,
                fontWeight: FontWeight.w800,
                fontSize: 16)),
        Text(label, style: TextStyle(color: palette.fgTertiary, fontSize: 10)),
      ],
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _NavItem(
      {required this.icon,
      required this.label,
      required this.active,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return GeoPress(
      onTap: onTap,
      bracketColor: palette.accent,
      bevel: 0,
      child: AnimatedContainer(
        duration: GeoMotion.fast,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
        color: active
            ? palette.accent.withValues(alpha: 0.12)
            : Colors.transparent,
        child: Row(
          children: [
            Icon(icon,
                size: 18, color: active ? palette.accent : palette.fgSecondary),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                color: active ? palette.accent : palette.fgPrimary,
                fontSize: 14,
                fontWeight: active ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeSegment extends StatelessWidget {
  final ThemeModeLike current;
  final ValueChanged<ThemeModeLike> onSelect;

  const _ThemeSegment({required this.current, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final items = [
      (ThemeModeLike.system, '系统', Icons.brightness_auto_outlined),
      (ThemeModeLike.light, '浅色', Icons.light_mode_outlined),
      (ThemeModeLike.dark, '深色', Icons.dark_mode_outlined),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: palette.border),
          color: palette.bgElevated,
        ),
        child: Row(
          children: [
            for (var i = 0; i < items.length; i++) ...[
              if (i > 0) Container(width: 1, height: 34, color: palette.border),
              Expanded(
                child: InkWell(
                  onTap: () => onSelect(items[i].$1),
                  child: AnimatedContainer(
                    duration: GeoMotion.fast,
                    height: 34,
                    alignment: Alignment.center,
                    color: current == items[i].$1
                        ? palette.accent.withValues(alpha: 0.16)
                        : Colors.transparent,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          items[i].$3,
                          size: 14,
                          color: current == items[i].$1
                              ? palette.accent
                              : palette.fgTertiary,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          items[i].$2,
                          style: TextStyle(
                            fontSize: 12,
                            color: current == items[i].$1
                                ? palette.accent
                                : palette.fgSecondary,
                            fontWeight: current == items[i].$1
                                ? FontWeight.w700
                                : FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _FontScaleRow extends StatelessWidget {
  final double scale;
  final ValueChanged<double> onChange;

  const _FontScaleRow({required this.scale, required this.onChange});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final steps = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4];
    final activeIndex = steps.indexOf(scale);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Text(
            '字号',
            style: TextStyle(color: palette.fgSecondary, fontSize: 12),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Row(
              children: [
                for (var i = 0; i < steps.length; i++) ...[
                  Expanded(
                    child: GestureDetector(
                      onTap: () => onChange(steps[i]),
                      child: AnimatedContainer(
                        duration: GeoMotion.fast,
                        height: activeIndex == i ? 14 : 8,
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        color:
                            i <= activeIndex ? palette.accent : palette.border,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            '${(scale * 100).round()}%',
            style: TextStyle(color: palette.fgTertiary, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _UpdateSection extends ConsumerStatefulWidget {
  const _UpdateSection();

  @override
  ConsumerState<_UpdateSection> createState() => _UpdateSectionState();
}

class _UpdateSectionState extends ConsumerState<_UpdateSection> {
  bool _checking = false;
  bool _downloading = false;
  double _progress = 0;
  String? _message;
  UpdateInfo? _info;

  Future<void> _check() async {
    setState(() {
      _checking = true;
      _message = null;
      _info = null;
    });
    final store = ref.read(libraryStoreProvider);
    final info = await ref.read(geoUpdaterProvider).check(store: store);
    if (!mounted) return;
    setState(() {
      _checking = false;
      _info = info;
      _message = info == null ? '已是最新版本' : null;
    });
  }

  Future<void> _downloadAndInstall() async {
    final info = _info;
    if (info == null || info.apkUrl.isEmpty) return;
    setState(() {
      _downloading = true;
      _progress = 0;
    });
    try {
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/fandex-update.apk';
      await for (final p in ref
          .read(geoUpdaterProvider)
          .downloadApk(info.apkUrl, toPath: path)) {
        if (!mounted) return;
        setState(() => _progress = p);
      }
      await ref.read(geoUpdaterProvider).installApk(path);
    } catch (e) {
      if (!mounted) return;
      setState(() => _message = '下载失败，请稍后重试');
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  Future<void> _ignore() async {
    final info = _info;
    if (info == null) return;
    await ref.read(libraryStoreProvider).setIgnoredVersion(info.version);
    if (!mounted) return;
    setState(() {
      _info = null;
      _message = '已忽略 v${info.version}';
    });
  }

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GeoPress(
            onTap: _checking || _downloading ? null : _check,
            bracketColor: palette.accent,
            bevel: GeoRadius.bevelTiny,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: ShapeDecoration(
                color: palette.bgElevated,
                shape: BeveledRectangleBorder(
                  borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(GeoRadius.bevelTiny)),
                  side: BorderSide(color: palette.border),
                ),
              ),
              child: Row(
                children: [
                  Icon(Icons.system_update_alt,
                      size: 16, color: palette.accent),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _checking ? '正在检查...' : '检查更新',
                      style: TextStyle(
                        color: _checking || _downloading
                            ? palette.fgTertiary
                            : palette.fgPrimary,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_message != null) ...[
            const SizedBox(height: 6),
            Text(_message!,
                style: TextStyle(color: palette.fgTertiary, fontSize: 11)),
          ],
          if (_info != null) ...[
            const SizedBox(height: 8),
            Text(
              '发现新版本 v${_info!.version}',
              style: TextStyle(
                  color: palette.accent,
                  fontSize: 12,
                  fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            if (_downloading)
              CustomPaint(
                size: const Size(double.infinity, 4),
                painter: TickRulerPainter(
                    color: palette.accent,
                    filledRatio: _progress,
                    segments: 16),
              )
            else
              Row(
                children: [
                  Expanded(
                    child: GeoPress(
                      onTap: _downloadAndInstall,
                      bracketColor: palette.accent,
                      bevel: GeoRadius.bevelTiny,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        alignment: Alignment.center,
                        decoration: ShapeDecoration(
                          color: palette.accent.withValues(alpha: 0.16),
                          shape: BeveledRectangleBorder(
                            borderRadius: const BorderRadius.only(
                                topRight: Radius.circular(GeoRadius.bevelTiny)),
                            side: BorderSide(color: palette.accent),
                          ),
                        ),
                        child: Text(
                          '下载并安装',
                          style: TextStyle(
                              color: palette.accent,
                              fontSize: 12,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GeoPress(
                    onTap: _ignore,
                    bracketColor: palette.fgTertiary,
                    bevel: GeoRadius.bevelTiny,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: ShapeDecoration(
                        color: palette.bgElevated,
                        shape: BeveledRectangleBorder(
                          borderRadius: const BorderRadius.only(
                              topRight: Radius.circular(GeoRadius.bevelTiny)),
                          side: BorderSide(color: palette.border),
                        ),
                      ),
                      child: Text('忽略',
                          style: TextStyle(
                              color: palette.fgSecondary, fontSize: 12)),
                    ),
                  ),
                ],
              ),
          ],
        ],
      ),
    );
  }
}

class _CategoryHeader extends StatelessWidget {
  final String label;
  final Color color;

  const _CategoryHeader({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 4),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 12,
            transform: Matrix4.skewY(-0.4),
            color: color,
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              color: palette.fgSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _ModuleIndexItem extends StatelessWidget {
  final String number;
  final String title;
  final Color color;
  final bool active;
  final VoidCallback onTap;

  const _ModuleIndexItem({
    required this.number,
    required this.title,
    required this.color,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return GeoPress(
      onTap: onTap,
      bracketColor: color,
      bevel: 0,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        color: active ? color.withValues(alpha: 0.08) : Colors.transparent,
        child: Row(
          children: [
            Text(
              number,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: active ? palette.fgPrimary : palette.fgSecondary,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
