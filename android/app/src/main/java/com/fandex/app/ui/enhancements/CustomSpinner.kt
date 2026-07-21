package com.fandex.app.ui.enhancements

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * CustomSpinner 自定义加载器
 *
 * 功能：替代 CircularProgressIndicator 的自定义加载动画，呈现三圆点旋转效果
 *
 * 实现要点：
 * - 提供 `FANDEXSpinner(size: Dp = 32.dp, color: Color = MaterialTheme.colorScheme.primary)` Composable
 * - 使用 `rememberInfiniteTransition` 旋转 3 个圆点
 * - 每个圆点错相 120 度（即 2π/3 弧度），形成等边三角形的旋转视觉
 * - 圆点颜色透明度 0.3 / 0.6 / 1.0，营造由暗到亮的过渡感
 * - 旋转周期 1.2 秒（1200ms），使用 LinearEasing 匀速旋转
 *
 * 设计原则：
 * - 圆点半径 = size / 6，三圆点围绕中心点旋转，旋转半径 = size / 3
 * - 颜色透明度由暗到亮（0.3 -> 0.6 -> 1.0），与旋转方向匹配形成"扫光"视觉
 * - 使用 Canvas 自定义绘制，避免 Material 进度指示器的样式限制
 *
 * 使用示例：
 *   FANDEXSpinner()                              // 默认 32dp，主色
 *   FANDEXSpinner(size = 48.dp, color = Color.Red)  // 自定义尺寸与颜色
 *
 * 输入：
 *   - size  整体尺寸（直径，默认 32.dp）
 *   - color 圆点颜色（默认 MaterialTheme.colorScheme.primary）
 * 输出：旋转的三圆点加载动画
 */
@Composable
fun FANDEXSpinner(
    size: Dp = 32.dp,
    color: Color = MaterialTheme.colorScheme.primary
) {
    /* 无限循环过渡器：1200ms 一个完整旋转周期 */
    val transition = rememberInfiniteTransition(label = "FANDEX_Spinner")
    val rotation by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "spinner_rotation"
    )

    /* 三圆点透明度：0.3 / 0.6 / 1.0，呈现由暗到亮的过渡 */
    val dotAlphas = floatArrayOf(0.3f, 0.6f, 1.0f)

    Box(
        modifier = Modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(size)) {
            /* 圆点半径 = 整体尺寸 / 6 */
            val dotRadius = size.toPx() / 6f
            /* 旋转半径 = 整体尺寸 / 3 */
            val orbitRadius = size.toPx() / 3f
            /* 画布中心 */
            val center = Offset(this.size.width / 2f, this.size.height / 2f)

            /* 三个圆点错相 120 度（2π/3） */
            val angleStep = (2f * Math.PI / 3f).toFloat()

            dotAlphas.forEachIndexed { index, alpha ->
                /* 当前圆点角度 = 基础旋转 + 索引偏移 */
                val angleRad = Math.toRadians(rotation.toDouble()).toFloat() + index * angleStep
                /* 圆点中心位置：以画布中心为原点，沿轨道半径旋转 */
                val dotCenter = Offset(
                    x = center.x + orbitRadius * kotlin.math.cos(angleRad),
                    y = center.y + orbitRadius * kotlin.math.sin(angleRad)
                )
                drawCircle(
                    color = color.copy(alpha = alpha),
                    radius = dotRadius,
                    center = dotCenter
                )
            }
        }
    }
}
