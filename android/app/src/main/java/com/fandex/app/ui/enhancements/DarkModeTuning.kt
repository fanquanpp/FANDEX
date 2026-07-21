package com.fandex.app.ui.enhancements

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import com.fandex.app.ui.theme.LocalIsDarkTheme

/**
 * DarkModeTuning 暗色模式调优
 *
 * 功能：提供暗色模式下的颜色调优工具，自动提高对比度以保证可读性
 *
 * 实现要点：
 * - 提供 `Color.adaptForDarkTheme(alpha: Float)` 扩展函数
 * - 提供 `Color.elevateForDarkTheme(elevation: Int)` 扩展函数（提亮颜色）
 * - 提供 `@Composable rememberAdaptiveColor(lightColor: Color, darkColor: Color)` 函数
 *
 * 设计原则：
 * - 暗色模式下背景较深，需要降低颜色透明度以保持视觉平衡
 * - 暗色模式下需要适当提亮颜色（增加 luminance），保证文本可读性
 * - rememberAdaptiveColor 通过 LocalIsDarkTheme 自动切换两套颜色
 *
 * 使用示例：
 *   val accentColor = rememberAdaptiveColor(
 *       lightColor = Color(0xFF4F5BD5),
 *       darkColor = Color(0xFF6EA8FE)
 *   )
 *   val bgAlpha = Color.White.adaptForDarkTheme(alpha = 0.1f)
 *   val elevated = Color.Gray.elevateForDarkTheme(elevation = 2)
 */

/**
 * 为暗色模式调整颜色透明度
 *
 * 功能：根据当前是否暗色模式调整颜色的 alpha 通道
 *
 * 实现说明：
 * - 暗色模式：保持原 alpha，因为暗色背景需要较高对比度
 * - 亮色模式：alpha 略微降低（× 0.7），避免在亮色背景上颜色过于刺眼
 * - 使用 @ReadOnlyComposable 注解，允许在 Composable 上下文中读取 LocalIsDarkTheme
 *
 * 输入：
 *   - alpha 目标透明度（0.0 ~ 1.0）
 * 输出：调整 alpha 后的 Color
 *
 * 使用示例：
 *   val bgColor = Color.Black.adaptForDarkTheme(alpha = 0.4f)
 */
@ReadOnlyComposable
@Composable
fun Color.adaptForDarkTheme(
    alpha: Float
): Color {
    val darkTheme = LocalIsDarkTheme.current
    /* 暗色模式保持原 alpha，亮色模式略降低 */
    val adjustedAlpha = if (darkTheme) {
        alpha
    } else {
        alpha * 0.7f
    }
    return this.copy(alpha = adjustedAlpha.coerceIn(0f, 1f))
}

/**
 * 为暗色模式提亮颜色
 *
 * 功能：根据 elevation 等级提亮颜色，增加 luminance 改善暗色背景下的可读性
 *
 * 实现说明：
 * - 暗色模式：按 elevation 等级向白色混合，每级混合比例 0.1
 * - 亮色模式：返回原色，不做调整
 * - 使用 @ReadOnlyComposable 注解，允许在 Composable 上下文中读取 LocalIsDarkTheme
 *
 * 输入：
 *   - elevation 提亮等级（1~5，等级越高提亮越多）
 * 输出：提亮后的 Color
 *
 * 使用示例：
 *   val textColor = Color.Gray.elevateForDarkTheme(elevation = 2)
 */
@ReadOnlyComposable
@Composable
fun Color.elevateForDarkTheme(
    elevation: Int
): Color {
    val darkTheme = LocalIsDarkTheme.current
    if (!darkTheme) return this

    /* elevation 限制在 1~5 范围 */
    val level = elevation.coerceIn(1, 5)
    /* 混合比例：每级 0.1，最大 0.5 */
    val mixRatio = level * 0.1f

    /* 向白色混合：RGB 通道均向 1f 靠拢 */
    val r = this.red + (1f - this.red) * mixRatio
    val g = this.green + (1f - this.green) * mixRatio
    val b = this.blue + (1f - this.blue) * mixRatio

    return Color(
        red = r.coerceIn(0f, 1f),
        green = g.coerceIn(0f, 1f),
        blue = b.coerceIn(0f, 1f),
        alpha = this.alpha
    )
}

/**
 * 自适应颜色选择
 *
 * 功能：根据当前是否暗色模式自动选择对应的颜色
 *
 * 实现说明：
 * - 暗色模式返回 darkColor
 * - 亮色模式返回 lightColor
 * - 通过 remember 缓存选择结果，避免重复计算
 *
 * 输入：
 *   - lightColor 亮色模式颜色
 *   - darkColor  暗色模式颜色
 * 输出：当前主题对应的 Color
 *
 * 使用示例：
 *   val accentColor = rememberAdaptiveColor(
 *       lightColor = Color(0xFF4F5BD5),
 *       darkColor = Color(0xFF6EA8FE)
 *   )
 */
@Composable
fun rememberAdaptiveColor(
    lightColor: Color,
    darkColor: Color
): Color {
    val darkTheme = LocalIsDarkTheme.current
    return remember(lightColor, darkColor, darkTheme) {
        if (darkTheme) darkColor else lightColor
    }
}
