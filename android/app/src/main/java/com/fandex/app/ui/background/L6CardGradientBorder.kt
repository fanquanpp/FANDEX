package com.fandex.app.ui.background

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.fandex.app.ui.theme.AiColor
import com.fandex.app.ui.theme.FrontendColor
import com.fandex.app.ui.theme.LocalIsDarkTheme
import com.fandex.app.ui.theme.PrimaryBlue

/**
 * L6 卡片渐变边框（Card Gradient Border）
 *
 * 功能：为任意 Composable 添加旋转动画的渐变边框，提升卡片的视觉质感与品牌识别度
 *
 * 实现要点：
 * - 提供 `Modifier.animatedGradientBorder` 扩展函数
 * - 使用 `rememberInfiniteTransition` 让渐变沿边框旋转（4 秒周期）
 * - 使用 `drawWithContent` 在内容下方绘制圆角矩形边框
 * - 使用 `Brush.sweepGradient` 配合 `DrawScope.rotate` 实现旋转的渐变效果
 * - 默认颜色：listOf(PrimaryBlue, AiColor, FrontendColor)
 * - 透明度：暗色模式 0.4，亮色模式 0.2
 *
 * 设计原则：
 * - 通过 `composed` 让 Modifier 能够访问 Composable 上下文（如 LocalIsDarkTheme）
 * - 渐变颜色循环闭合（首尾颜色相同），避免旋转时出现可见接缝
 * - 边框在内容下方绘制（先 drawContent 再 drawBorder），保证内容不被遮挡
 *
 * 使用示例：
 *   Card(modifier = Modifier.animatedGradientBorder()) { ... }
 *
 * 输入：
 *   - borderWidth 边框宽度（默认 1.5.dp）
 *   - colors      渐变颜色列表（默认品牌三色）
 * 输出：附带动画渐变边框的 Modifier
 */
fun Modifier.animatedGradientBorder(
    borderWidth: Dp = 1.5.dp,
    colors: List<Color> = listOf(PrimaryBlue, AiColor, FrontendColor)
): Modifier = composed {
    /* 根据主题模式调整颜色透明度（通过 LocalIsDarkTheme 与 DataStore 用户偏好同步） */
    val darkTheme = LocalIsDarkTheme.current
    val colorAlpha = if (darkTheme) 0.4f else 0.2f

    /* 应用透明度后的颜色列表 */
    val adjustedColors = colors.map { it.copy(alpha = colorAlpha) }

    /* 无限循环过渡器：4 秒一个完整旋转周期 */
    val transition = rememberInfiniteTransition(label = "L6_GradientBorder")
    val rotation by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "border_rotation"
    )

    /* 边框宽度转 px */
    val borderWidthPx = with(androidx.compose.ui.platform.LocalDensity.current) { borderWidth.toPx() }

    /* 使用 drawWithContent 在内容下方绘制边框 */
    this.drawWithContent {
        /* 先绘制内容，再绘制边框，保证边框浮于内容之上但不遮挡内容主体 */
        drawContent()

        /* 边框矩形尺寸：略小于画布尺寸，避免边框被裁切 */
        val topLeft = Offset(borderWidthPx / 2f, borderWidthPx / 2f)
        val size = androidx.compose.ui.geometry.Size(
            size.width - borderWidthPx,
            size.height - borderWidthPx
        )

        /* 构造闭合颜色列表：首色重复添加到末尾，避免 sweepGradient 在 0/360 度处出现可见接缝 */
        val closedColors = if (adjustedColors.isNotEmpty()) {
            adjustedColors + adjustedColors.first()
        } else {
            adjustedColors
        }

        /* SweepGradient 中心位于矩形中心 */
        val center = Offset(
            topLeft.x + size.width / 2f,
            topLeft.y + size.height / 2f
        )

        /* 通过 rotate 旋转坐标系，让 sweepGradient 的起点跟随旋转 */
        rotate(
            degrees = rotation,
            pivot = center
        ) {
            drawRoundRect(
                brush = Brush.sweepGradient(
                    colors = closedColors,
                    center = center
                ),
                topLeft = topLeft,
                size = size,
                style = Stroke(width = borderWidthPx)
            )
        }
    }
}
