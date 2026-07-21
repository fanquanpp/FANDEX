package com.fandex.app.ui.background

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.fandex.app.ui.theme.LocalGeoDecorColors
import com.fandex.app.ui.theme.LocalIsDarkTheme
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/**
 * L3 网格点阵层（Grid Dot Matrix Layer）
 *
 * 功能：绘制多层次的点阵 + 极细网格底纹，为背景增加工程图纸般的精确感与构成主义美感
 *
 * v3.6.0 变更：
 *   - 移除 isSystemInDarkTheme() 直接调用，改用 LocalIsDarkTheme CompositionLocal
 *     保证与 DataStore 用户偏好一致
 *
 * v3.1.0 重新规划点状图设计：
 *   - 移除原"网格线 + 网格交叉点 1px 小点"的简单方案
 *   - 引入三层独立点阵系统，每层密度、大小、透明度差异化：
 *     · 主点阵（Major Grid）：32dp 间距，2px 直径，主色调，构成基础节奏
 *     · 次点阵（Minor Grid）：16dp 间距，1px 直径，弱化透明度，填充细节
 *     · 强调点阵（Accent Dots）：64dp 间距，3px 直径，强调色（FrontendColor/AiColor），
 *       采用伪随机抖动偏移，避免完全规整带来的呆板感
 *   - 主网格线仅保留极淡的辅助线（透明度 0.04~0.08），避免视觉噪点
 *   - 浅色模式：使用主色调 PrimaryBlue 提升装饰明显度，避免在白底上几乎不可见
 *   - 暗色模式：使用白色低透明度，保持原有克制美学
 *
 * 输入：modifier 修饰符、可选的主网格大小（默认 32dp）
 * 输出：充满父容器的多层次点阵 Canvas
 */
@Composable
fun L3GridNoiseLayer(
    modifier: Modifier = Modifier,
    gridSize: Dp = 32.dp
) {
    /* v3.6.0：通过 CompositionLocal 读取主题状态，与 DataStore 用户偏好同步 */
    val darkTheme = LocalIsDarkTheme.current

    /* 从 CompositionLocal 读取当前主题的几何装饰颜色配置 */
    val colors = LocalGeoDecorColors.current

    /* 获取 Density 用于 dp -> px 转换 */
    val density = LocalDensity.current
    val gridSizePx = with(density) { gridSize.toPx() }.coerceAtLeast(1f)
    val minorGridSizePx = gridSizePx / 2f  /* 次点阵间距为主点阵的一半 */
    val accentGridSizePx = gridSizePx * 2f  /* 强调点阵间距为主点阵的两倍 */

    /* 主点阵颜色：浅色模式使用 PrimaryBlue 提升可见度，暗色模式使用白色 */
    val majorDotColor = if (darkTheme) {
        Color.White.copy(alpha = 0.10f)
    } else {
        Color(0xFF4F5BD5).copy(alpha = 0.18f)  /* PrimaryBlue，浅色模式明显度更高 */
    }

    /* 次点阵颜色：比主点阵更弱，仅作填充 */
    val minorDotColor = if (darkTheme) {
        Color.White.copy(alpha = 0.05f)
    } else {
        Color(0xFF4F5BD5).copy(alpha = 0.08f)
    }

    /* 强调点阵颜色：使用 FrontendColor 与 AiColor 交替，形成视觉焦点 */
    val accentDotColor1 = Color(0xFFD63031)  /* FrontendColor 红 */
    val accentDotColor2 = Color(0xFFF9A825)  /* AiColor 橙 */

    /* 辅助网格线颜色：极淡，仅作背景骨架 */
    val gridLineColor = colors.gridLine

    /* 强调点阵的伪随机抖动种子（基于固定 seed 保证位置一致） */
    val random = remember { Random(seed = 42L) }

    Canvas(modifier = modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        if (w <= 0f || h <= 0f || gridSizePx <= 0f) return@Canvas

        /* ---------- 第一层：极细辅助网格线（透明度极低，仅作骨架） ---------- */
        /* 竖向网格线 */
        var x = 0f
        while (x <= w) {
            drawLine(
                color = gridLineColor,
                start = Offset(x, 0f),
                end = Offset(x, h),
                strokeWidth = 0.5f
            )
            x += gridSizePx
        }
        /* 横向网格线 */
        var y = 0f
        while (y <= h) {
            drawLine(
                color = gridLineColor,
                start = Offset(0f, y),
                end = Offset(w, y),
                strokeWidth = 0.5f
            )
            y += gridSizePx
        }

        /* ---------- 第二层：次点阵（16dp 间距，1px 直径） ---------- */
        var minorX = 0f
        while (minorX <= w) {
            var minorY = 0f
            while (minorY <= h) {
                drawCircle(
                    color = minorDotColor,
                    radius = 0.5f,
                    center = Offset(minorX, minorY)
                )
                minorY += minorGridSizePx
            }
            minorX += minorGridSizePx
        }

        /* ---------- 第三层：主点阵（32dp 间距，2px 直径） ---------- */
        var majorX = 0f
        while (majorX <= w) {
            var majorY = 0f
            while (majorY <= h) {
                drawCircle(
                    color = majorDotColor,
                    radius = 1f,
                    center = Offset(majorX, majorY)
                )
                majorY += gridSizePx
            }
            majorX += gridSizePx
        }

        /* ---------- 第四层：强调点阵（64dp 间距，3px 直径，双色交替 + 抖动） ---------- */
        /* 强调点阵采用 FrontendColor 与 AiColor 交替，并加入 ±4px 的伪随机抖动 */
        var accentX = accentGridSizePx / 2f  /* 偏移半个间距，避免与主点阵重合 */
        var accentIndex = 0
        while (accentX <= w) {
            var accentY = accentGridSizePx / 2f
            while (accentY <= h) {
                /* 抖动偏移：基于固定 seed 的伪随机，保证每次绘制位置一致 */
                val jitterX = (random.nextFloat() - 0.5f) * 8f  /* ±4px 抖动 */
                val jitterY = (random.nextFloat() - 0.5f) * 8f
                val center = Offset(accentX + jitterX, accentY + jitterY)
                /* 双色交替：偶数索引用 FrontendColor，奇数索引用 AiColor */
                val accentColor = if (accentIndex % 2 == 0) accentDotColor1 else accentDotColor2
                val alpha = if (darkTheme) 0.22f else 0.30f  /* 浅色模式略强 */
                drawCircle(
                    color = accentColor.copy(alpha = alpha),
                    radius = 1.5f,
                    center = center
                )
                accentY += accentGridSizePx
                accentIndex++
            }
            accentX += accentGridSizePx
        }
    }
}
