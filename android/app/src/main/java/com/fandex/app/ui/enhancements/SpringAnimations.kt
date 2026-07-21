package com.fandex.app.ui.enhancements

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import kotlinx.coroutines.launch

/**
 * SpringAnimations 弹性动画工具
 *
 * 功能：提供常用的弹性动画预设与按下动画状态封装，统一全应用的弹性反馈风格
 *
 * 实现要点：
 * - 定义 `SpringSpecs` object 集中管理预设 spring 动画规格
 * - 提供 `rememberPressAnimation()` Composable 返回按下时的缩放 Animatable
 *
 * 预设说明：
 * - gentle   温和：dampingRatio=0.6f, stiffness=Spring.StiffnessLow
 * - normal   普通：dampingRatio=0.8f, stiffness=Spring.StiffnessMedium
 * - bouncy   弹跳：dampingRatio=0.4f, stiffness=Spring.StiffnessMediumLow
 * - snappy   利落：dampingRatio=0.9f, stiffness=Spring.StiffnessHigh
 *
 * 设计原则：
 * - 集中管理 spring 规格避免散落各处造成动画风格不一致
 * - dampingRatio 越小越弹，stiffness 越大越快
 * - 所有预设使用 androidx.compose.animation.core.Spring 中的常量，便于跨版本兼容
 *
 * 使用示例：
 *   val scale = rememberPressAnimation()
 *   Box(modifier = Modifier.graphicsLayer { scaleX = scale.value; scaleY = scale.value }) { ... }
 */
object SpringSpecs {

    /** 温和：低刚度 + 中等阻尼，适合大尺寸元素的过渡 */
    val gentle = spring<Float>(
        dampingRatio = 0.6f,
        stiffness = Spring.StiffnessLow
    )

    /** 普通：中等刚度 + 较高阻尼，适合大多数 UI 反馈 */
    val normal = spring<Float>(
        dampingRatio = 0.8f,
        stiffness = Spring.StiffnessMedium
    )

    /** 弹跳：低阻尼 + 中低刚度，适合强调互动感的元素（如按钮点击） */
    val bouncy = spring<Float>(
        dampingRatio = 0.4f,
        stiffness = Spring.StiffnessMediumLow
    )

    /** 利落：高刚度 + 高阻尼，适合需要快速响应的元素（如开关切换） */
    val snappy = spring<Float>(
        dampingRatio = 0.9f,
        stiffness = Spring.StiffnessHigh
    )
}

/**
 * 按下缩放动画状态
 *
 * 功能：返回一个 Animatable，按下时缩放至 0.96f，释放时弹性回正至 1.0f
 *
 * 实现要点：
 * - 默认值 1.0f（正常状态）
 * - 提供 press() / release() 挂起函数供调用方在 pointerInput 中触发
 * - 释放使用 SpringSpecs.bouncy 预设，呈现轻微弹跳感
 *
 * 使用示例：
 *   val press = rememberPressAnimation()
 *   Box(modifier = Modifier
 *       .graphicsLayer { scaleX = press.scale.value; scaleY = press.scale.value }
 *       .pointerInput(Unit) {
 *           detectTapGestures(onPress = {
 *               coroutineScope.launch { press.press() }
 *               tryAwaitRelease()
 *               coroutineScope.launch { press.release() }
 *           })
 *       }
 *   )
 *
 * 输出：PressAnimationState 实例（持有 Animatable<Float> 与触发函数）
 */
@Composable
fun rememberPressAnimation(): PressAnimationState {
    val scale = remember { Animatable(1f) }
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    return remember(scale) {
        PressAnimationState(
            scale = scale,
            onPress = {
                scope.launch {
                    scale.animateTo(0.96f, SpringSpecs.snappy)
                }
            },
            onRelease = {
                scope.launch {
                    scale.animateTo(1f, SpringSpecs.bouncy)
                }
            }
        )
    }
}

/**
 * 按下动画状态封装
 *
 * 功能：持有缩放 Animatable 与按下/释放触发函数，对外暴露可观察的 scale.value
 *
 * 使用方式：
 *   - 通过 `state.scale.value` 在 graphicsLayer 中读取当前缩放
 *   - 在 pointerInput 中调用 `state.press()` / `state.release()`
 *
 * 设计说明：
 * - 不直接暴露 Animatable，避免外部错误调用 snapTo/animateTo
 * - 通过 lambda 持有协程作用域引用，调用方无需手动管理协程
 */
class PressAnimationState internal constructor(
    val scale: Animatable<Float, *>,
    private val onPress: () -> Unit,
    private val onRelease: () -> Unit
) {
    /** 触发按下动画（缩放至 0.96f） */
    fun press() = onPress()

    /** 触发释放动画（弹性回正至 1.0f） */
    fun release() = onRelease()
}
