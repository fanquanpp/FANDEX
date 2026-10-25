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

class SyntaxScreen extends ConsumerWidget {
  const SyntaxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = geoOf(context);
    final langs = ref.watch(syntaxLanguagesProvider);

    return Scaffold(
      backgroundColor: palette.bgBase,
      drawer: GeoDrawer(location: '/syntax'),
      body: GeoBackdrop(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              GeoDock(
                title: '语法速览',
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
                child: langs.when(
                  loading: () => const GeoLoading(),
                  error: (e, _) => GeoErrorView(
                      message: '语法数据加载失败',
                      onRetry: () => ref.invalidate(syntaxLanguagesProvider)),
                  data: (languages) => _SyntaxIndexBody(languages: languages),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SyntaxIndexBody extends StatelessWidget {
  final List<SyntaxLanguage> languages;

  const _SyntaxIndexBody({required this.languages});

  Color _colorOf(SyntaxLanguage lang) {
    final hex = lang.color.replaceFirst('#', '');
    final v = int.tryParse(hex.length == 6 ? 'FF$hex' : hex, radix: 16);
    return Color(v ?? 0xFF39C5BB);
  }

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final totalCards = languages.fold<int>(0, (a, l) => a + l.count);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 48),
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 24, bottom: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${languages.length} LANGS // $totalCards CARDS',
                style: TextStyle(
                  color: palette.accent,
                  fontSize: 9.5,
                  letterSpacing: 2.4,
                  fontWeight: FontWeight.w800,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '语法速览',
                style: TextStyle(
                    color: palette.fgPrimary,
                    fontSize: 26,
                    fontWeight: FontWeight.w900),
              ),
            ],
          ),
        ),
        for (var i = 0; i < languages.length; i++)
          GeoEntrance(
            index: i,
            child: _LangCard(lang: languages[i], color: _colorOf(languages[i])),
          ),
      ],
    );
  }
}

class _LangCard extends StatelessWidget {
  final SyntaxLanguage lang;
  final Color color;

  const _LangCard({required this.lang, required this.color});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GeoPress(
        onTap: () => context.push('/syntax/${lang.id}'),
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
          child: Row(
            children: [
              Container(
                width: 54,
                height: 62,
                color: color.withValues(alpha: 0.13),
                alignment: Alignment.center,
                child: Text(
                  lang.icon.isEmpty
                      ? lang.id.substring(0, 1).toUpperCase()
                      : lang.icon,
                  style: TextStyle(
                      color: color, fontSize: 17, fontWeight: FontWeight.w900),
                ),
              ),
              Expanded(
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lang.title,
                        style: TextStyle(
                            color: palette.fgPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${lang.count} 语法点 · ${lang.docCount} 文档',
                        style: TextStyle(
                            color: palette.fgTertiary, fontSize: 11.5),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Icon(Icons.chevron_right,
                    size: 18, color: palette.fgTertiary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
