package com.fandex.app.ui.enhancements

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.runtime.remember
import kotlinx.coroutines.launch

/**
 * Tilt3DModifier 3D 倾斜修饰符
 *
 * 功能：让卡片/组件根据触摸位置产生 3D 倾斜效果，释放后弹性回正
 *
 * 实现要点：
 * - 提供 `Modifier.tilt3D(maxTilt: Float = 8f)` 扩展函数
 * - 使用 `pointerInput` + `detectDragGestures` 检测拖动位置
 * - 将拖动增量归一化后乘以最大倾角，得到目标 rotationX / rotationY
 * - 使用 `graphicsLayer` 应用 rotationX / rotationY 实现硬件加速的 3D 旋转
 * - 触摸释放时通过 `Animatable` + `spring` 弹性回正至 (0, 0)
 * - 设置 `cameraDistance` 防止过度透视导致形变失真（12 倍密度距离）
 *
 * 设计原则：
 * - 使用 `composed` 让 Modifier 访问 Composable 上下文（密度 / 协程作用域）
 * - rotationX / rotationY 控制在 ±maxTilt 度，避免过度倾斜造成不可读
 * - detectDragGestures 会消费事件，若需与点击共存可在同一组件上叠加 clickable
 *
 * 使用示例：
 *   Box(modifier = Modifier.tilt3D()) { ... }
 *
 * 输入：
 *   - maxTilt 最大倾角（度，默认 8f）
 * 输出：附带 3D 倾斜效果的 Modifier
 */
fun Modifier.tilt3D(
    maxTilt: Float = 8f
): Modifier = composed {
    /* 当前 X 轴旋转角度（上下倾斜），由 Animatable 驱动 */
    val rotationX = remember { Animatable(0f) }
    /* 当前 Y 轴旋转角度（左右倾斜），由 Animatable 驱动 */
    val rotationY = remember { Animatable(0f) }
    /* 协程作用域用于在手势回调中启动动画 */
    val scope = rememberCoroutineScope()
    /* 密度用于计算 cameraDistance */
    val density = LocalDensity.current
    /* cameraDistance 单位为 px，使用 12 倍密度距离以减轻透视失真 */
    val cameraDistancePx = 12f * density.density

    this
        .graphicsLayer {
            this.cameraDistance = cameraDistancePx
            this.rotationX = rotationX.value
            this.rotationY = rotationY.value
        }
        .pointerInput(Unit) {
            /* 检测拖动手势：onDrag 累积位置，onDragEnd/onDragCancel 回正 */
            detectDragGestures(
                onDragStart = { /* 起点忽略，由 onDrag 累积 */ },
                onDragEnd = {
                    /* 释放时使用 spring 弹性回正至 0 */
                    scope.launch {
                        rotationX.animateTo(
                            targetValue = 0f,
                            animationSpec = spring(
                                dampingRatio = Spring.DampingRatioMediumBouncy,
                                stiffness = Spring.StiffnessMedium
                            )
                        )
                    }
                    scope.launch {
                        rotationY.animateTo(
                            targetValue = 0f,
                            animationSpec = spring(
                                dampingRatio = Spring.DampingRatioMediumBouncy,
                                stiffness = Spring.StiffnessMedium
                            )
                        )
                    }
                },
                onDragCancel = {
                    /* 取消手势同样回正 */
                    scope.launch {
                        rotationX.animateTo(
                            0f,
                            spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                        )
                    }
                    scope.launch {
                        rotationY.animateTo(
                            0f,
                            spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                        )
                    }
                },
                onDrag = { change, dragAmount ->
                    /* 拖动增量转换为旋转增量：水平拖动影响 Y 轴，垂直拖动影响 X 轴 */
                    val widthPx = size.width.toFloat().coerceAtLeast(1f)
                    val heightPx = size.height.toFloat().coerceAtLeast(1f)
                    /* 归一化增量后乘以 maxTilt 的 2 倍系数 */
                    val deltaX = (dragAmount.x / widthPx) * maxTilt * 2f
                    val deltaY = (dragAmount.y / heightPx) * maxTilt * 2f
                    scope.launch {
                        /* 累积旋转并裁剪到 ±maxTilt */
                        val targetY = (rotationY.value + deltaX).coerceIn(-maxTilt, maxTilt)
                        val targetX = (rotationX.value - deltaY).coerceIn(-maxTilt, maxTilt)
                        rotationX.snapTo(targetX)
                        rotationY.snapTo(targetY)
                    }
                    change.consume()
                }
            )
        }
}
