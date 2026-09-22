package com.fandex.app.ui.common

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp

object FandexMotion {

    const val DurationFast = 120

    const val DurationNormal = 220

    const val DurationSlow = 320

    const val StaggerStep = 40

    const val StaggerMax = 240
}

fun <T> tweenFast() = tween<T>(
    durationMillis = FandexMotion.DurationFast,
    easing = FastOutSlowInEasing
)

fun <T> tweenNormal() = tween<T>(
    durationMillis = FandexMotion.DurationNormal,
    easing = FastOutSlowInEasing
)

fun springGentle() = spring<Float>(
    dampingRatio = Spring.DampingRatioNoBouncy,
    stiffness = Spring.StiffnessLow
)

fun springBouncy() = spring<Float>(
    dampingRatio = Spring.DampingRatioMediumBouncy,
    stiffness = Spring.StiffnessMediumLow
)

@Composable
fun Modifier.fandexEntrance(
    index: Int,
    visible: Boolean
): Modifier {
    val density = LocalDensity.current
    val startOffsetY = with(density) { 12.dp.toPx() }
    val delayMillis = (index * FandexMotion.StaggerStep).coerceAtMost(FandexMotion.StaggerMax)

    val progress by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(
            durationMillis = FandexMotion.DurationNormal,
            delayMillis = delayMillis,
            easing = LinearOutSlowInEasing
        ),
        label = "fandexEntranceProgress"
    )

    return graphicsLayer {
        alpha = progress
        translationY = startOffsetY * (1f - progress)
    }
}

@Composable
fun Modifier.selectionPulse(selected: Boolean): Modifier {
    val scale = remember { Animatable(1f) }

    LaunchedEffect(selected) {
        if (selected) {
            scale.animateTo(0.96f, tweenFast())
            scale.animateTo(1f, springBouncy())
        }
    }

    return graphicsLayer {
        scaleX = scale.value
        scaleY = scale.value
    }
}
