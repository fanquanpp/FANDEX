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

@Composable
fun FANDEXSpinner(
    size: Dp = 32.dp,
    color: Color = MaterialTheme.colorScheme.primary
) {
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

    val dotAlphas = floatArrayOf(0.3f, 0.6f, 1.0f)

    Box(
        modifier = Modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(size)) {
            val dotRadius = size.toPx() / 6f
            val orbitRadius = size.toPx() / 3f
            val center = Offset(this.size.width / 2f, this.size.height / 2f)

            val angleStep = (2f * Math.PI / 3f).toFloat()

            dotAlphas.forEachIndexed { index, alpha ->
                val angleRad = Math.toRadians(rotation.toDouble()).toFloat() + index * angleStep
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
