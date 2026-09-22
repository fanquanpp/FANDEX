package com.fandex.app.ui.background

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import com.fandex.app.ui.theme.LocalIsDarkTheme
import com.fandex.app.ui.theme.PrimaryBlue
import kotlin.coroutines.coroutineContext
import kotlin.random.Random
import kotlinx.coroutines.isActive

@Composable
fun L1ParticleLayer(modifier: Modifier = Modifier) {
    val darkTheme = LocalIsDarkTheme.current
    val particleColor = if (darkTheme) Color(0xFF6EA8FE) else PrimaryBlue

    val density = LocalDensity.current

    val particleCount = 40

    val particles = remember {
        mutableListOf<ParticleState>().apply {
            repeat(particleCount) { index ->
                add(
                    ParticleState(
                        id = index,
                        x = Random.nextFloat() * 1000f,
                        y = Random.nextFloat() * 2000f,
                        vx = Random.nextFloat() * 20f - 10f,
                        vy = Random.nextFloat() * 20f - 10f,
                        radiusPx = Random.nextFloat() * 1.5f + 0.5f,
                        alpha = Random.nextFloat() * 0.2f + 0.1f
                    )
                )
            }
        }
    }

    var particlePositions by remember {
        mutableStateOf(particles.map { Offset(it.x, it.y) })
    }

    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val widthPx = with(density) { maxWidth.toPx() }.coerceAtLeast(1f)
        val heightPx = with(density) { maxHeight.toPx() }.coerceAtLeast(1f)

        LaunchedEffect(widthPx, heightPx) {
            var lastNanos = 0L
            while (coroutineContext.isActive) {
                withFrameNanos { now ->
                    if (lastNanos == 0L) {
                        lastNanos = now
                        return@withFrameNanos
                    }
                    val delta = ((now - lastNanos) / 1_000_000_000f).coerceAtMost(0.05f)
                    lastNanos = now

                    val newPositions = particlePositions.mapIndexed { index, pos ->
                        val p = particles[index]
                        var nx = pos.x + p.vx * delta
                        var ny = pos.y + p.vy * delta
                        var vx = p.vx
                        var vy = p.vy

                        if (nx < 0f) {
                            nx = -nx
                            vx = -vx
                        } else if (nx > widthPx) {
                            nx = 2 * widthPx - nx
                            vx = -vx
                        }
                        if (ny < 0f) {
                            ny = -ny
                            vy = -vy
                        } else if (ny > heightPx) {
                            ny = 2 * heightPx - ny
                            vy = -vy
                        }

                        particles[index] = p.copy(vx = vx, vy = vy)
                        Offset(nx, ny)
                    }
                    particlePositions = newPositions
                }
            }
        }

        Canvas(modifier = Modifier.fillMaxSize()) {
            val positions = particlePositions
            particles.forEachIndexed { index, p ->
                val pos = positions[index]
                drawCircle(
                    color = particleColor.copy(alpha = p.alpha),
                    radius = p.radiusPx,
                    center = pos
                )
            }
        }
    }
}

private data class ParticleState(
    val id: Int,
    val x: Float,
    val y: Float,
    val vx: Float,
    val vy: Float,
    val radiusPx: Float,
    val alpha: Float
)
