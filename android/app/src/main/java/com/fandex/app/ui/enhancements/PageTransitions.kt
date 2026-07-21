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

/**
 * PageTransitions 页面转场动画
 *
 * 功能：为 Navigation Compose 的 NavHost 与 composable 提供统一的页面转场动画
 *
 * v3.1.0 增强：在原有 slide+fade 基础上新增多种动画变体：
 *   - 横向滑动（默认，前进/返回）
 *   - 纵向滑动（深入阅读场景）
 *   - 缩放过渡（强调层次感）
 *   - Material Fade Through（页面切换）
 *
 * 实现要点：
 * - 提供 `enterTransition()` / `exitTransition()` / `popEnterTransition()` / `popExitTransition()` 函数
 * - 使用 `slideInHorizontally` + `fadeIn` 组合，呈现左侧滑入 + 淡入的现代化转场效果
 * - 持续时间通过 spring 物理动画控制（medium stiffness / no bouncy，近似 300ms）
 * - 提供 `AnimatedContentTransitionScope<NavBackStackEntry>.defaultPageTransitions` 扩展属性返回四元组封装
 *
 * 设计原则：
 * - 进入：从右侧滑入 + 淡入
 * - 退出：向左侧滑出 + 淡出
 * - 返回（popEnter）：从左侧滑入 + 淡入
 * - 返回退出（popExit）：向右侧滑出 + 淡出
 * - 滑动距离通过 `initialOffsetX` / `targetOffsetX` lambda 的入参（即 fullWidth）获取容器全宽
 *
 * 使用示例：
 *   NavHost(
 *       navController = navController,
 *       startDestination = "home",
 *       enterTransition = { enterTransition() },
 *       exitTransition = { exitTransition() },
 *       popEnterTransition = { popEnterTransition() },
 *       popExitTransition = { popExitTransition() }
 *   ) { ... }
 *
 * 或使用四元组封装：
 *   NavHost(
 *       navController = navController,
 *       startDestination = "home",
 *       enterTransition = { defaultPageTransitions.enter },
 *       exitTransition = { defaultPageTransitions.exit },
 *       popEnterTransition = { defaultPageTransitions.popEnter },
 *       popExitTransition = { defaultPageTransitions.popExit }
 *   ) { ... }
 */

/**
 * 页面转场动画规格封装
 *
 * 功能：将四种转场动画打包为单一对象，便于一次性传递给 NavHost
 *
 * 字段说明：
 *   - enter     进入目标页面时的动画
 *   - exit      离开当前页面时的动画
 *   - popEnter  返回栈弹出时的进入动画
 *   - popExit   返回栈弹出时的退出动画
 */
data class PageTransitions(
    val enter: EnterTransition,
    val exit: ExitTransition,
    val popEnter: EnterTransition,
    val popExit: ExitTransition
)

/**
 * 滑动动画的物理 spring 规格（IntOffset 类型）
 *
 * 设计说明：
 * - slideInHorizontally / slideOutHorizontally 期望 FiniteAnimationSpec<IntOffset>
 * - 使用 NoBouncy damping ratio 与 Medium stiffness，呈现自然流畅的滑动反馈
 * - Medium stiffness 在中等距离下近似 300ms 持续时间
 */
private val slideSpring = spring<IntOffset>(
    dampingRatio = Spring.DampingRatioNoBouncy,
    stiffness = Spring.StiffnessMedium
)

/**
 * 淡入淡出的物理 spring 规格（Float 类型，用于 fadeIn / fadeOut）
 */
private val fadeSpring = spring<Float>(
    dampingRatio = Spring.DampingRatioNoBouncy,
    stiffness = Spring.StiffnessMedium
)

/**
 * 缩放动画的 tween 规格（Float 类型，用于 scaleIn / scaleOut）
 *
 * 设计说明：使用 300ms tween + FastOutSlowInEasing，呈现柔和的缩放过渡
 */
private val scaleTween = tween<Float>(durationMillis = 300)

/* ==================== 默认横向滑动过渡（基础） ==================== */

/**
 * 进入目标页面时的转场动画
 *
 * 实现：从右侧（+fullWidth）滑入 + 淡入
 * - initialOffsetX 入参即为容器 fullWidth
 * - 使用 `it` 引用 lambda 入参（避免与外层作用域变量歧义）
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.enterTransition(): EnterTransition {
    return slideInHorizontally(animationSpec = slideSpring) { it } +
        fadeIn(animationSpec = fadeSpring)
}

/**
 * 离开当前页面时的转场动画
 *
 * 实现：向左侧（-fullWidth）滑出 + 淡出
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.exitTransition(): ExitTransition {
    return slideOutHorizontally(animationSpec = slideSpring) { -it } +
        fadeOut(animationSpec = fadeSpring)
}

/**
 * 返回栈弹出时的进入动画
 *
 * 实现：从左侧（-fullWidth）滑入 + 淡入（与 enterTransition 方向相反）
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.popEnterTransition(): EnterTransition {
    return slideInHorizontally(animationSpec = slideSpring) { -it } +
        fadeIn(animationSpec = fadeSpring)
}

/**
 * 返回栈弹出时的退出动画
 *
 * 实现：向右侧（+fullWidth）滑出 + 淡出（与 exitTransition 方向相反）
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.popExitTransition(): ExitTransition {
    return slideOutHorizontally(animationSpec = slideSpring) { it } +
        fadeOut(animationSpec = fadeSpring)
}

/**
 * 一次性获取四种转场动画的封装对象
 *
 * 功能：在 NavHost 配置中通过单个对象访问所有转场动画，避免重复调用四个函数
 *
 * 使用示例：
 *   NavHost(
 *       ...,
 *       enterTransition = { defaultPageTransitions.enter },
 *       exitTransition = { defaultPageTransitions.exit }
 *   )
 */
val AnimatedContentTransitionScope<NavBackStackEntry>.defaultPageTransitions: PageTransitions
    get() = PageTransitions(
        enter = enterTransition(),
        exit = exitTransition(),
        popEnter = popEnterTransition(),
        popExit = popExitTransition()
    )

/* ==================== v3.1.0 新增动画变体 ==================== */

/**
 * 纵向滑动过渡：从底部滑入 + 淡入
 *
 * 适用场景：从模块页进入文章阅读页，呈现"深入阅读"的视觉语义
 *
 * 实现：slideInVertically（从底部 +fullHeight 滑入） + fadeIn
 * - initialOffsetY 入参为容器 fullHeight
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.slideUpEnterTransition(): EnterTransition {
    return slideInVertically(animationSpec = slideSpring) { it } +
        fadeIn(animationSpec = fadeSpring)
}

/**
 * 纵向滑动过渡：向底部滑出 + 淡出
 *
 * 实现：slideOutVertically（向 +fullHeight 方向滑出） + fadeOut
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.slideDownExitTransition(): ExitTransition {
    return slideOutVertically(animationSpec = slideSpring) { it } +
        fadeOut(animationSpec = fadeSpring)
}

/**
 * 纵向滑动过渡（返回）：从顶部滑入 + 淡入
 *
 * 实现：slideInVertically（从 -fullHeight 滑入） + fadeIn
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.slideDownPopEnterTransition(): EnterTransition {
    return slideInVertically(animationSpec = slideSpring) { -it } +
        fadeIn(animationSpec = fadeSpring)
}

/**
 * 纵向滑动过渡（返回）：向顶部滑出 + 淡出
 *
 * 实现：slideOutVertically（向 -fullHeight 方向滑出） + fadeOut
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.slideUpPopExitTransition(): ExitTransition {
    return slideOutVertically(animationSpec = slideSpring) { -it } +
        fadeOut(animationSpec = fadeSpring)
}

/**
 * 纵向滑动过渡四元组封装
 */
val AnimatedContentTransitionScope<NavBackStackEntry>.verticalSlideTransitions: PageTransitions
    get() = PageTransitions(
        enter = slideUpEnterTransition(),
        exit = slideDownExitTransition(),
        popEnter = slideDownPopEnterTransition(),
        popExit = slideUpPopExitTransition()
    )

/**
 * 缩放过渡：放大进入 + 淡入
 *
 * 适用场景：弹窗式页面或需要强调层次感的场景
 *
 * 实现：scaleIn（从 0.92 放大至 1.0） + fadeIn
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.scaleEnterTransition(): EnterTransition {
    return scaleIn(animationSpec = scaleTween, initialScale = 0.92f) +
        fadeIn(animationSpec = fadeSpring)
}

/**
 * 缩放过渡：缩小退出 + 淡出
 *
 * 实现：scaleOut（从 1.0 缩小至 0.92） + fadeOut
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.scaleExitTransition(): ExitTransition {
    return scaleOut(animationSpec = scaleTween, targetScale = 0.92f) +
        fadeOut(animationSpec = fadeSpring)
}

/**
 * 缩放过渡四元组封装
 */
val AnimatedContentTransitionScope<NavBackStackEntry>.scaleTransitions: PageTransitions
    get() = PageTransitions(
        enter = scaleEnterTransition(),
        exit = scaleExitTransition(),
        popEnter = scaleEnterTransition(),
        popExit = scaleExitTransition()
    )

/**
 * Material Fade Through 过渡：纯淡入淡出 + 轻微缩放
 *
 * 适用场景：顶层 Tab 切换或主题切换，呈现"内容替换"的语义
 *
 * 设计来源：Material Motion 系统的 Fade Through 模式
 *
 * 实现：fadeIn + scaleIn(0.96) / fadeOut + scaleOut(0.96)
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.fadeThroughEnterTransition(): EnterTransition {
    return fadeIn(animationSpec = tween(220)) +
        scaleIn(animationSpec = tween(220), initialScale = 0.96f)
}

/**
 * Material Fade Through 退出过渡
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.fadeThroughExitTransition(): ExitTransition {
    return fadeOut(animationSpec = tween(180)) +
        scaleOut(animationSpec = tween(180), targetScale = 0.96f)
}

/**
 * Fade Through 过渡四元组封装
 */
val AnimatedContentTransitionScope<NavBackStackEntry>.fadeThroughTransitions: PageTransitions
    get() = PageTransitions(
        enter = fadeThroughEnterTransition(),
        exit = fadeThroughExitTransition(),
        popEnter = fadeThroughEnterTransition(),
        popExit = fadeThroughExitTransition()
    )

/**
 * 混合过渡：横向滑动 + 轻微缩放 + 淡入
 *
 * 适用场景：从首页进入模块详情页，呈现"展开卡片"的层次感
 *
 * 实现：slideInHorizontally（半宽） + scaleIn(0.95) + fadeIn
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.combinedEnterTransition(): EnterTransition {
    return slideInHorizontally(animationSpec = slideSpring) { it / 2 } +
        scaleIn(animationSpec = scaleTween, initialScale = 0.95f) +
        fadeIn(animationSpec = fadeSpring)
}

/**
 * 混合过渡退出：横向滑出 + 轻微缩放 + 淡出
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.combinedExitTransition(): ExitTransition {
    return slideOutHorizontally(animationSpec = slideSpring) { -it / 2 } +
        scaleOut(animationSpec = scaleTween, targetScale = 0.95f) +
        fadeOut(animationSpec = fadeSpring)
}

/**
 * 混合过渡四元组封装
 */
val AnimatedContentTransitionScope<NavBackStackEntry>.combinedTransitions: PageTransitions
    get() = PageTransitions(
        enter = combinedEnterTransition(),
        exit = combinedExitTransition(),
        popEnter = popEnterTransition() + scaleIn(animationSpec = scaleTween, initialScale = 0.95f),
        popExit = popExitTransition() + scaleOut(animationSpec = scaleTween, targetScale = 0.95f)
    )
