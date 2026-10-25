import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/tokens.dart';
import '../design/geo_motion.dart';
import '../features/home/home_screen.dart';
import '../features/module/module_screen.dart';
import '../features/reader/reader_screen.dart';
import '../features/search/search_screen.dart';
import '../features/syntax/syntax_detail_screen.dart';
import '../features/syntax/syntax_screen.dart';
import '../features/paths/path_detail_screen.dart';
import '../features/paths/paths_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        pageBuilder: (context, state) =>
            _wipe(context, state, const HomeScreen()),
      ),
      GoRoute(
        path: '/module/:moduleId',
        pageBuilder: (context, state) {
          final id = state.pathParameters['moduleId'] ?? '';
          return _wipe(context, state, ModuleScreen(moduleId: id));
        },
      ),
      GoRoute(
        path: '/doc/:moduleId/:slug',
        pageBuilder: (context, state) {
          final id = state.pathParameters['moduleId'] ?? '';
          final slug = state.pathParameters['slug'] ?? '';
          return _wipe(context, state, ReaderScreen(moduleId: id, slug: slug));
        },
      ),
      GoRoute(
        path: '/syntax',
        pageBuilder: (context, state) =>
            _wipe(context, state, const SyntaxScreen()),
      ),
      GoRoute(
        path: '/syntax/:langId',
        pageBuilder: (context, state) {
          final id = state.pathParameters['langId'] ?? '';
          return _wipe(context, state, SyntaxDetailScreen(langId: id));
        },
      ),
      GoRoute(
        path: '/paths',
        pageBuilder: (context, state) =>
            _wipe(context, state, const PathsScreen()),
      ),
      GoRoute(
        path: '/paths/:moduleId',
        pageBuilder: (context, state) {
          final id = state.pathParameters['moduleId'] ?? '';
          return _wipe(context, state, PathDetailScreen(moduleId: id));
        },
      ),
      GoRoute(
        path: '/search',
        pageBuilder: (context, state) =>
            _wipe(context, state, const SearchScreen()),
      ),
    ],
  );
});

GeoWipePage<void> _wipe(
    BuildContext context, GoRouterState state, Widget child) {
  final palette = geoOf(context);
  return GeoWipePage<void>(
    key: state.pageKey,
    name: state.matchedLocation,
    lineColor: palette.accent,
    child: child,
  );
}
