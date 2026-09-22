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

@Composable
fun GeoBgDecor(
    variant: GeoBgVariant,
    modifier: Modifier = Modifier
) {
    val colors = LocalGeoDecorColors.current
    val density = LocalDensity.current

    val config = remember(variant, colors, density) {
        GeoDecorRenderer.buildConfig(variant, colors, density)
    }

    Box(modifier = modifier.fillMaxSize()) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            GeoDecorRenderer.render(this, config)
        }
    }
}

sealed class GeoBgVariant {
    object Home : GeoBgVariant()

    object Module : GeoBgVariant()

    object Splash : GeoBgVariant()

    object Loading : GeoBgVariant()
}

private object GeoDecorRenderer {

    fun buildConfig(
        variant: GeoBgVariant,
        colors: GeoDecorColors,
        density: androidx.compose.ui.unit.Density
    ): List<DecorItem> {
        return when (variant) {
            GeoBgVariant.Home -> listOf(
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

    private fun drawGridBackground(scope: DrawScope, item: DecorItem.GridBackground) {
        val gridSizePx = with(scope) { item.gridSize.toPx() }
        if (gridSizePx <= 0f) return
        val w = scope.size.width
        val h = scope.size.height
        val gridColor = item.color

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

    private fun drawRippleTopRight(scope: DrawScope, item: DecorItem.RippleTopRight) {
        val w = scope.size.width
        val radius = minOf(w, scope.size.height) * 0.42f
        if (radius <= 0f) return
        val center = Offset(w + radius * 0.25f, -radius * 0.25f)

        scope.drawCircle(
            color = item.outerColor,
            radius = radius,
            center = center,
            style = Stroke(width = 1f)
        )
        scope.drawCircle(
            color = item.innerColor,
            radius = radius * 0.7f,
            center = center,
            style = Stroke(width = 1f)
        )
    }

    private fun drawTriangleRightTop(scope: DrawScope, item: DecorItem.TriangleRightTop) {
        val w = scope.size.width
        val size = minOf(w, scope.size.height) * 0.22f
        if (size <= 0f) return
        val right = w * 0.92f
        val top = scope.size.height * 0.10f

        val path = Path().apply {
            moveTo(right, top)
            lineTo(right, top + size)
            lineTo(right - size, top)
            close()
        }

        scope.drawPath(path = path, color = item.color)
    }

    private fun drawCrossMarks(scope: DrawScope, item: DecorItem.CrossMarks) {
        val w = scope.size.width
        val h = scope.size.height
        if (w <= 0f || h <= 0f) return

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
            scope.drawLine(
                color = item.color,
                start = Offset(cx - armLen, cy),
                end = Offset(cx + armLen, cy),
                strokeWidth = 1f
            )
            scope.drawLine(
                color = item.color,
                start = Offset(cx, cy - armLen),
                end = Offset(cx, cy + armLen),
                strokeWidth = 1f
            )
        }
    }

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

    private fun drawParallelLines(scope: DrawScope, item: DecorItem.ParallelLines) {
        val w = scope.size.width
        val h = scope.size.height
        if (w <= 0f || h <= 0f) return

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

    private fun drawHalfRingsBottomRight(scope: DrawScope, item: DecorItem.HalfRingsBottomRight) {
        val w = scope.size.width
        val h = scope.size.height
        val radius = minOf(w, h) * 0.45f
        if (radius <= 0f) return
        val center = Offset(w + radius * 0.3f, h + radius * 0.3f)

        scope.drawCircle(
            color = item.outerColor,
            radius = radius,
            center = center,
            style = Stroke(width = 1f)
        )
        scope.drawCircle(
            color = item.innerColor,
            radius = radius * 0.65f,
            center = center,
            style = Stroke(width = 1f)
        )
    }
}

private sealed class DecorItem {
    data class GridBackground(val color: Color, val gridSize: Dp) : DecorItem()

    data class CurveS(val color: Color) : DecorItem()

    data class RippleTopRight(val outerColor: Color, val innerColor: Color) : DecorItem()

    data class TriangleRightTop(val color: Color) : DecorItem()

    data class CrossMarks(val color: Color) : DecorItem()

    data class DiagLine(val color: Color) : DecorItem()

    data class ParallelLines(val color: Color) : DecorItem()

    data class DotsRadial(val color: Color) : DecorItem()

    data class HalfRingsBottomRight(val outerColor: Color, val innerColor: Color) : DecorItem()
}
