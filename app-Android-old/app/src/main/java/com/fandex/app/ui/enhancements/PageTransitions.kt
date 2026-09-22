package com.fandex.app.ui.enhancements

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.ui.unit.IntOffset
import androidx.navigation.NavBackStackEntry

data class PageTransitions(
    val enter: EnterTransition,
    val exit: ExitTransition,
    val popEnter: EnterTransition,
    val popExit: ExitTransition
)

private val slideSpring = spring<IntOffset>(
    dampingRatio = Spring.DampingRatioNoBouncy,
    stiffness = Spring.StiffnessMedium
)

private val fadeSpring = spring<Float>(
    dampingRatio = Spring.DampingRatioNoBouncy,
    stiffness = Spring.StiffnessMedium
)

private val scaleTween = tween<Float>(durationMillis = 300)

fun AnimatedContentTransitionScope<NavBackStackEntry>.enterTransition(): EnterTransition {
    return slideInHorizontally(animationSpec = slideSpring) { it } +
        fadeIn(animationSpec = fadeSpring)
}

fun AnimatedContentTransitionScope<NavBackStackEntry>.exitTransition(): ExitTransition {
    return slideOutHorizontally(animationSpec = slideSpring) { -it } +
        fadeOut(animationSpec = fadeSpring)
}

fun AnimatedContentTransitionScope<NavBackStackEntry>.popEnterTransition(): EnterTransition {
    return slideInHorizontally(animationSpec = slideSpring) { -it } +
        fadeIn(animationSpec = fadeSpring)
}

fun AnimatedContentTransitionScope<NavBackStackEntry>.popExitTransition(): ExitTransition {
    return slideOutHorizontally(animationSpec = slideSpring) { it } +
        fadeOut(animationSpec = fadeSpring)
}

val AnimatedContentTransitionScope<NavBackStackEntry>.defaultPageTransitions: PageTransitions
    get() = PageTransitions(
        enter = enterTransition(),
        exit = exitTransition(),
        popEnter = popEnterTransition(),
        popExit = popExitTransition()
    )

fun AnimatedContentTransitionScope<NavBackStackEntry>.slideUpEnterTransition(): EnterTransition {
    return slideInVertically(animationSpec = slideSpring) { it } +
        fadeIn(animationSpec = fadeSpring)
}

fun AnimatedContentTransitionScope<NavBackStackEntry>.slideDownExitTransition(): ExitTransition {
    return slideOutVertically(animationSpec = slideSpring) { it } +
        fadeOut(animationSpec = fadeSpring)
}

fun AnimatedContentTransitionScope<NavBackStackEntry>.slideDownPopEnterTransition(): EnterTransition {
    return slideInVertically(animationSpec = slideSpring) { -it } +
        fadeIn(animationSpec = fadeSpring)
}

fun AnimatedContentTransitionScope<NavBackStackEntry>.slideUpPopExitTransition(): ExitTransition {
    return slideOutVertically(animationSpec = slideSpring) { -it } +
        fadeOut(animationSpec = fadeSpring)
}

val AnimatedContentTransitionScope<NavBackStackEntry>.verticalSlideTransitions: PageTransitions
    get() = PageTransitions(
        enter = slideUpEnterTransition(),
        exit = slideDownExitTransition(),
        popEnter = slideDownPopEnterTransition(),
        popExit = slideUpPopExitTransition()
    )

fun AnimatedContentTransitionScope<NavBackStackEntry>.scaleEnterTransition(): EnterTransition {
    return scaleIn(animationSpec = scaleTween, initialScale = 0.92f) +
        fadeIn(animationSpec = fadeSpring)
}

fun AnimatedContentTransitionScope<NavBackStackEntry>.scaleExitTransition(): ExitTransition {
    return scaleOut(animationSpec = scaleTween, targetScale = 0.92f) +
        fadeOut(animationSpec = fadeSpring)
}

val AnimatedContentTransitionScope<NavBackStackEntry>.scaleTransitions: PageTransitions
    get() = PageTransitions(
        enter = scaleEnterTransition(),
        exit = scaleExitTransition(),
        popEnter = scaleEnterTransition(),
        popExit = scaleExitTransition()
    )

fun AnimatedContentTransitionScope<NavBackStackEntry>.fadeThroughEnterTransition(): EnterTransition {
    return fadeIn(animationSpec = tween(220)) +
        scaleIn(animationSpec = tween(220), initialScale = 0.96f)
}

fun AnimatedContentTransitionScope<NavBackStackEntry>.fadeThroughExitTransition(): ExitTransition {
    return fadeOut(animationSpec = tween(180)) +
        scaleOut(animationSpec = tween(180), targetScale = 0.96f)
}

val AnimatedContentTransitionScope<NavBackStackEntry>.fadeThroughTransitions: PageTransitions
    get() = PageTransitions(
        enter = fadeThroughEnterTransition(),
        exit = fadeThroughExitTransition(),
        popEnter = fadeThroughEnterTransition(),
        popExit = fadeThroughExitTransition()
    )

fun AnimatedContentTransitionScope<NavBackStackEntry>.combinedEnterTransition(): EnterTransition {
    return slideInHorizontally(animationSpec = slideSpring) { it / 2 } +
        scaleIn(animationSpec = scaleTween, initialScale = 0.95f) +
        fadeIn(animationSpec = fadeSpring)
}

fun AnimatedContentTransitionScope<NavBackStackEntry>.combinedExitTransition(): ExitTransition {
    return slideOutHorizontally(animationSpec = slideSpring) { -it / 2 } +
        scaleOut(animationSpec = scaleTween, targetScale = 0.95f) +
        fadeOut(animationSpec = fadeSpring)
}

val AnimatedContentTransitionScope<NavBackStackEntry>.combinedTransitions: PageTransitions
    get() = PageTransitions(
        enter = combinedEnterTransition(),
        exit = combinedExitTransition(),
        popEnter = popEnterTransition() + scaleIn(animationSpec = scaleTween, initialScale = 0.95f),
        popExit = popExitTransition() + scaleOut(animationSpec = scaleTween, targetScale = 0.95f)
    )
