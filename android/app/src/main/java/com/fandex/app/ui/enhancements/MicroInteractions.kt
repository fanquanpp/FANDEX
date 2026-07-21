package com.fandex.app.ui.enhancements

import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import kotlinx.coroutines.launch

/**
 * MicroInteractions 微交互修饰符集合
 *
 * 功能：提供常用的微交互效果，统一全应用的触摸反馈风格
 *
 * 实现要点：
 * - 提供 `Modifier.pressScale(scale: Float = 0.96f)` 扩展函数（按下缩放）
 * - 提供 `Modifier.bounceClick()` 扩展函数（点击弹跳反馈）
 * - 使用 `pointerInput` + `Animatable` 实现
 * - 释放时使用 spring 动画回正
 *
 * 设计原则：
 * - pressScale：通过 detectTapGestures 的 onPress 回调检测按下/释放
 * - bounceClick：通过 clickable 提供点击回调，pressScale 提供视觉反馈
 * - 弹性回正使用 SpringSpecs.bouncy 预设，呈现轻微弹跳感
 *
 * 使用示例：
 *   Box(modifier = Modifier
 *       .pressScale()
 *       .clickable { onClick() }
 *   ) { ... }
 *
 *   Box(modifier = Modifier.bounceClick() { /* 点击回调 */ }) { ... }
 */

/**
 * 按下时缩放修饰符
 *
 * 功能：检测按下/释放状态，按下时缩放至指定比例，释放时弹性回正至 1.0
 *
 * 输入：
 *   - scale 按下时的缩放比例（默认 0.96f）
 *
 * 实现说明：
 * - 使用 detectTapGestures 的 onPress 回调，onPress 接收按下位置
 * - 在 onPress 中启动缩放动画，通过 tryAwaitRelease() 等待释放
 * - 释放后启动回正动画
 */
fun Modifier.pressScale(
    scale: Float = 0.96f
): Modifier = composed {
    /* 缩放 Animatable，默认 1.0f */
    val scaleAnim = remember { Animatable(1f) }
    val scope = rememberCoroutineScope()

    this
        .graphicsLayer {
            scaleX = scaleAnim.value
            scaleY = scaleAnim.value
        }
        .pointerInput(Unit) {
            detectTapGestures(
                onPress = {
                    /* 按下时缩放至指定比例 */
                    scope.launch {
                        scaleAnim.animateTo(scale, SpringSpecs.snappy)
                    }
                    /* 等待释放：tryAwaitRelease 挂起协程直至手势抬起 */
                    tryAwaitRelease()
                    /* 释放后弹性回正 */
                    scope.launch {
                        scaleAnim.animateTo(1f, SpringSpecs.bouncy)
                    }
                }
            )
        }
}

/**
 * 弹跳点击修饰符
 *
 * 功能：组合 pressScale 视觉反馈与点击回调，提供完整的微交互体验
 *
 * 输入：
 *   - onClick 点击回调
 *
 * 实现说明：
 * - 内部使用 pressScale(scale=0.94f) 提供更明显的按下反馈
 * - 通过 clickable 包装点击回调
 * - 适用场景：列表项、卡片、图标按钮等需要点击反馈的元素
 */
fun Modifier.bounceClick(
    onClick: () -> Unit
): Modifier = composed {
    this
        .pressScale(scale = 0.94f)
        .clickable(onClick = onClick)
}
