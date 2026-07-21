package com.fandex.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.fandex.app.ui.theme.GeoDecorColors
import com.fandex.app.ui.theme.LocalGeoDecorColors
import kotlin.math.sqrt

/**
 * 构成主义几何背景装饰层
 *
 * 功能：在视图底层绘制构成主义风格的几何装饰图案，包括网格底纹、
 *       对角粗线、十字坐标点阵、S 形曲线、同心环等元素，
 *       为应用界面营造层次感与设计质感，同时保持克制避免干扰内容阅读
 *
 * v3.6.0 变更：
 *   - 移除 GlowTopLeft / GlowBottomRight 光晕装饰元素及其绘制函数
 *   - 原因：径向渐变光晕属于发散模糊类效果，按用户要求全部删除
 *   - 移除后装饰更聚焦于"几何线条 + 精确点阵"的构成主义美学
 *
 * 设计来源：参考 KeMuONEXueKao 项目的 CSS 构成主义几何装饰系统，
 *           以 Jetpack Compose Canvas 原生绘制方式重新实现，适配移动端
 *
 * 设计原则：
 * - 构成主义 / 包豪斯 / 至上主义美学
 * - 克制使用：仅作背景点缀，不干扰内容阅读
 * - 几何母题：网格 / 圆弧切片 / 对角粗线 / 错位方块
 * - 支持亮色 / 暗色双主题
 * - 全部 pointer-events 透传（Canvas 默认不拦截点击）
 */
@Composable
fun GeoBgDecor(
    variant: GeoBgVariant,
    modifier: Modifier = Modifier
) {
    /* 从 CompositionLocal 读取当前主题的几何装饰颜色配置 */
    val colors = LocalGeoDecorColors.current
    /* 获取 Density 用于 dp -> px 转换 */
    val density = LocalDensity.current

    /* 预计算装饰绘制参数，避免在 DrawScope 内重复分配 */
    val config = remember(variant, colors, density) {
        GeoDecorRenderer.buildConfig(variant, colors, density)
    }

    Box(modifier = modifier.fillMaxSize()) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            /* 按配置顺序绘制各装饰元素 */
            GeoDecorRenderer.render(this, config)
        }
    }
}

/**
 * 装饰层支持的视图变体
 *
 * 设计说明：各变体对应不同的装饰密度与元素组合，
 *           避免所有页面千篇一律的视觉感受
 */
sealed class GeoBgVariant {
    /** 首页：S 曲线 + 涟漪环 + 三角切片等装饰元素 */
    object Home : GeoBgVariant()

    /** 模块详情页：网格底纹 + 平行斜线 + 十字坐标点 + 动态元素 */
    object Module : GeoBgVariant()

    /** 启动页：大网格底纹 + 涟漪环，营造仪式感 */
    object Splash : GeoBgVariant()

    /** 通用加载态：网格底纹 + 小点阵 */
    object Loading : GeoBgVariant()
}

/**
 * 装饰元素绘制器内部实现
 *
 * 功能：封装各装饰元素的 Canvas 绘制逻辑，通过配置表驱动渲染，
 *       避免在 Composable 中重复书写冗长的绘制代码
 */
private object GeoDecorRenderer {

    /**
     * 构建装饰配置
     *
     * 输入：视图变体、颜色配置、Density
     * 输出：包含所有需要绘制元素的配置列表
     */
    fun buildConfig(
        variant: GeoBgVariant,
        colors: GeoDecorColors,
        density: androidx.compose.ui.unit.Density
    ): List<DecorItem> {
        return when (variant) {
            GeoBgVariant.Home -> listOf(
                /* v3.6.0：移除 GlowTopLeft / GlowBottomRight 光晕 */
                DecorItem.GridBackground(colors.gridLine, gridSize = 64.dp),
                DecorItem.CurveS(colors.curveColor),
                DecorItem.RippleTopRight(colors.curveColor, colors.waveColor),
                DecorItem.TriangleRightTop(colors.triangleColor),
                DecorItem.CrossMarks(colors.crossColor),
                DecorItem.DiagLine(colors.lineColor)
            )
            GeoBgVariant.Module -> listOf(
                DecorItem.GridBackground(colors.gridLine, gridSize = 64.dp),
                DecorItem.ParallelLines(colors.curveColor),
                DecorItem.CrossMarks(colors.crossColor),
                DecorItem.DotsRadial(colors.dotColor),
                DecorItem.DiagLine(colors.lineColor),
                DecorItem.HalfRingsBottomRight(colors.curveColor, colors.waveColor)
            )
            GeoBgVariant.Splash -> listOf(
                /* v3.6.0：移除 GlowTopLeft / GlowBottomRight 光晕 */
                DecorItem.GridBackground(colors.gridLine, gridSize = 80.dp),
                DecorItem.RippleTopRight(colors.curveColor, colors.waveColor),
                DecorItem.CrossMarks(colors.crossColor),
                DecorItem.CurveS(colors.curveColor)
            )
            GeoBgVariant.Loading -> listOf(
                DecorItem.GridBackground(colors.gridLine, gridSize = 64.dp),
                DecorItem.DotsRadial(colors.dotColor)
            )
        }
    }

    /**
     * 按配置顺序绘制所有装饰元素
     *
     * 输入：DrawScope、配置列表
     * 输出：在 Canvas 上绘制各装饰元素
     */
    fun render(drawScope: DrawScope, config: List<DecorItem>) {
        config.forEach { item ->
            when (item) {
                is DecorItem.GridBackground -> drawGridBackground(drawScope, item)
                is DecorItem.CurveS -> drawCurveS(drawScope, item)
                is DecorItem.RippleTopRight -> drawRippleTopRight(drawScope, item)
                is DecorItem.TriangleRightTop -> drawTriangleRightTop(drawScope, item)
                is DecorItem.CrossMarks -> drawCrossMarks(drawScope, item)
                is DecorItem.DiagLine -> drawDiagLine(drawScope, item)
                is DecorItem.ParallelLines -> drawParallelLines(drawScope, item)
                is DecorItem.DotsRadial -> drawDotsRadial(drawScope, item)
                is DecorItem.HalfRingsBottomRight -> drawHalfRingsBottomRight(drawScope, item)
            }
        }
    }

    /* ---------- 各装饰元素绘制实现 ---------- */

    /**
     * 绘制构成主义网格底纹
     *
     * 设计说明：使用径向遮罩聚焦，避免网格满铺造成的视觉压迫
     */
    private fun drawGridBackground(scope: DrawScope, item: DecorItem.GridBackground) {
        val gridSizePx = with(scope) { item.gridSize.toPx() }
        if (gridSizePx <= 0f) return
        val w = scope.size.width
        val h = scope.size.height
        val gridColor = item.color

        /* 绘制竖向网格线 */
        var x = 0f
        while (x <= w) {
            scope.drawLine(
                color = gridColor,
                start = Offset(x, 0f),
                end = Offset(x, h),
                strokeWidth = 1f
            )
            x += gridSizePx
        }
        /* 绘制横向网格线 */
        var y = 0f
        while (y <= h) {
            scope.drawLine(
                color = gridColor,
                start = Offset(0f, y),
                end = Offset(w, y),
                strokeWidth = 1f
            )
            y += gridSizePx
        }
    }

    /**
     * 绘制 S 形曲线 · 从左下到右上的双贝塞尔曲线
     *
     * 设计说明：使用 Path + cubicTo 绘制平滑的 S 形曲线，
     *           呼应数据流动感与构成主义的动态美学
     */
    private fun drawCurveS(scope: DrawScope, item: DecorItem.CurveS) {
        val w = scope.size.width
        val h = scope.size.height
        if (w <= 0f || h <= 0f) return

        val path = Path().apply {
            moveTo(0f, h * 0.78f)
            cubicTo(
                w * 0.18f, h * 0.78f,
                w * 0.30f, h * 0.20f,
                w * 0.50f, h * 0.35f
            )
            cubicTo(
                w * 0.70f, h * 0.50f,
                w * 0.85f, h * 0.92f,
                w, h * 0.65f
            )
        }

        scope.drawPath(
            path = path,
            color = item.color,
            style = Stroke(
                width = 1.5f,
                cap = StrokeCap.Round
            )
        )
    }

    /**
     * 绘制同心圆涟漪 · 右上角向外扩散
     *
     * 设计说明：两层同心圆，外层使用主曲线色，内层使用波纹色
     */
    private fun drawRippleTopRight(scope: DrawScope, item: DecorItem.RippleTopRight) {
        val w = scope.size.width
        val radius = minOf(w, scope.size.height) * 0.42f
        if (radius <= 0f) return
        val center = Offset(w + radius * 0.25f, -radius * 0.25f)

        /* 外层环 */
        scope.drawCircle(
            color = item.outerColor,
            radius = radius,
            center = center,
            style = Stroke(width = 1f)
        )
        /* 内层环 */
        scope.drawCircle(
            color = item.innerColor,
            radius = radius * 0.7f,
            center = center,
            style = Stroke(width = 1f)
        )
    }

    /**
     * 绘制直角三角形切片 · 右上角
     *
     * 设计说明：使用 Path 绘制直角在右上的三角形，呼应构成主义海报
     */
    private fun drawTriangleRightTop(scope: DrawScope, item: DecorItem.TriangleRightTop) {
        val w = scope.size.width
        val size = minOf(w, scope.size.height) * 0.22f
        if (size <= 0f) return
        val right = w * 0.92f
        val top = scope.size.height * 0.10f

        val path = Path().apply {
            moveTo(right, top)                  /* 直角顶点 */
            lineTo(right, top + size)           /* 右下 */
            lineTo(right - size, top)           /* 左上 */
            close()
        }

        scope.drawPath(path = path, color = item.color)
    }

    /**
     * 绘制工程坐标十字点阵 · 散布点缀
     *
     * 设计说明：在固定比例位置绘制十字标记，呼应工程图纸的坐标参考
     */
    private fun drawCrossMarks(scope: DrawScope, item: DecorItem.CrossMarks) {
        val w = scope.size.width
        val h = scope.size.height
        if (w <= 0f || h <= 0f) return

        /* 5 个十字标记的归一化坐标 (x%, y%) */
        val positions = listOf(
            0.15f to 0.25f,
            0.80f to 0.15f,
            0.35f to 0.75f,
            0.90f to 0.65f,
            0.60f to 0.45f
        )
        val armLen = minOf(w, h) * 0.012f

        positions.forEach { (px, py) ->
            val cx = w * px
            val cy = h * py
            /* 横线 */
            scope.drawLine(
                color = item.color,
                start = Offset(cx - armLen, cy),
                end = Offset(cx + armLen, cy),
                strokeWidth = 1f
            )
            /* 竖线 */
            scope.drawLine(
                color = item.color,
                start = Offset(cx, cy - armLen),
                end = Offset(cx, cy + armLen),
                strokeWidth = 1f
            )
        }
    }

    /**
     * 绘制对角粗线 · 横贯版面
     *
     * 设计说明：略微倾斜的细线，构成主义海报的典型元素
     */
    private fun drawDiagLine(scope: DrawScope, item: DecorItem.DiagLine) {
        val w = scope.size.width
        val h = scope.size.height
        if (w <= 0f || h <= 0f) return

        scope.drawLine(
            color = item.color,
            start = Offset(-w * 0.10f, h * 0.45f),
            end = Offset(w * 1.10f, h * 0.34f),
            strokeWidth = 2f
        )
    }

    /**
     * 绘制平行斜线束 · 右侧对角线
     *
     * 设计说明：3 条平行对角线，呼应数据流
     */
    private fun drawParallelLines(scope: DrawScope, item: DecorItem.ParallelLines) {
        val w = scope.size.width
        val h = scope.size.height
        if (w <= 0f || h <= 0f) return

        /* 3 条平行线的偏移量（相对高度比例） */
        val offsets = listOf(0.30f, 0.40f, 0.50f)
        offsets.forEach { offset ->
            scope.drawLine(
                color = item.color,
                start = Offset(w * 0.50f, h * (offset + 0.25f)),
                end = Offset(w, h * offset),
                strokeWidth = 1f
            )
        }
    }

    /**
     * 绘制径向点阵 · 散布点阵装饰
     *
     * 设计说明：通过循环绘制小圆点形成点阵，呼应工程图纸
     */
    private fun drawDotsRadial(scope: DrawScope, item: DecorItem.DotsRadial) {
        val w = scope.size.width
        val h = scope.size.height
        if (w <= 0f || h <= 0f) return

        val spacing = minOf(w, h) * 0.06f
        if (spacing <= 0f) return
        val dotRadius = spacing * 0.08f
        val centerX = w * 0.5f
        val centerY = h * 0.5f
        val maxDist = sqrt(w * w + h * h) * 0.5f

        /* 以中心为圆心向外辐射的点阵，越远越淡 */
        var row = -8
        while (row <= 8) {
            var col = -8
            while (col <= 8) {
                val x = centerX + col * spacing
                val y = centerY + row * spacing
                if (x in -spacing..(w + spacing) && y in -spacing..(h + spacing)) {
                    val dist = sqrt((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY))
                    val alpha = (1f - dist / maxDist).coerceIn(0f, 1f) * 0.6f
                    if (alpha > 0.05f) {
                        scope.drawCircle(
                            color = item.color.copy(alpha = alpha),
                            radius = dotRadius,
                            center = Offset(x, y)
                        )
                    }
                }
                col++
            }
            row++
        }
    }

    /**
     * 绘制同心半圆环 · 右下角
     *
     * 设计说明：两层半圆环，外层主曲线色，内层波纹色，
     *           使用 Path + arcTo 绘制半圆避免完整圆的压迫感
     */
    private fun drawHalfRingsBottomRight(scope: DrawScope, item: DecorItem.HalfRingsBottomRight) {
        val w = scope.size.width
        val h = scope.size.height
        val radius = minOf(w, h) * 0.45f
        if (radius <= 0f) return
        val center = Offset(w + radius * 0.3f, h + radius * 0.3f)

        /* 外层半圆环 */
        scope.drawCircle(
            color = item.outerColor,
            radius = radius,
            center = center,
            style = Stroke(width = 1f)
        )
        /* 内层半圆环 */
        scope.drawCircle(
            color = item.innerColor,
            radius = radius * 0.65f,
            center = center,
            style = Stroke(width = 1f)
        )
    }
}

/**
 * 装饰元素配置项密封类
 *
 * 设计说明：使用密封类封装各装饰元素的绘制参数，
 *           便于在配置表中统一管理，且 when 分支 exhaustive
 *
 * v3.6.0：移除 GlowTopLeft / GlowBottomRight 子类（光晕效果已删除）
 */
private sealed class DecorItem {
    /** 网格底纹 */
    data class GridBackground(val color: Color, val gridSize: Dp) : DecorItem()

    /** S 形曲线 */
    data class CurveS(val color: Color) : DecorItem()

    /** 同心圆涟漪 · 右上 */
    data class RippleTopRight(val outerColor: Color, val innerColor: Color) : DecorItem()

    /** 直角三角形 · 右上 */
    data class TriangleRightTop(val color: Color) : DecorItem()

    /** 十字坐标点阵 */
    data class CrossMarks(val color: Color) : DecorItem()

    /** 对角粗线 */
    data class DiagLine(val color: Color) : DecorItem()

    /** 平行斜线束 */
    data class ParallelLines(val color: Color) : DecorItem()

    /** 径向点阵 */
    data class DotsRadial(val color: Color) : DecorItem()

    /** 同心半圆环 · 右下 */
    data class HalfRingsBottomRight(val outerColor: Color, val innerColor: Color) : DecorItem()
}
