import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models.dart';
import '../../core/tokens.dart';
import '../../data/repositories.dart';
import '../../design/geo_background.dart';
import '../../design/geo_dock.dart';
import '../../design/geo_motion.dart';
import '../../design/geo_painters.dart';
import '../../design/geo_press.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final TextEditingController _controller = TextEditingController();
  Timer? _debounce;
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      setState(() => _query = value);
    });
  }

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    final modules = ref.watch(modulesProvider).value;
    final docs = ref.watch(docIndexProvider);

    final results = _search(_query, docs.value ?? const <DocEntry>[], modules);

    return Scaffold(
      backgroundColor: palette.bgBase,
      body: GeoBackdrop(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              GeoDock(
                title: '搜索',
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
                ],
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: TextField(
                  controller: _controller,
                  autofocus: true,
                  onChanged: _onChanged,
                  style: TextStyle(color: palette.fgPrimary, fontSize: 14),
                  cursorColor: palette.accent,
                  decoration: InputDecoration(
                    hintText: '搜索文档 / 模块 / 描述',
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
                      borderSide: BorderSide(color: palette.accent),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: _query.trim().isEmpty
                    ? _IdleState()
                    : _ResultList(results: results, query: _query),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<DocEntry> _search(
      String query, List<DocEntry> entries, ModulesData? modules) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return const [];
    final results = <DocEntry>[];
    for (final e in entries) {
      final moduleTitle = _moduleTitleOf(modules, e.module);
      final haystack =
          '${e.title} ${e.description} ${e.module} $moduleTitle'.toLowerCase();
      if (haystack.contains(q)) results.add(e);
      if (results.length >= 60) break;
    }
    return results;
  }

  String _moduleTitleOf(ModulesData? modules, String id) {
    if (modules == null) return '';
    for (final m in modules.modules) {
      if (m.id == id) return m.title;
    }
    return '';
  }
}

class _IdleState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CustomPaint(
            size: const Size(52, 52),
            painter: WireframePolygonPainter(
                color: palette.border, sides: 3, vertexDots: false),
          ),
          const SizedBox(height: 14),
          Text(
            '输入关键词检索全库',
            style: TextStyle(
                color: palette.fgTertiary, fontSize: 12, letterSpacing: 1),
          ),
        ],
      ),
    );
  }
}

class _ResultList extends StatelessWidget {
  final List<DocEntry> results;
  final String query;

  const _ResultList({required this.results, required this.query});

  @override
  Widget build(BuildContext context) {
    final palette = geoOf(context);
    if (results.isEmpty) {
      return Center(
        child: Text(
          '无匹配结果',
          style: TextStyle(color: palette.fgTertiary, fontSize: 13),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 40),
      itemCount: results.length,
      itemBuilder: (context, i) {
        final e = results[i];
        return GeoEntrance(
          index: i,
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: GeoPress(
              onTap: () => context.push('/doc/${e.module}/${e.slug}'),
              bevel: GeoRadius.bevelSmall,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            e.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                color: palette.fgPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.w700),
                          ),
                          if (e.description.isNotEmpty)
                            Text(
                              e.description,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                  color: palette.fgTertiary, fontSize: 11.5),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      e.module,
                      style: TextStyle(
                          color: palette.fgTertiary,
                          fontSize: 10,
                          letterSpacing: 1),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
