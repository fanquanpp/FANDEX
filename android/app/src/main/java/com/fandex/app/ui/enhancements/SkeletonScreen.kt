package com.fandex.app.ui.enhancements

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.fandex.app.ui.theme.LocalIsDarkTheme

/**
 * SkeletonScreen 骨架屏组件
 *
 * 功能：内容加载时的占位组件，通过 shimmer 扫光动画提示数据加载中
 *
 * 实现要点：
 * - 提供 `SkeletonLine(widthFraction: Float, height: Dp)` Composable 渲染单行占位条
 * - 提供 `SkeletonBlock(width: Dp, height: Dp)` Composable 渲染矩形块占位
 * - 使用 `rememberInfiniteTransition` 驱动 shimmer 效果（水平渐变扫光）
 * - 扫光颜色：暗色 Color.White.copy(alpha=0.05f) 基底 + 0.1f 扫光高光
 * - 亮色：Color.Black.copy(alpha=0.05f) 基底 + 0.1f 扫光高光
 *
 * 设计原则：
 * - shimmer 周期 1200ms，使用 LinearEasing 保证扫光匀速
 * - 通过 `drawWithCache` 缓存 Brush 实例，避免每帧重建
 * - 圆角 4.dp 保持骨架块的视觉柔和
 *
 * 使用示例：
 *   Column {
 *       SkeletonLine(widthFraction = 0.8f, height = 16.dp)
 *       Spacer(modifier = Modifier.height(8.dp))
 *       SkeletonLine(widthFraction = 0.6f, height = 12.dp)
 *   }
 *
 * 输入：
 *   - widthFraction 占父容器宽度的比例（0.0 ~ 1.0）
 *   - height        元素高度
 *   - width         矩形块宽度（仅 SkeletonBlock）
 * 输出：带扫光动画的骨架占位元素
 */

/**
 * 骨架块通用扫光背景
 *
 * 功能：根据当前 shimmer 动画进度绘制水平扫光的渐变背景
 *
 * 输入：
 *   - modifier  修饰符
 *   - width     块宽度（Dp，仅 fillWidth=false 时生效）
 *   - height    块高度（Dp）
 *   - fillWidth 是否填充父宽度（true 时忽略 width）
 */
@Composable
private fun SkeletonBox(
    modifier: Modifier = Modifier,
    width: Dp = 0.dp,
    height: Dp = 12.dp,
    fillWidth: Boolean = false
) {
    /* v3.6.0：通过 CompositionLocal 读取主题状态，与 DataStore 用户偏好同步 */
    val darkTheme = LocalIsDarkTheme.current
    /* 基底色：暗色模式使用白色低透明度，亮色模式使用黑色低透明度 */
    val baseColor = if (darkTheme) {
        Color.White.copy(alpha = 0.05f)
    } else {
        Color.Black.copy(alpha = 0.05f)
    }
    /* 扫光高光色 */
    val highlightColor = Color.White.copy(alpha = 0.1f)

    /* 无限循环过渡器：1200ms 一个扫光周期 */
    val transition = rememberInfiniteTransition(label = "Skeleton_Shimmer")
    val shimmerProgress by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_progress"
    )

    val boxModifier = if (fillWidth) {
        modifier
            .height(height)
            .clip(RoundedCornerShape(4.dp))
    } else {
        modifier
            .width(width)
            .height(height)
            .clip(RoundedCornerShape(4.dp))
    }

    Box(
        modifier = boxModifier
            .background(baseColor)
            .drawWithCache {
                /* 扫光宽度 = 容器宽度的 50%，从左侧滑入到右侧 */
                val shimmerWidth = size.width * 0.5f
                /* 起点 -shimmerWidth，终点 +shimmerWidth，保证扫光完整经过容器 */
                val startX = -shimmerWidth
                val endX = size.width
                val currentX = startX + (endX - startX + shimmerWidth) * shimmerProgress

                /* 构造线性渐变：透明 -> 高光 -> 透明，模拟扫光带 */
                val brush = Brush.linearGradient(
                    colors = listOf(
                        Color.Transparent,
                        highlightColor,
                        Color.Transparent
                    ),
                    start = Offset(currentX, 0f),
                    end = Offset(currentX + shimmerWidth, 0f)
                )
                onDrawBehind {
                    drawRect(brush)
                }
            }
    )
}

/**
 * 骨架行（占位文本行）
 *
 * 输入：
 *   - widthFraction 占父宽度比例（0.0 ~ 1.0），默认 1.0
 *   - height        行高度（默认 12.dp）
 *   - modifier      修饰符
 */
@Composable
fun SkeletonLine(
    widthFraction: Float = 1f,
    height: Dp = 12.dp,
    modifier: Modifier = Modifier
) {
    SkeletonBox(
        modifier = modifier.fillMaxWidth(widthFraction),
        height = height,
        fillWidth = true
    )
}

/**
 * 骨架块（矩形占位）
 *
 * 输入：
 *   - width    块宽度
 *   - height   块高度
 *   - modifier 修饰符
 */
@Composable
fun SkeletonBlock(
    width: Dp,
    height: Dp,
    modifier: Modifier = Modifier
) {
    SkeletonBox(
        modifier = modifier,
        width = width,
        height = height,
        fillWidth = false
    )
}
