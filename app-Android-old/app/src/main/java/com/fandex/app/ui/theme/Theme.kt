package com.fandex.app.ui.theme

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density

@Composable
fun animateColorScheme(
    targetScheme: ColorScheme,
    durationMillis: Int = 400
): ColorScheme {
    val animationSpec = tween<Color>(durationMillis = durationMillis)

    return targetScheme.copy(
        primary = animateColorAsState(targetScheme.primary, animationSpec, label = "primary").value,
        onPrimary = animateColorAsState(targetScheme.onPrimary, animationSpec, label = "onPrimary").value,
        primaryContainer = animateColorAsState(targetScheme.primaryContainer, animationSpec, label = "primaryContainer").value,
        onPrimaryContainer = animateColorAsState(targetScheme.onPrimaryContainer, animationSpec, label = "onPrimaryContainer").value,
        secondary = animateColorAsState(targetScheme.secondary, animationSpec, label = "secondary").value,
        onSecondary = animateColorAsState(targetScheme.onSecondary, animationSpec, label = "onSecondary").value,
        secondaryContainer = animateColorAsState(targetScheme.secondaryContainer, animationSpec, label = "secondaryContainer").value,
        onSecondaryContainer = animateColorAsState(targetScheme.onSecondaryContainer, animationSpec, label = "onSecondaryContainer").value,
        tertiary = animateColorAsState(targetScheme.tertiary, animationSpec, label = "tertiary").value,
        onTertiary = animateColorAsState(targetScheme.onTertiary, animationSpec, label = "onTertiary").value,
        tertiaryContainer = animateColorAsState(targetScheme.tertiaryContainer, animationSpec, label = "tertiaryContainer").value,
        onTertiaryContainer = animateColorAsState(targetScheme.onTertiaryContainer, animationSpec, label = "onTertiaryContainer").value,
        error = animateColorAsState(targetScheme.error, animationSpec, label = "error").value,
        onError = animateColorAsState(targetScheme.onError, animationSpec, label = "onError").value,
        errorContainer = animateColorAsState(targetScheme.errorContainer, animationSpec, label = "errorContainer").value,
        onErrorContainer = animateColorAsState(targetScheme.onErrorContainer, animationSpec, label = "onErrorContainer").value,
        background = animateColorAsState(targetScheme.background, animationSpec, label = "background").value,
        onBackground = animateColorAsState(targetScheme.onBackground, animationSpec, label = "onBackground").value,
        surface = animateColorAsState(targetScheme.surface, animationSpec, label = "surface").value,
        onSurface = animateColorAsState(targetScheme.onSurface, animationSpec, label = "onSurface").value,
        surfaceVariant = animateColorAsState(targetScheme.surfaceVariant, animationSpec, label = "surfaceVariant").value,
        onSurfaceVariant = animateColorAsState(targetScheme.onSurfaceVariant, animationSpec, label = "onSurfaceVariant").value,
        outline = animateColorAsState(targetScheme.outline, animationSpec, label = "outline").value,
        outlineVariant = animateColorAsState(targetScheme.outlineVariant, animationSpec, label = "outlineVariant").value,
        surfaceTint = animateColorAsState(targetScheme.surfaceTint, animationSpec, label = "surfaceTint").value,
        inverseSurface = animateColorAsState(targetScheme.inverseSurface, animationSpec, label = "inverseSurface").value,
        inverseOnSurface = animateColorAsState(targetScheme.inverseOnSurface, animationSpec, label = "inverseOnSurface").value,
        inversePrimary = animateColorAsState(targetScheme.inversePrimary, animationSpec, label = "inversePrimary").value,
        scrim = animateColorAsState(targetScheme.scrim, animationSpec, label = "scrim").value
    )
}

@Composable
fun animateMarkdownColorScheme(
    targetScheme: MarkdownColorScheme,
    durationMillis: Int = 400
): MarkdownColorScheme {
    val animationSpec = tween<Color>(durationMillis = durationMillis)

    return targetScheme.copy(
        onBackground = animateColorAsState(targetScheme.onBackground, animationSpec, label = "md_onBackground").value,
        primary = animateColorAsState(targetScheme.primary, animationSpec, label = "md_primary").value,
        onSurfaceVariant = animateColorAsState(targetScheme.onSurfaceVariant, animationSpec, label = "md_onSurfaceVariant").value,
        outlineVariant = animateColorAsState(targetScheme.outlineVariant, animationSpec, label = "md_outlineVariant").value,
        surface = animateColorAsState(targetScheme.surface, animationSpec, label = "md_surface").value,
        surfaceVariant = animateColorAsState(targetScheme.surfaceVariant, animationSpec, label = "md_surfaceVariant").value,
        headingBorder1 = animateColorAsState(targetScheme.headingBorder1, animationSpec, label = "md_headingBorder1").value,
        headingBorder2 = animateColorAsState(targetScheme.headingBorder2, animationSpec, label = "md_headingBorder2").value,
        headingBorder3 = animateColorAsState(targetScheme.headingBorder3, animationSpec, label = "md_headingBorder3").value,
        headingBorder4 = animateColorAsState(targetScheme.headingBorder4, animationSpec, label = "md_headingBorder4").value,
        headingBorder5 = animateColorAsState(targetScheme.headingBorder5, animationSpec, label = "md_headingBorder5").value,
        headingBorder6 = animateColorAsState(targetScheme.headingBorder6, animationSpec, label = "md_headingBorder6").value,
        blockquoteBorder = animateColorAsState(targetScheme.blockquoteBorder, animationSpec, label = "md_blockquoteBorder").value,
        blockquoteBg = animateColorAsState(targetScheme.blockquoteBg, animationSpec, label = "md_blockquoteBg").value,
        codeBg = animateColorAsState(targetScheme.codeBg, animationSpec, label = "md_codeBg").value,
        codeBorder = animateColorAsState(targetScheme.codeBorder, animationSpec, label = "md_codeBorder").value,
        codeHeaderBg = animateColorAsState(targetScheme.codeHeaderBg, animationSpec, label = "md_codeHeaderBg").value,
        inlineCodeBg = animateColorAsState(targetScheme.inlineCodeBg, animationSpec, label = "md_inlineCodeBg").value,
        tableHeaderBg = animateColorAsState(targetScheme.tableHeaderBg, animationSpec, label = "md_tableHeaderBg").value,
        tableHeaderFg = animateColorAsState(targetScheme.tableHeaderFg, animationSpec, label = "md_tableHeaderFg").value,
        hlKeyword = animateColorAsState(targetScheme.hlKeyword, animationSpec, label = "md_hlKeyword").value,
        hlString = animateColorAsState(targetScheme.hlString, animationSpec, label = "md_hlString").value,
        hlComment = animateColorAsState(targetScheme.hlComment, animationSpec, label = "md_hlComment").value,
        hlNumber = animateColorAsState(targetScheme.hlNumber, animationSpec, label = "md_hlNumber").value
    )
}

@Composable
fun animateGeoDecorColors(
    targetColors: GeoDecorColors,
    durationMillis: Int = 400
): GeoDecorColors {
    val animationSpec = tween<Color>(durationMillis = durationMillis)

    return targetColors.copy(
        gridLine = animateColorAsState(targetColors.gridLine, animationSpec, label = "geo_gridLine").value,
        curveColor = animateColorAsState(targetColors.curveColor, animationSpec, label = "geo_curveColor").value,
        waveColor = animateColorAsState(targetColors.waveColor, animationSpec, label = "geo_waveColor").value,
        triangleColor = animateColorAsState(targetColors.triangleColor, animationSpec, label = "geo_triangleColor").value,
        crossColor = animateColorAsState(targetColors.crossColor, animationSpec, label = "geo_crossColor").value,
        lineColor = animateColorAsState(targetColors.lineColor, animationSpec, label = "geo_lineColor").value,
        dotColor = animateColorAsState(targetColors.dotColor, animationSpec, label = "geo_dotColor").value
    )
}

@Composable
fun FANDEXTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    fontSizeScale: Float = 1.0f,
    content: @Composable () -> Unit
) {
    val targetColorScheme = if (darkTheme) {
        darkColorScheme(
            primary = Color(0xFF6EA8FE),
            secondary = FrontendColor,
            tertiary = AiColor,
            background = Color(0xFF0D0D0D),
            surface = Color(0xFF181818),
            onBackground = Color(0xFFEBEBEB),
            onSurface = Color(0xFFEBEBEB),
            surfaceVariant = Color(0xFF202020),
            outlineVariant = Color(0xFF383838)
        )
    } else {
        lightColorScheme(
            primary = PrimaryBlue,
            secondary = FrontendColor,
            tertiary = AiColor,
            background = Color(0xFFFFFFFF),
            surface = Color(0xFFFFFFFF),
            onBackground = Color(0xFF0D0D0D),
            onSurface = Color(0xFF0D0D0D),
            surfaceVariant = Color(0xFFF0F0F0),
            outlineVariant = Color(0xFFC4C4C4)
        )
    }

    val targetMarkdownColorScheme = if (darkTheme) MarkdownColorScheme.DarkScheme else MarkdownColorScheme.LightScheme

    val targetGeoDecorColors = if (darkTheme) GeoDecorColors.DarkScheme else GeoDecorColors.LightScheme

    val animatedColorScheme = animateColorScheme(targetColorScheme, durationMillis = 400)
    val animatedMarkdownColorScheme = animateMarkdownColorScheme(targetMarkdownColorScheme, durationMillis = 400)
    val animatedGeoDecorColors = animateGeoDecorColors(targetGeoDecorColors, durationMillis = 400)

    val currentDensity = LocalDensity.current
    val scaledDensity = Density(
        density = currentDensity.density,
        fontScale = (fontSizeScale.coerceIn(0.8f, 1.4f)) * currentDensity.fontScale
    )

    CompositionLocalProvider(
        LocalMarkdownColorScheme provides animatedMarkdownColorScheme,
        LocalGeoDecorColors provides animatedGeoDecorColors,
        LocalIsDarkTheme provides darkTheme,
        LocalDensity provides scaledDensity
    ) {
        MaterialTheme(
            colorScheme = animatedColorScheme,
            content = content
        )
    }
}

val LocalIsDarkTheme = staticCompositionLocalOf<Boolean> {
    error("LocalIsDarkTheme 未提供：请在外层通过 FANDEXTheme 包裹以自动注入")
}

data class GeoDecorColors(
    val gridLine: Color,
    val curveColor: Color,
    val waveColor: Color,
    val triangleColor: Color,
    val crossColor: Color,
    val lineColor: Color,
    val dotColor: Color
) {
    companion object {
        val LightScheme = GeoDecorColors(
            gridLine = Color(0xFF4F5BD5).copy(alpha = 0.10f),
            curveColor = Color(0xFF4F5BD5).copy(alpha = 0.22f),
            waveColor = Color(0xFFF9A825).copy(alpha = 0.24f),
            triangleColor = Color(0xFF4F5BD5).copy(alpha = 0.14f),
            crossColor = Color(0xFF4F5BD5).copy(alpha = 0.30f),
            lineColor = Color(0xFFD63031).copy(alpha = 0.18f),
            dotColor = Color(0xFF4F5BD5).copy(alpha = 0.22f)
        )

        val DarkScheme = GeoDecorColors(
            gridLine = Color(0xFFFFFFFF).copy(alpha = 0.05f),
            curveColor = Color(0xFF6EA8FE).copy(alpha = 0.20f),
            waveColor = Color(0xFFF9A825).copy(alpha = 0.22f),
            triangleColor = Color(0xFF6EA8FE).copy(alpha = 0.10f),
            crossColor = Color(0xFFFFFFFF).copy(alpha = 0.18f),
            lineColor = Color(0xFFD63031).copy(alpha = 0.14f),
            dotColor = Color(0xFFFFFFFF).copy(alpha = 0.10f)
        )
    }
}

val LocalGeoDecorColors = staticCompositionLocalOf<GeoDecorColors> {
    error("LocalGeoDecorColors 未提供：请在外层通过 FANDEXTheme 包裹以自动注入")
}

data class MarkdownColorScheme(
    val onBackground: Color,
    val primary: Color,
    val onSurfaceVariant: Color,
    val outlineVariant: Color,
    val surface: Color,
    val surfaceVariant: Color,
    val headingBorder1: Color,
    val headingBorder2: Color,
    val headingBorder3: Color,
    val headingBorder4: Color,
    val headingBorder5: Color,
    val headingBorder6: Color,
    val blockquoteBorder: Color,
    val blockquoteBg: Color,
    val codeBg: Color,
    val codeBorder: Color,
    val codeHeaderBg: Color,
    val inlineCodeBg: Color,
    val tableHeaderBg: Color,
    val tableHeaderFg: Color,
    val hlKeyword: Color,
    val hlString: Color,
    val hlComment: Color,
    val hlNumber: Color
) {
    companion object {
        val LightScheme = MarkdownColorScheme(
            onBackground = Color(0xFF0D0D0D),
            primary = Color(0xFF3366CC),
            onSurfaceVariant = Color(0xFF808080),
            outlineVariant = Color(0xFFC4C4C4),
            surface = Color(0xFFFFFFFF),
            surfaceVariant = Color(0xFFF0F0F0),
            headingBorder1 = Color(0xFF3366CC),
            headingBorder2 = Color(0xFF00B894),
            headingBorder3 = Color(0xFFE05A2B),
            headingBorder4 = Color(0xFFC4C4C4),
            headingBorder5 = Color(0xFF808080),
            headingBorder6 = Color(0xFF808080),
            blockquoteBorder = Color(0xFF3366CC),
            blockquoteBg = Color(0xFFF5F5F5),
            codeBg = Color(0xFFF5F5F5),
            codeBorder = Color(0xFFE0E0E0),
            codeHeaderBg = Color(0xFFE8E8E8),
            inlineCodeBg = Color(0xFFF0F0F0),
            tableHeaderBg = Color(0xFF3366CC),
            tableHeaderFg = Color(0xFFFFFFFF),
            hlKeyword = Color(0xFFA626A4),
            hlString = Color(0xFF50A14F),
            hlComment = Color(0xFFA0A1A7),
            hlNumber = Color(0xFF986801)
        )

        val DarkScheme = MarkdownColorScheme(
            onBackground = Color(0xFFEBEBEB),
            primary = Color(0xFF6EA8FE),
            onSurfaceVariant = Color(0xFF8A8A8A),
            outlineVariant = Color(0xFF383838),
            surface = Color(0xFF181818),
            surfaceVariant = Color(0xFF202020),
            headingBorder1 = Color(0xFF6EA8FE),
            headingBorder2 = Color(0xFF55EFC4),
            headingBorder3 = Color(0xFFF09070),
            headingBorder4 = Color(0xFF525252),
            headingBorder5 = Color(0xFF8A8A8A),
            headingBorder6 = Color(0xFF8A8A8A),
            blockquoteBorder = Color(0xFF6EA8FE),
            blockquoteBg = Color(0xFF181818),
            codeBg = Color(0xFF1A1A1A),
            codeBorder = Color(0xFF333333),
            codeHeaderBg = Color(0xFF252525),
            inlineCodeBg = Color(0xFF2A2A2A),
            tableHeaderBg = Color(0xFF3366CC),
            tableHeaderFg = Color(0xFFFFFFFF),
            hlKeyword = Color(0xFFC678DD),
            hlString = Color(0xFF98C379),
            hlComment = Color(0xFF8A8A8A),
            hlNumber = Color(0xFFD19A66)
        )
    }
}

val LocalMarkdownColorScheme = staticCompositionLocalOf<MarkdownColorScheme> {
    error("LocalMarkdownColorScheme 未提供：请在外层通过 FANDEXTheme 包裹以自动注入")
}
