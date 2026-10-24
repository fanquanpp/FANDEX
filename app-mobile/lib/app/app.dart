import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/tokens.dart';
import '../data/prefs.dart';
import 'router.dart';

class FandexMobileApp extends ConsumerWidget {
  const FandexMobileApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final router = ref.watch(routerProvider);

    final themeMode = switch (settings.themeMode) {
      ThemeModeLike.system => ThemeMode.system,
      ThemeModeLike.light => ThemeMode.light,
      ThemeModeLike.dark => ThemeMode.dark,
    };

    return MaterialApp.router(
      title: 'FANDEX',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      theme: geoTheme(GeoPalette.light, Brightness.light),
      darkTheme: geoTheme(GeoPalette.dark, Brightness.dark),
      themeMode: themeMode,
      themeAnimationDuration: const Duration(milliseconds: 320),
      themeAnimationCurve: Curves.easeOut,
      builder: (context, child) {
        final mq = MediaQuery.of(context);
        return MediaQuery(
          data: mq.copyWith(
            textScaler: TextScaler.linear(settings.fontScale),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
