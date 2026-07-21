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

/**
 * ColorScheme 颜色过渡动画辅助函数
 *
 * 功能：对 Material 3 ColorScheme 的全部 29 个颜色字段执行 animateColorAsState 动画，
 *       实现主题切换时 MaterialTheme 颜色的平滑过渡，避免突兀的颜色切换
 *
 * 实现原理：
 * - 对每个颜色字段调用 animateColorAsState，独立追踪该颜色的目标值
 * - 当目标值变化时（亮色 ↔ 暗色切换），颜色按 tween 动画曲线在 durationMillis 内插值过渡
 * - 返回的 ColorScheme 各字段为当前动画帧的颜色值，Composable 会随动画重绘
 *
 * 输入：
 *   - targetScheme：目标 ColorScheme（亮色或暗色）
 *   - durationMillis：动画时长（默认 400ms，Material 3 推荐过渡时长）
 *
 * 输出：当前动画帧的 ColorScheme，可直接传给 MaterialTheme
 *
 * 性能说明：
 * - 29 个 animateColorAsState 调用看似较多，但每个仅追踪一个 Color 值，开销极小
 * - Compose 会智能合并需要重绘的区域，整体性能开销可控
 * - 动画结束后各 State 自动稳定，不再触发重绘
 */
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

/**
 * MarkdownColorScheme 颜色过渡动画辅助函数
 *
 * 功能：对 MarkdownColorScheme 的全部 24 个颜色字段执行 animateColorAsState 动画，
 *       实现 Markdown 渲染相关颜色（标题边框、代码块背景、表格表头、语法高亮等）的平滑过渡
 *
 * 实现原理：同 animateColorScheme，对每个颜色字段独立追踪并动画
 *
 * 输入：
 *   - targetScheme：目标 MarkdownColorScheme（亮色或暗色）
 *   - durationMillis：动画时长（默认 400ms）
 *
 * 输出：当前动画帧的 MarkdownColorScheme，供 LocalMarkdownColorScheme 注入
 *
 * 注意：与 animateColorScheme 同步调用，保证 MaterialTheme 与 Markdown 渲染颜色过渡一致
 */
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

/**
 * GeoDecorColors 颜色过渡动画辅助函数
 *
 * 功能：对 GeoDecorColors 的全部 7 个颜色字段执行 animateColorAsState 动画，
 *       实现几何装饰元素（网格、曲线、波纹、三角形、十字、对角线、点阵）颜色的平滑过渡
 *
 * 实现原理：同 animateColorScheme，对每个颜色字段独立追踪并动画
 *
 * 输入：
 *   - targetColors：目标 GeoDecorColors（亮色或暗色）
 *   - durationMillis：动画时长（默认 400ms）
 *
 * 输出：当前动画帧的 GeoDecorColors，供 LocalGeoDecorColors 注入
 *
 * 注意：与 animateColorScheme 同步调用，保证 MaterialTheme 与几何装饰颜色过渡一致
 */
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

/**
 * FANDEX 应用主题
 *
 * 功能：定义亮色/暗色主题配色，并提供 Markdown 渲染专用颜色方案与几何装饰颜色方案
 * 输入：
 *   - darkTheme：是否暗色模式（默认跟随系统）
 *   - fontSizeScale：UI 显示大小缩放比例（0.8-1.4，默认 1.0）
 * 输出：MaterialTheme 配置 + LocalMarkdownColorScheme + LocalGeoDecorColors + LocalIsDarkTheme 注入
 *
 * 设计说明：
 * - dark scheme 使用更亮的 primary（0xFF6EA8FE）以改善深色背景下的对比度
 * - light scheme 使用 PrimaryBlue（0xFF4F5BD5）保持品牌一致性
 * - background/surface/onBackground 等字段与 MarkdownColorScheme 对齐，保证视觉统一
 * - MarkdownColorScheme 通过 CompositionLocalProvider 注入，消除 MarkdownContent 的 isDarkMode 参数依赖
 * - GeoDecorColors 通过 CompositionLocalProvider 注入，供 GeoBgDecor 装饰层读取
 * - LocalIsDarkTheme 通过 CompositionLocalProvider 注入，供底层装饰层读取当前主题状态，
 *   避免装饰层直接调用 isSystemInDarkTheme() 与 DataStore 用户偏好不同步（v3.6.0 修复）
 *
 * v3.6.0 UI 显示大小：
 * - 通过覆盖 LocalDensity 的 fontScale 属性，实现全局字号缩放
 * - 所有使用 sp 单位的 Text 组件都会自动响应 fontSizeScale
 * - MarkdownContent 内部的 fontSizeScale 参数保留但调用处传 1.0，避免双重缩放
 * - 范围限制：0.8x（小）- 1.4x（大），与 DataStore 的 fontSizeScale 一致
 */
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

    /* 根据暗色/亮色模式解析 Markdown 专用颜色方案 */
    val targetMarkdownColorScheme = if (darkTheme) MarkdownColorScheme.DarkScheme else MarkdownColorScheme.LightScheme

    /* 根据暗色/亮色模式解析几何装饰颜色方案 */
    val targetGeoDecorColors = if (darkTheme) GeoDecorColors.DarkScheme else GeoDecorColors.LightScheme

    /* 主题切换颜色过渡动画：对 ColorScheme / MarkdownColorScheme / GeoDecorColors 三套配色
     * 同步执行 400ms tween 动画，避免主题切换时颜色突变造成视觉突兀。
     * 三套动画使用相同时长与曲线，保证 MaterialTheme、Markdown 渲染与几何装饰颜色过渡完全同步。 */
    val animatedColorScheme = animateColorScheme(targetColorScheme, durationMillis = 400)
    val animatedMarkdownColorScheme = animateMarkdownColorScheme(targetMarkdownColorScheme, durationMillis = 400)
    val animatedGeoDecorColors = animateGeoDecorColors(targetGeoDecorColors, durationMillis = 400)

    /* v3.6.0：覆盖 LocalDensity 的 fontScale，实现全局字号缩放 */
    val currentDensity = LocalDensity.current
    val scaledDensity = Density(
        density = currentDensity.density,
        fontScale = (fontSizeScale.coerceIn(0.8f, 1.4f)) * currentDensity.fontScale
    )

    /* 通过 CompositionLocalProvider 统一注入动画后的 Markdown 颜色方案、几何装饰颜色方案、
     * 暗色主题状态与字号缩放 */
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

/**
 * 暗色主题状态 CompositionLocal
 *
 * 功能：在 Compose 树中提供当前主题是否为暗色模式的状态，避免装饰层与底层组件
 *       直接调用 isSystemInDarkTheme() 导致与 DataStore 用户偏好不同步
 *
 * v3.6.0 修复背景：
 * - 项目允许用户通过 DataStore 持久化深色/浅色模式偏好，与系统主题解耦
 * - 但 L1ParticleLayer / L3GridNoiseLayer / GlassCard / SkeletonScreen 等底层组件
 *   直接调用 isSystemInDarkTheme()，导致用户切换主题后这些组件仍按系统主题渲染
 * - 通过 CompositionLocal 注入真实主题状态，保证全树主题一致性
 *
 * 使用示例：
 *   val isDark = LocalIsDarkTheme.current
 *   val color = if (isDark) Color.White else Color.Black
 */
val LocalIsDarkTheme = staticCompositionLocalOf<Boolean> {
    error("LocalIsDarkTheme 未提供：请在外层通过 FANDEXTheme 包裹以自动注入")
}

/**
 * 构成主义几何装饰颜色方案
 *
 * 功能：封装深色/浅色模式下所有几何装饰元素的颜色配置
 * 输入：无（通过 LocalGeoDecorColors CompositionLocal 读取）
 * 输出：完整的几何装饰颜色配置对象
 *
 * 设计来源：参考 KeMuONEXueKao 项目的 CSS 变量 --geo-* 系列 token，
 *           以 Compose Color 方式重新定义，适配移动端双主题
 *
 * 设计原则：
 * - 浅色模式：低饱和度 + 低透明度，避免装饰元素干扰白色背景上的内容阅读
 * - 暗色模式：使用更亮的颜色与略高的透明度，让装饰元素在深色背景上可被感知
 * - 颜色与品牌色板（PrimaryBlue / FrontendColor / AiColor）保持一致
 *
 * v3.6.0 变更：
 * - 移除 primaryGlow / accentGlow 字段（径向渐变光晕已删除，无外部引用）
 */
data class GeoDecorColors(
    /** 网格底纹线条色 */
    val gridLine: Color,
    /** S 形曲线与同心环主色 */
    val curveColor: Color,
    /** 波纹色（内层环与波浪线） */
    val waveColor: Color,
    /** 直角三角形切片填充色 */
    val triangleColor: Color,
    /** 十字坐标点阵色 */
    val crossColor: Color,
    /** 对角粗线与辅助线色 */
    val lineColor: Color,
    /** 径向点阵色 */
    val dotColor: Color
) {
    companion object {
        /**
         * 浅色模式颜色方案
         *
         * v3.1.0 设计变更：加强浅色模式下装饰效果与明显度
         *   - 原方案所有颜色透明度极低（0.04~0.18），在白色背景上几乎不可见
         *   - 新方案提升透明度至 0.16~0.32，让装饰在浅色模式下也能清晰感知
         *   - 同时引入更丰富的色彩组合，避免单一蓝色调带来的单调感
         *   - 仍保持"克制点缀"原则，不干扰内容阅读
         */
        val LightScheme = GeoDecorColors(
            gridLine = Color(0xFF4F5BD5).copy(alpha = 0.10f),
            curveColor = Color(0xFF4F5BD5).copy(alpha = 0.22f),
            waveColor = Color(0xFFF9A825).copy(alpha = 0.24f),
            triangleColor = Color(0xFF4F5BD5).copy(alpha = 0.14f),
            crossColor = Color(0xFF4F5BD5).copy(alpha = 0.30f),
            lineColor = Color(0xFFD63031).copy(alpha = 0.18f),
            dotColor = Color(0xFF4F5BD5).copy(alpha = 0.22f)
        )

        /**
         * 暗色模式颜色方案
         *
         * 设计说明：颜色透明度略高于浅色模式（0.08~0.22），
         *           让装饰元素在深色背景上保持可感知但不喧宾夺主
         */
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

/**
 * 几何装饰颜色方案的 CompositionLocal
 *
 * 功能：在 Compose 树中提供当前主题的几何装饰颜色方案，避免通过参数逐层透传
 * 输入：GeoDecorColors 实例（由 FANDEXTheme 通过 CompositionLocalProvider 注入）
 * 输出：LocalGeoDecorColors.current 可在任意子 Composable 中获取当前颜色方案
 *
 * 使用示例：
 *   val colors = LocalGeoDecorColors.current
 *   Canvas { drawLine(colors.gridLine, ...) }
 */
val LocalGeoDecorColors = staticCompositionLocalOf<GeoDecorColors> {
    error("LocalGeoDecorColors 未提供：请在外层通过 FANDEXTheme 包裹以自动注入")
}

/**
 * Markdown 渲染专用颜色方案
 *
 * 功能：封装深色/浅色模式下所有 Markdown 渲染所需颜色（标题边框、代码块背景、表格表头、语法高亮等）
 * 输入：无（通过 LocalMarkdownColorScheme CompositionLocal 读取）
 * 输出：完整的 Markdown 渲染颜色配置对象
 *
 * 设计说明：
 * - 标准 Material 颜色（onBackground/primary/surface 等）与 Theme.kt 的 colorScheme 对齐
 * - Markdown 专用颜色（headingBorder/blockquoteBg/codeBg 等）独立定义，保持渲染灵活性
 * - 通过 LocalMarkdownColorScheme 注入，避免 MarkdownContent 接收 isDarkMode 参数
 */
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
        /** 浅色模式颜色方案 */
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

        /** 暗色模式颜色方案（primary 使用更亮的 0xFF6EA8FE 以改善对比度） */
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

/**
 * Markdown 颜色方案的 CompositionLocal
 *
 * 功能：在 Compose 树中提供当前主题的 Markdown 渲染颜色方案，避免通过参数逐层透传
 * 输入：MarkdownColorScheme 实例（由 FANDEXTheme 通过 CompositionLocalProvider 注入）
 * 输出：LocalMarkdownColorScheme.current 可在任意子 Composable 中获取当前颜色方案
 *
 * 使用示例：
 *   val colorScheme = LocalMarkdownColorScheme.current
 *   Text(color = colorScheme.onBackground)
 */
val LocalMarkdownColorScheme = staticCompositionLocalOf<MarkdownColorScheme> {
    error("LocalMarkdownColorScheme 未提供：请在外层通过 FANDEXTheme 包裹以自动注入")
}
