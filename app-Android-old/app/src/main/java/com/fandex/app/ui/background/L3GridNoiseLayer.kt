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

@Composable
fun L3GridNoiseLayer(
    modifier: Modifier = Modifier,
    gridSize: Dp = 32.dp
) {
    val darkTheme = LocalIsDarkTheme.current

    val colors = LocalGeoDecorColors.current

    val density = LocalDensity.current
    val gridSizePx = with(density) { gridSize.toPx() }.coerceAtLeast(1f)
    val minorGridSizePx = gridSizePx / 2f
    val accentGridSizePx = gridSizePx * 2f

    val majorDotColor = if (darkTheme) {
        Color.White.copy(alpha = 0.10f)
    } else {
        Color(0xFF4F5BD5).copy(alpha = 0.18f)
    }

    val minorDotColor = if (darkTheme) {
        Color.White.copy(alpha = 0.05f)
    } else {
        Color(0xFF4F5BD5).copy(alpha = 0.08f)
    }

    val accentDotColor1 = Color(0xFFD63031)
    val accentDotColor2 = Color(0xFFF9A825)

    val gridLineColor = colors.gridLine

    val random = remember { Random(seed = 42L) }

    Canvas(modifier = modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        if (w <= 0f || h <= 0f || gridSizePx <= 0f) return@Canvas

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

        var accentX = accentGridSizePx / 2f
        var accentIndex = 0
        while (accentX <= w) {
            var accentY = accentGridSizePx / 2f
            while (accentY <= h) {
                val jitterX = (random.nextFloat() - 0.5f) * 8f
                val jitterY = (random.nextFloat() - 0.5f) * 8f
                val center = Offset(accentX + jitterX, accentY + jitterY)
                val accentColor = if (accentIndex % 2 == 0) accentDotColor1 else accentDotColor2
                val alpha = if (darkTheme) 0.22f else 0.30f
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
