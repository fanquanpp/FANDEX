import 'package:flutter/material.dart';

import 'token_colors.dart';

// GEOCON 设计令牌 — 颜色真源 shd-shared/tokens（token_colors.dart 为生成物，
// 手改会在 check-tokens-drift 门禁报错）；此处只做语义令牌到组件角色的映射。

class GeoMotion {
  static const instant = Duration(milliseconds: 75);
  static const fast = Duration(milliseconds: 150);
  static const normal = Duration(milliseconds: 250);
  static const slow = Duration(milliseconds: 400);
  static const slower = Duration(milliseconds: 600);

  static const curveDefault = Cubic(0.4, 0, 0.2, 1);
  static const curveOut = Cubic(0, 0, 0.2, 1);
  static const curveIn = Cubic(0.4, 0, 1, 1);
  static const curveSpring = Cubic(0.34, 1.56, 0.64, 1);
  static const curveBounce = Cubic(0.68, -0.55, 0.265, 1.55);

  static const staggerStep = Duration(milliseconds: 40);
  static const staggerCap = Duration(milliseconds: 240);

  static Duration staggerDelay(int index) {
    final d = staggerStep * index;
    return d > staggerCap ? staggerCap : d;
  }
}

class GeoRadius {
  static const bevel = 14.0;
  static const bevelSmall = 9.0;
  static const bevelTiny = 6.0;
}

class CategoryColors {
  static const Map<String, Color> map = {
    'tools': Color(0xFF0000FF),
    'frontend': Color(0xFFEE0000),
    'backend': Color(0xFFFF4004),
    'database': Color(0xFF00FFCC),
    'cs': Color(0xFF9900FF),
    'math': Color(0xFF9999FF),
    'cloud': Color(0xFFFF8800),
    'gamedev': Color(0xFF66CCFF),
  };

  static const fallback = Color(0xFF39C5BB);

  static Color parse(String? category) {
    if (category == null || category.isEmpty) return fallback;
    return map[category] ?? fallback;
  }
}

class GeoPalette extends ThemeExtension<GeoPalette> {
  final Color bgBase;
  final Color bgSurface;
  final Color bgElevated;
  final Color border;
  final Color borderStrong;
  final Color fgPrimary;
  final Color fgSecondary;
  final Color fgTertiary;
  final Color accent;
  final Color accentHover;
  final Color accentActive;
  final Color codeBg;
  final Color codeFg;
  final Color success;
  final Color warning;
  final Color danger;
  final Color gridLine;
  final Color scrim;

  const GeoPalette({
    required this.bgBase,
    required this.bgSurface,
    required this.bgElevated,
    required this.border,
    required this.borderStrong,
    required this.fgPrimary,
    required this.fgSecondary,
    required this.fgTertiary,
    required this.accent,
    required this.accentHover,
    required this.accentActive,
    required this.codeBg,
    required this.codeFg,
    required this.success,
    required this.warning,
    required this.danger,
    required this.gridLine,
    required this.scrim,
  });

  // gridLine 与 scrim 为运行时派生色（语义令牌未覆盖），其余全部来自生成令牌。
  static const dark = GeoPalette(
    bgBase: TokenDark.colorBgPrimary,
    bgSurface: TokenDark.colorBgSecondary,
    bgElevated: TokenDark.colorBgElevated,
    border: TokenDark.colorBorderDefault,
    borderStrong: TokenDark.colorBorderStrong,
    fgPrimary: TokenDark.colorFgPrimary,
    fgSecondary: TokenDark.colorFgSecondary,
    fgTertiary: TokenDark.colorFgTertiary,
    accent: TokenDark.colorAccentBase,
    accentHover: TokenDark.colorAccentHover,
    accentActive: TokenDark.colorAccentActive,
    codeBg: TokenDark.colorBgSunken,
    codeFg: TokenDark.colorFgPrimary,
    success: TokenDark.colorSuccessBase,
    warning: TokenDark.colorWarningBase,
    danger: TokenDark.colorDangerBase,
    gridLine: Color(0x12EBEFF3),
    scrim: Color(0x99000000),
  );

  static const light = GeoPalette(
    bgBase: TokenLight.colorBgPrimary,
    bgSurface: TokenLight.colorBgSecondary,
    bgElevated: TokenLight.colorBgElevated,
    border: TokenLight.colorBorderDefault,
    borderStrong: TokenLight.colorBorderStrong,
    fgPrimary: TokenLight.colorFgPrimary,
    fgSecondary: TokenLight.colorFgSecondary,
    fgTertiary: TokenLight.colorFgTertiary,
    accent: TokenLight.colorAccentBase,
    accentHover: TokenLight.colorAccentHover,
    accentActive: TokenLight.colorAccentActive,
    codeBg: TokenLight.colorBgSunken,
    codeFg: TokenLight.colorFgPrimary,
    success: TokenLight.colorSuccessBase,
    warning: TokenLight.colorWarningBase,
    danger: TokenLight.colorDangerBase,
    gridLine: Color(0x140A0A0A),
    scrim: Color(0x99EBEFF3),
  );

  @override
  GeoPalette copyWith({Color? bgBase, Color? accent}) {
    return GeoPalette(
      bgBase: bgBase ?? this.bgBase,
      bgSurface: bgSurface,
      bgElevated: bgElevated,
      border: border,
      borderStrong: borderStrong,
      fgPrimary: fgPrimary,
      fgSecondary: fgSecondary,
      fgTertiary: fgTertiary,
      accent: accent ?? this.accent,
      accentHover: accentHover,
      accentActive: accentActive,
      codeBg: codeBg,
      codeFg: codeFg,
      success: success,
      warning: warning,
      danger: danger,
      gridLine: gridLine,
      scrim: scrim,
    );
  }

  @override
  GeoPalette lerp(GeoPalette? other, double t) {
    if (other == null) return this;
    Color c(Color a, Color b) => Color.lerp(a, b, t)!;
    return GeoPalette(
      bgBase: c(bgBase, other.bgBase),
      bgSurface: c(bgSurface, other.bgSurface),
      bgElevated: c(bgElevated, other.bgElevated),
      border: c(border, other.border),
      borderStrong: c(borderStrong, other.borderStrong),
      fgPrimary: c(fgPrimary, other.fgPrimary),
      fgSecondary: c(fgSecondary, other.fgSecondary),
      fgTertiary: c(fgTertiary, other.fgTertiary),
      accent: c(accent, other.accent),
      accentHover: c(accentHover, other.accentHover),
      accentActive: c(accentActive, other.accentActive),
      codeBg: c(codeBg, other.codeBg),
      codeFg: c(codeFg, other.codeFg),
      success: c(success, other.success),
      warning: c(warning, other.warning),
      danger: c(danger, other.danger),
      gridLine: c(gridLine, other.gridLine),
      scrim: c(scrim, other.scrim),
    );
  }
}

GeoPalette geoOf(BuildContext context) {
  final ext = Theme.of(context).extension<GeoPalette>();
  return ext ?? GeoPalette.dark;
}

ColorScheme _schemeFrom(GeoPalette p, Brightness brightness) {
  return ColorScheme(
    brightness: brightness,
    primary: p.accent,
    onPrimary: p.bgBase,
    secondary: p.accentHover,
    onSecondary: p.bgBase,
    surface: p.bgBase,
    onSurface: p.fgPrimary,
    surfaceContainerHighest: p.bgElevated,
    surfaceContainerHigh: p.bgElevated,
    surfaceContainer: p.bgSurface,
    surfaceContainerLow: p.bgSurface,
    surfaceContainerLowest: p.bgBase,
    surfaceTint: Colors.transparent,
    error: p.danger,
    onError: p.bgBase,
    outline: p.border,
    outlineVariant: p.border,
    onSurfaceVariant: p.fgSecondary,
    primaryContainer: p.bgElevated,
    onPrimaryContainer: p.fgPrimary,
    secondaryContainer: p.bgElevated,
    onSecondaryContainer: p.fgPrimary,
    tertiary: p.accentHover,
    onTertiary: p.bgBase,
    tertiaryContainer: p.bgElevated,
    onTertiaryContainer: p.fgPrimary,
    inverseSurface: p.fgPrimary,
    onInverseSurface: p.bgBase,
    inversePrimary: p.accentActive,
    shadow: Colors.black,
    scrim: p.scrim,
  );
}

ThemeData geoTheme(GeoPalette p, Brightness brightness) {
  final base = ThemeData(
    brightness: brightness,
    colorScheme: _schemeFrom(p, brightness),
    useMaterial3: true,
    splashFactory: NoSplash.splashFactory,
    fontFamily: null,
  );
  return base.copyWith(
    scaffoldBackgroundColor: p.bgBase,
    canvasColor: p.bgBase,
    dividerTheme: DividerThemeData(color: p.border, thickness: 1, space: 1),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: p.bgElevated,
      surfaceTintColor: Colors.transparent,
      shape: const BeveledRectangleBorder(),
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: p.bgSurface,
      selectedColor: p.bgElevated,
      side: BorderSide(color: p.border),
      shape: const BeveledRectangleBorder(),
      labelStyle: TextStyle(color: p.fgPrimary, fontSize: 12),
    ),
    navigationDrawerTheme: NavigationDrawerThemeData(
      backgroundColor: p.bgSurface,
      surfaceTintColor: Colors.transparent,
    ),
    textTheme: base.textTheme.copyWith(
      displaySmall: TextStyle(
          color: p.fgPrimary,
          fontWeight: FontWeight.w800,
          fontSize: 30,
          height: 1.2,
          letterSpacing: -0.5),
      titleLarge: TextStyle(
          color: p.fgPrimary,
          fontWeight: FontWeight.w800,
          fontSize: 20,
          height: 1.3),
      titleMedium: TextStyle(
          color: p.fgPrimary,
          fontWeight: FontWeight.w700,
          fontSize: 16,
          height: 1.35),
      bodyLarge: TextStyle(color: p.fgPrimary, fontSize: 16, height: 1.625),
      bodyMedium: TextStyle(color: p.fgPrimary, fontSize: 14, height: 1.55),
      bodySmall: TextStyle(color: p.fgSecondary, fontSize: 12, height: 1.45),
    ),
    extensions: <ThemeExtension<dynamic>>{p},
  );
}
