package com.fandex.app.ui.background

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fandex.app.ui.components.GeoBgVariant

/**
 * 背景装饰系统统一入口（Background Decor System）
 *
 * 功能：组合 L1/L3/L4 三个背景装饰层，提供单一 API 供上层调用，简化集成复杂度
 *
 * v3.6.0 变更：
 *   - 移除 L5 CursorGlowLayer（光标光晕层），按用户要求去除全部光晕/发散/模糊类效果
 *   - 原因：光标光晕属于发散模糊类效果，与追求极简、克制、清晰的视觉调性不符
 *   - 移除后背景装饰更聚焦于"几何线条 + 精确点阵 + 静态粒子"的构成主义美学
 *
 * v3.1.0 变更：
 *   - 移除 L2 GradientBlobsLayer（泛光色晕层），按用户要求去除泛光效果
 *   - 原因：L2 的径向渐变球营造了柔和的光斑氛围，但用户反馈为"泛光色晕"，
 *     与追求极简、克制、清晰的视觉调性不符
 *   - 移除后背景装饰更聚焦于"几何线条 + 精确点阵"的构成主义美学
 *
 * 层级架构（从底到顶）：
 *   ┌──────────────────────────────────────┐
 *   │ L4 GeoDecorLayer     （几何装饰层）   │  顶层，始终渲染
 *   │ L3 GridNoiseLayer    （网格点阵层）   │  始终渲染
 *   │ L1 ParticleLayer     （粒子层）       │  底层，仅 dynamic 时
 *   └──────────────────────────────────────┘
 *
 * 渲染策略：
 * - 始终渲染：L3 GridNoiseLayer, L4 GeoDecorLayer
 *   · 这两层是静态/低开销层，关闭动态背景时仍保留基础视觉质感
 * - 仅当 dynamicBackground=true 时渲染：L1 ParticleLayer
 *   · 该层包含持续动画，关闭后可显著降低电量与 GPU 占用
 * - v3.6.0 已移除：L5 CursorGlowLayer（光标光晕层）、L2 GradientBlobsLayer（渐变球层）
 *
 * pointerEvents 透传：
 * - 所有层均使用 Canvas 绘制（默认不拦截点击）
 * - 因此本系统整体不拦截任何点击事件，前景内容可正常接收触摸
 *
 * 输入：
 *   - variant           装饰变体（Home / Module / Splash / Loading）
 *   - dynamicBackground 是否开启动态层（L1），默认 true
 *   - modifier          修饰符
 * 输出：充满父容器的多层背景装饰堆叠
 */
@Composable
fun BackgroundDecorSystem(
    variant: GeoBgVariant,
    dynamicBackground: Boolean = true,
    modifier: Modifier = Modifier
) {
    /* 使用 Box 堆叠所有层，所有子层 fillMaxSize 充满父容器 */
    Box(modifier = modifier.fillMaxSize()) {
        /* ---------- L1 粒子层（最底层，仅 dynamic 时渲染） ---------- */
        if (dynamicBackground) {
            L1ParticleLayer(modifier = Modifier.fillMaxSize())
        }

        /* ---------- L2 渐变球层已移除（v3.1.0：去除泛光色晕） ---------- */

        /* ---------- L3 网格点阵层（始终渲染） ---------- */
        L3GridNoiseLayer(modifier = Modifier.fillMaxSize())

        /* ---------- L4 几何装饰层（始终渲染，复用 GeoBgDecor） ---------- */
        L4GeoDecorLayer(
            variant = variant,
            modifier = Modifier.fillMaxSize()
        )

        /* ---------- L5 光标光晕层已移除（v3.6.0：去除发散模糊类效果） ---------- */
    }
}
