package com.fandex.app.ui.markdown

import android.graphics.Bitmap
import android.graphics.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ru.noties.jlatexmath.JLatexMathDrawable
import kotlin.math.roundToInt

fun renderMathBitmap(latex: String, colorArgb: Int, textSizePx: Float): ImageBitmap? {
    if (latex.isBlank()) return null
    return runCatching {
        val drawable = JLatexMathDrawable.builder(latex)
            .textSize(textSizePx)
            .color(colorArgb)
            .build()
        val w = drawable.intrinsicWidth.coerceAtLeast(1)
        val h = drawable.intrinsicHeight.coerceAtLeast(1)
        if (w.toLong() * h.toLong() > 64_000_000L) return null
        val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, w, h)
        drawable.draw(canvas)
        bitmap.asImageBitmap()
    }.getOrNull()
}

@Composable
fun rememberMathBitmapAsync(latex: String, colorArgb: Int, textSizePx: Float): ImageBitmap? {
    return produceState<ImageBitmap?>(initialValue = null, latex, colorArgb, textSizePx) {
        value = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Default) {
            renderMathBitmap(latex, colorArgb, textSizePx)
        }
    }.value
}

@Composable
fun MathBlockView(
    latex: String,
    modifier: Modifier = Modifier,
    fallbackTextColor: Color = Color.Unspecified
) {
    val density = LocalDensity.current
    val textColor = mathTextColor(fallbackTextColor)
    val textSizePx = with(density) { 19.sp.toPx() }
    val bitmap = rememberMathBitmapAsync(latex.trim(), textColor.toArgb(), textSizePx)

    if (bitmap == null) {
        Box(modifier.fillMaxWidth(), contentAlignment = Alignment.CenterStart) {
            androidx.compose.material3.Text(
                text = latex,
                style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                color = textColor,
                modifier = Modifier
                    .horizontalScroll(rememberScrollState())
                    .padding(vertical = 4.dp)
            )
        }
        return
    }
    Box(
        modifier = modifier.fillMaxWidth(),
        contentAlignment = Alignment.Center
    ) {
        Image(
            bitmap = bitmap,
            contentDescription = "数学公式",
            contentScale = ContentScale.FillWidth,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp)
        )
    }
}

@Composable
private fun mathTextColor(fallback: Color): Color {
    if (fallback != Color.Unspecified) return fallback
    return androidx.compose.material3.MaterialTheme.colorScheme.onSurface
}

fun inlineMathPlaceholder(w: Int, h: Int): Pair<Float, Float> {
    if (w <= 0 || h <= 0) return 24f to 24f
    val heightSp = 24f
    val widthSp = (heightSp * w / h).coerceIn(10f, 260f)
    return widthSp to heightSp
}

fun inlineMathTextSizePx(density: androidx.compose.ui.unit.Density): Float =
    with(density) { 15.sp.toPx() }
