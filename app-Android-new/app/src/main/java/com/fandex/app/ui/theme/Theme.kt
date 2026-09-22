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

private val LightColorScheme = lightColorScheme(
    primary = PrimitiveColors.Cyan300,
    onPrimary = PrimitiveColors.Neutral1050,
    primaryContainer = PrimitiveColors.Cyan100,
    onPrimaryContainer = PrimitiveColors.Cyan600,
    inversePrimary = PrimitiveColors.Cyan500,

    secondary = PrimitiveColors.Neutral500,
    onSecondary = PrimitiveColors.Neutral1050,
    secondaryContainer = PrimitiveColors.Neutral1000,
    onSecondaryContainer = PrimitiveColors.Neutral500,

    tertiary = PrimitiveColors.Cyan400,
    onTertiary = PrimitiveColors.Neutral1050,
    tertiaryContainer = PrimitiveColors.Cyan200,
    onTertiaryContainer = PrimitiveColors.Cyan600,

    background = PrimitiveColors.Neutral1050,
    onBackground = PrimitiveColors.Neutral50,
    surface = PrimitiveColors.Neutral1050,
    onSurface = PrimitiveColors.Neutral50,
    surfaceVariant = PrimitiveColors.Neutral1000,
    onSurfaceVariant = PrimitiveColors.Neutral500,
    surfaceTint = PrimitiveColors.Cyan300,
    inverseSurface = PrimitiveColors.Neutral50,
    inverseOnSurface = PrimitiveColors.Neutral1050,

    error = PrimitiveColors.DangerLight,
    onError = PrimitiveColors.Neutral1050,
    errorContainer = PrimitiveColors.DangerLight,
    onErrorContainer = PrimitiveColors.Neutral1050,

    outline = PrimitiveColors.Neutral900,
    outlineVariant = PrimitiveColors.Neutral950,
    scrim = PrimitiveColors.Neutral0,
)

private val DarkColorScheme = darkColorScheme(
    primary = PrimitiveColors.Cyan500,
    onPrimary = PrimitiveColors.Neutral0,
    primaryContainer = PrimitiveColors.Cyan200,
    onPrimaryContainer = PrimitiveColors.Cyan500,
    inversePrimary = PrimitiveColors.Cyan300,

    secondary = PrimitiveColors.Neutral700,
    onSecondary = PrimitiveColors.Neutral0,
    secondaryContainer = PrimitiveColors.Neutral200,
    onSecondaryContainer = PrimitiveColors.Neutral700,

    tertiary = PrimitiveColors.Cyan400,
    onTertiary = PrimitiveColors.Neutral0,
    tertiaryContainer = PrimitiveColors.Cyan100,
    onTertiaryContainer = PrimitiveColors.Cyan400,

    background = PrimitiveColors.Neutral50,
    onBackground = PrimitiveColors.Neutral1050,
    surface = PrimitiveColors.Neutral50,
    onSurface = PrimitiveColors.Neutral1050,
    surfaceVariant = PrimitiveColors.Neutral200,
    onSurfaceVariant = PrimitiveColors.Neutral700,
    surfaceTint = PrimitiveColors.Cyan500,
    inverseSurface = PrimitiveColors.Neutral1050,
    inverseOnSurface = PrimitiveColors.Neutral50,

    error = PrimitiveColors.DangerDark,
    onError = PrimitiveColors.Neutral0,
    errorContainer = PrimitiveColors.DangerDark,
    onErrorContainer = PrimitiveColors.Neutral0,

    outline = PrimitiveColors.Neutral300,
    outlineVariant = PrimitiveColors.Neutral100,
    scrim = PrimitiveColors.Neutral0,
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
    bgSecondary = PrimitiveColors.Neutral1000,
    bgTertiary = PrimitiveColors.Neutral950,
    bgElevated = PrimitiveColors.Neutral1050,
    bgSunken = PrimitiveColors.Neutral950,
    bgHover = PrimitiveColors.Neutral1000,
    bgActive = PrimitiveColors.Neutral950,
    fgSecondary = PrimitiveColors.Neutral500,
    fgTertiary = PrimitiveColors.Neutral550,
    fgDisabled = PrimitiveColors.Neutral800,
    fgInverse = PrimitiveColors.Neutral1050,
    borderSubtle = PrimitiveColors.Neutral950,
    borderDefault = PrimitiveColors.Neutral900,
    borderStrong = PrimitiveColors.Neutral800,
    borderFocus = PrimitiveColors.Cyan300,
    codeBg = PrimitiveColors.Neutral950,
    codeText = PrimitiveColors.Neutral50,
    codeComment = Color(0xFF6E7781),
    codeKeyword = Color(0xFFCF222E),
    codeString = Color(0xFF0A3069),
    codeNumber = Color(0xFF0550AE),
    codeAnnotation = Color(0xFF953800),
    codeFunction = Color(0xFF8250DF),
    codeTag = Color(0xFF116329),
    success = PrimitiveColors.SuccessLight,
    warning = PrimitiveColors.WarningLight,
    info = PrimitiveColors.InfoLight,
)

private val DarkExtendedColors = FandexExtendedColors(
    isDark = true,
    bgSecondary = PrimitiveColors.Neutral100,
    bgTertiary = PrimitiveColors.Neutral200,
    bgElevated = PrimitiveColors.Neutral200,
    bgSunken = PrimitiveColors.Neutral0,
    bgHover = PrimitiveColors.Neutral100,
    bgActive = PrimitiveColors.Neutral200,
    fgSecondary = PrimitiveColors.Neutral700,
    fgTertiary = PrimitiveColors.Neutral600,
    fgDisabled = PrimitiveColors.Neutral400,
    fgInverse = PrimitiveColors.Neutral50,
    borderSubtle = PrimitiveColors.Neutral100,
    borderDefault = PrimitiveColors.Neutral300,
    borderStrong = PrimitiveColors.Neutral400,
    borderFocus = PrimitiveColors.Cyan500,
    codeBg = PrimitiveColors.Neutral0,
    codeText = PrimitiveColors.Neutral900,
    codeComment = Color(0xFF8B949E),
    codeKeyword = Color(0xFFFF7B72),
    codeString = Color(0xFFA5D6FF),
    codeNumber = Color(0xFF79C0FF),
    codeAnnotation = Color(0xFFD2A8FF),
    codeFunction = Color(0xFFD2A8FF),
    codeTag = Color(0xFF7EE787),
    success = PrimitiveColors.SuccessDark,
    warning = PrimitiveColors.WarningDark,
    info = PrimitiveColors.InfoDark,
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
