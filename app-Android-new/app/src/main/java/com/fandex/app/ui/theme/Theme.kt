package com.fandex.app.ui.theme

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.TweenSpec
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density

// Material 角色到语义令牌的映射层：色值一律来自 TokenColors.kt（令牌生成），
// 本文件不出现手写十六进制。代码语法高亮色例外——它们镜像 web 端 Shiki 的
// github-light/dark 配色，刻意不令牌化。

private val LightColorScheme = lightColorScheme(
    primary = TokenLight.ColorAccentBase,
    onPrimary = TokenLight.ColorAccentFg,
    primaryContainer = TokenLight.ColorAccentActive,
    onPrimaryContainer = TokenLight.ColorAccentFg,
    inversePrimary = TokenDark.ColorAccentBase,

    secondary = TokenLight.ColorFgSecondary,
    onSecondary = TokenLight.ColorFgInverse,
    secondaryContainer = TokenLight.ColorBgSecondary,
    onSecondaryContainer = TokenLight.ColorFgSecondary,

    tertiary = TokenLight.ColorAccentHover,
    onTertiary = TokenLight.ColorAccentFg,
    tertiaryContainer = TokenLight.ColorAccentHover,
    onTertiaryContainer = TokenLight.ColorAccentFg,

    background = TokenLight.ColorBgPrimary,
    onBackground = TokenLight.ColorFgPrimary,
    surface = TokenLight.ColorBgPrimary,
    onSurface = TokenLight.ColorFgPrimary,
    surfaceVariant = TokenLight.ColorBgSecondary,
    onSurfaceVariant = TokenLight.ColorFgSecondary,
    surfaceTint = TokenLight.ColorAccentBase,
    inverseSurface = TokenLight.ColorFgPrimary,
    inverseOnSurface = TokenLight.ColorBgPrimary,

    error = TokenLight.ColorDangerBase,
    onError = TokenLight.ColorDangerFg,
    errorContainer = TokenLight.ColorDangerBg,
    onErrorContainer = TokenLight.ColorDangerFg,

    outline = TokenLight.ColorBorderDefault,
    outlineVariant = TokenLight.ColorBorderSubtle,
    scrim = TokenPrimitive.ColorNeutral0,
)

private val DarkColorScheme = darkColorScheme(
    primary = TokenDark.ColorAccentBase,
    onPrimary = TokenDark.ColorAccentFg,
    primaryContainer = TokenDark.ColorAccentActive,
    onPrimaryContainer = TokenDark.ColorAccentFg,
    inversePrimary = TokenLight.ColorAccentBase,

    secondary = TokenDark.ColorFgSecondary,
    onSecondary = TokenDark.ColorFgInverse,
    secondaryContainer = TokenDark.ColorBgSecondary,
    onSecondaryContainer = TokenDark.ColorFgSecondary,

    tertiary = TokenDark.ColorAccentHover,
    onTertiary = TokenDark.ColorAccentFg,
    tertiaryContainer = TokenDark.ColorAccentHover,
    onTertiaryContainer = TokenDark.ColorAccentFg,

    background = TokenDark.ColorBgPrimary,
    onBackground = TokenDark.ColorFgPrimary,
    surface = TokenDark.ColorBgPrimary,
    onSurface = TokenDark.ColorFgPrimary,
    surfaceVariant = TokenDark.ColorBgSecondary,
    onSurfaceVariant = TokenDark.ColorFgSecondary,
    surfaceTint = TokenDark.ColorAccentBase,
    inverseSurface = TokenDark.ColorFgPrimary,
    inverseOnSurface = TokenDark.ColorBgPrimary,

    error = TokenDark.ColorDangerBase,
    onError = TokenDark.ColorDangerFg,
    errorContainer = TokenDark.ColorDangerBg,
    onErrorContainer = TokenDark.ColorDangerFg,

    outline = TokenDark.ColorBorderDefault,
    outlineVariant = TokenDark.ColorBorderSubtle,
    scrim = TokenPrimitive.ColorNeutral0,
)

data class FandexExtendedColors(
    val isDark: Boolean,
    val bgSecondary: Color,
    val bgTertiary: Color,
    val bgElevated: Color,
    val bgSunken: Color,
    val bgHover: Color,
    val bgActive: Color,
    val fgSecondary: Color,
    val fgTertiary: Color,
    val fgDisabled: Color,
    val fgInverse: Color,
    val borderSubtle: Color,
    val borderDefault: Color,
    val borderStrong: Color,
    val borderFocus: Color,
    val codeBg: Color,
    val codeText: Color,
    val codeComment: Color,
    val codeKeyword: Color,
    val codeString: Color,
    val codeNumber: Color,
    val codeAnnotation: Color,
    val codeFunction: Color,
    val codeTag: Color,
    val success: Color,
    val warning: Color,
    val info: Color,
)

private val LightExtendedColors = FandexExtendedColors(
    isDark = false,
    bgSecondary = TokenLight.ColorBgSecondary,
    bgTertiary = TokenLight.ColorBgTertiary,
    bgElevated = TokenLight.ColorBgElevated,
    bgSunken = TokenLight.ColorBgSunken,
    bgHover = TokenLight.ColorBgHover,
    bgActive = TokenLight.ColorBgActive,
    fgSecondary = TokenLight.ColorFgSecondary,
    fgTertiary = TokenLight.ColorFgTertiary,
    fgDisabled = TokenLight.ColorFgDisabled,
    fgInverse = TokenLight.ColorFgInverse,
    borderSubtle = TokenLight.ColorBorderSubtle,
    borderDefault = TokenLight.ColorBorderDefault,
    borderStrong = TokenLight.ColorBorderStrong,
    borderFocus = TokenLight.ColorBorderFocus,
    codeBg = TokenLight.ColorCodeBg,
    codeText = TokenLight.ColorCodeText,
    codeComment = TokenLight.ColorCodeComment,
    codeKeyword = Color(0xFFCF222E),
    codeString = Color(0xFF0A3069),
    codeNumber = Color(0xFF0550AE),
    codeAnnotation = Color(0xFF953800),
    codeFunction = Color(0xFF8250DF),
    codeTag = Color(0xFF116329),
    success = TokenLight.ColorSuccessBase,
    warning = TokenLight.ColorWarningBase,
    info = TokenLight.ColorInfoBase,
)

private val DarkExtendedColors = FandexExtendedColors(
    isDark = true,
    bgSecondary = TokenDark.ColorBgSecondary,
    bgTertiary = TokenDark.ColorBgTertiary,
    bgElevated = TokenDark.ColorBgElevated,
    bgSunken = TokenDark.ColorBgSunken,
    bgHover = TokenDark.ColorBgHover,
    bgActive = TokenDark.ColorBgActive,
    fgSecondary = TokenDark.ColorFgSecondary,
    fgTertiary = TokenDark.ColorFgTertiary,
    fgDisabled = TokenDark.ColorFgDisabled,
    fgInverse = TokenDark.ColorFgInverse,
    borderSubtle = TokenDark.ColorBorderSubtle,
    borderDefault = TokenDark.ColorBorderDefault,
    borderStrong = TokenDark.ColorBorderStrong,
    borderFocus = TokenDark.ColorBorderFocus,
    codeBg = TokenDark.ColorCodeBg,
    codeText = TokenDark.ColorCodeText,
    codeComment = TokenDark.ColorCodeComment,
    codeKeyword = Color(0xFFFF7B72),
    codeString = Color(0xFFA5D6FF),
    codeNumber = Color(0xFF79C0FF),
    codeAnnotation = Color(0xFFD2A8FF),
    codeFunction = Color(0xFFD2A8FF),
    codeTag = Color(0xFF7EE787),
    success = TokenDark.ColorSuccessBase,
    warning = TokenDark.ColorWarningBase,
    info = TokenDark.ColorInfoBase,
)

val LocalExtendedColors = staticCompositionLocalOf { LightExtendedColors }

private const val THEME_ANIM_DURATION = 320

@Composable
private fun animatedColor(target: Color): Color =
    animateColorAsState(
        targetValue = target,
        animationSpec = TweenSpec(THEME_ANIM_DURATION),
        label = "themeColor",
    ).value

@Composable
private fun animateScheme(s: ColorScheme): ColorScheme = s.copy(
    primary = animatedColor(s.primary),
    onPrimary = animatedColor(s.onPrimary),
    primaryContainer = animatedColor(s.primaryContainer),
    onPrimaryContainer = animatedColor(s.onPrimaryContainer),
    inversePrimary = animatedColor(s.inversePrimary),
    secondary = animatedColor(s.secondary),
    onSecondary = animatedColor(s.onSecondary),
    secondaryContainer = animatedColor(s.secondaryContainer),
    onSecondaryContainer = animatedColor(s.onSecondaryContainer),
    tertiary = animatedColor(s.tertiary),
    onTertiary = animatedColor(s.onTertiary),
    tertiaryContainer = animatedColor(s.tertiaryContainer),
    onTertiaryContainer = animatedColor(s.onTertiaryContainer),
    background = animatedColor(s.background),
    onBackground = animatedColor(s.onBackground),
    surface = animatedColor(s.surface),
    onSurface = animatedColor(s.onSurface),
    surfaceVariant = animatedColor(s.surfaceVariant),
    onSurfaceVariant = animatedColor(s.onSurfaceVariant),
    surfaceTint = animatedColor(s.surfaceTint),
    inverseSurface = animatedColor(s.inverseSurface),
    inverseOnSurface = animatedColor(s.inverseOnSurface),
    error = animatedColor(s.error),
    onError = animatedColor(s.onError),
    errorContainer = animatedColor(s.errorContainer),
    onErrorContainer = animatedColor(s.onErrorContainer),
    outline = animatedColor(s.outline),
    outlineVariant = animatedColor(s.outlineVariant),
    scrim = animatedColor(s.scrim),
)

@Composable
private fun animateExtended(e: FandexExtendedColors): FandexExtendedColors = e.copy(
    bgSecondary = animatedColor(e.bgSecondary),
    bgTertiary = animatedColor(e.bgTertiary),
    bgElevated = animatedColor(e.bgElevated),
    bgSunken = animatedColor(e.bgSunken),
    bgHover = animatedColor(e.bgHover),
    bgActive = animatedColor(e.bgActive),
    fgSecondary = animatedColor(e.fgSecondary),
    fgTertiary = animatedColor(e.fgTertiary),
    fgDisabled = animatedColor(e.fgDisabled),
    fgInverse = animatedColor(e.fgInverse),
    borderSubtle = animatedColor(e.borderSubtle),
    borderDefault = animatedColor(e.borderDefault),
    borderStrong = animatedColor(e.borderStrong),
    borderFocus = animatedColor(e.borderFocus),
    codeBg = animatedColor(e.codeBg),
    codeText = animatedColor(e.codeText),
    codeComment = animatedColor(e.codeComment),
    codeKeyword = animatedColor(e.codeKeyword),
    codeString = animatedColor(e.codeString),
    codeNumber = animatedColor(e.codeNumber),
    codeAnnotation = animatedColor(e.codeAnnotation),
    codeFunction = animatedColor(e.codeFunction),
    codeTag = animatedColor(e.codeTag),
    success = animatedColor(e.success),
    warning = animatedColor(e.warning),
    info = animatedColor(e.info),
)

@Composable
fun FandexTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    fontScale: Float = 1f,
    content: @Composable () -> Unit
) {
    val baseScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val baseExtended = if (darkTheme) DarkExtendedColors else LightExtendedColors
    val colorScheme = animateScheme(baseScheme)
    val extendedColors = animateExtended(baseExtended)

    val currentDensity = LocalDensity.current
    val scaledDensity = Density(
        density = currentDensity.density,
        fontScale = fontScale.coerceIn(0.8f, 1.4f) * currentDensity.fontScale
    )

    CompositionLocalProvider(
        LocalExtendedColors provides extendedColors,
        LocalDensity provides scaledDensity
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = FandexTypography,
            shapes = FandexShapes,
            content = content
        )
    }
}
