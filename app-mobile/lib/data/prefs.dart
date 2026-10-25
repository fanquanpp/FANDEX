import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('main 中通过 ProviderScope overrides 注入');
});

class SettingsState {
  final ThemeModeLike themeMode;
  final double fontScale;

  const SettingsState({required this.themeMode, required this.fontScale});

  const SettingsState.initial()
      : themeMode = ThemeModeLike.system,
        fontScale = 1.0;
}

enum ThemeModeLike { system, light, dark }

class SettingsController extends Notifier<SettingsState> {
  static const _kTheme = 'geo_theme_mode';
  static const _kFont = 'geo_font_scale';

  @override
  SettingsState build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    final theme = ThemeModeLike.values.firstWhere(
      (t) => t.name == (prefs.getString(_kTheme) ?? 'system'),
      orElse: () => ThemeModeLike.system,
    );
    final scale = (prefs.getDouble(_kFont) ?? 1.0).clamp(0.8, 1.4);
    return SettingsState(themeMode: theme, fontScale: scale);
  }

  Future<void> setTheme(ThemeModeLike mode) async {
    state = SettingsState(themeMode: mode, fontScale: state.fontScale);
    await ref.read(sharedPreferencesProvider).setString(_kTheme, mode.name);
  }

  Future<void> setFontScale(double scale) async {
    final clamped = scale.clamp(0.8, 1.4);
    state = SettingsState(themeMode: state.themeMode, fontScale: clamped);
    await ref.read(sharedPreferencesProvider).setDouble(_kFont, clamped);
  }

  ThemeModeLike nextTheme() {
    switch (state.themeMode) {
      case ThemeModeLike.system:
        return ThemeModeLike.light;
      case ThemeModeLike.light:
        return ThemeModeLike.dark;
      case ThemeModeLike.dark:
        return ThemeModeLike.system;
    }
  }
}

final settingsProvider =
    NotifierProvider<SettingsController, SettingsState>(SettingsController.new);

class LibraryStore {
  static const _kProgress = 'geo_doc_progress';
  static const _kAutoUpdate = 'geo_auto_update';
  static const _kIgnoredVersion = 'geo_ignored_version';

  LibraryStore(this._prefs);
  final SharedPreferences _prefs;

  Map<String, int> progress() {
    final raw = _prefs.getString(_kProgress);
    if (raw == null || raw.isEmpty) return const {};
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return map.map((k, v) => MapEntry(k, (v as num).toInt()));
    } catch (_) {
      return const {};
    }
  }

  bool isDone(String module, String slug) =>
      progress().containsKey('$module/$slug');

  Future<void> setDone(String module, String slug, bool done) async {
    final map = Map<String, int>.from(progress());
    final key = '$module/$slug';
    if (done) {
      map[key] = DateTime.now().millisecondsSinceEpoch;
    } else {
      map.remove(key);
    }
    await _prefs.setString(_kProgress, jsonEncode(map));
  }

  bool autoUpdateEnabled() => _prefs.getBool(_kAutoUpdate) ?? true;

  Future<void> setAutoUpdate(bool enabled) async {
    await _prefs.setBool(_kAutoUpdate, enabled);
  }

  String? ignoredVersion() => _prefs.getString(_kIgnoredVersion);

  Future<void> setIgnoredVersion(String? version) async {
    if (version == null) {
      await _prefs.remove(_kIgnoredVersion);
    } else {
      await _prefs.setString(_kIgnoredVersion, version);
    }
  }
}

final libraryStoreProvider = Provider<LibraryStore>(
    (ref) => LibraryStore(ref.watch(sharedPreferencesProvider)));

class ProgressNotifier extends Notifier<Map<String, int>> {
  @override
  Map<String, int> build() => ref.watch(libraryStoreProvider).progress();

  Future<void> setDone(String module, String slug, bool done) async {
    await ref.read(libraryStoreProvider).setDone(module, slug, done);
    ref.notifyListeners();
  }
}

final progressProvider =
    NotifierProvider<ProgressNotifier, Map<String, int>>(ProgressNotifier.new);
