package com.fandex.app.ui.background

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fandex.app.ui.components.GeoBgDecor
import com.fandex.app.ui.components.GeoBgVariant

/**
 * L4 几何装饰层（Geo Decor Layer）
 *
 * 功能：直接复用现有的 GeoBgDecor，作为 6 层背景装饰系统中的几何装饰元素层
 *
 * 实现要点：
 * - 创建 L4GeoDecorLayer Composable 包装现有的 GeoBgDecor
 * - 保持向后兼容：不修改 GeoBgDecor.kt，仅做一层薄包装
 * - 透传 variant 与 modifier 参数，行为与 GeoBgDecor 完全一致
 *
 * 设计原则：
 * - 单一职责：本层仅负责"几何装饰"这一视觉职责
 * - 包装而非重写：避免代码重复，未来 GeoBgDecor 升级时本层自动受益
 * - GeoBgDecor 内部已使用 Canvas 绘制，pointerEvents 自然透传
 *
 * 输入：
 *   - variant  装饰变体（Home / Module / Splash / Loading）
 *   - modifier 修饰符
 * 输出：充满父容器的几何装饰层
 */
@Composable
fun L4GeoDecorLayer(
    variant: GeoBgVariant,
    modifier: Modifier = Modifier
) {
    /* 直接调用 GeoBgDecor，保持完全一致的行为 */
    GeoBgDecor(
        variant = variant,
        modifier = modifier
    )
}
