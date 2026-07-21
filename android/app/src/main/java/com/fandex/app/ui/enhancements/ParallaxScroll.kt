package com.fandex.app.ui.enhancements

import androidx.compose.foundation.ScrollState
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.graphicsLayer

/**
 * ParallaxScroll 视差滚动修饰符
 *
 * 功能：滚动时让背景元素以不同速度位移，产生空间层次感
 *
 * 实现要点：
 * - 提供 `Modifier.parallaxScroll(parallaxFactor: Float = 0.5f, scrollState: ScrollState)` 扩展函数
 * - 通过 `graphicsLayer.translationY` 应用视差位移
 * - 位移 = -scrollState.value * parallaxFactor
 *   - parallaxFactor > 0：元素位移方向与滚动方向相反（向下滚动时元素向上漂移，营造背景在前感觉）
 *   - parallaxFactor < 0：元素位移方向与滚动方向相同（向下滚动时元素向下漂移）
 *
 * 设计原则：
 * - 不接管滚动监听，仅依赖外部传入的 scrollState.value 计算位移
 * - 使用 `composed` 让 Modifier 访问 Composable 上下文（remember）
 * - 视差因子建议范围 0.1 ~ 0.8，过大可能造成元素脱离容器
 *
 * 使用示例：
 *   val scrollState = rememberScrollState()
 *   Column(modifier = Modifier.verticalScroll(scrollState)) {
 *       Image(
 *           modifier = Modifier.parallaxScroll(parallaxFactor = 0.5f, scrollState = scrollState),
 *           ...
 *       )
 *       // 前景内容...
 *   }
 *
 * 输入：
 *   - parallaxFactor 视差因子（默认 0.5f）
 *   - scrollState    外部 ScrollState 实例
 * 输出：附带视差位移的 Modifier
 */
fun Modifier.parallaxScroll(
    parallaxFactor: Float = 0.5f,
    scrollState: ScrollState
): Modifier = composed {
    /* 缓存当前 scrollState.value，通过 graphicsLayer 实时读取 */
    val scrollValue = scrollState.value
    /* 视差位移 = -scrollValue * factor；负号让背景元素与滚动方向反向移动 */
    val translation = -scrollValue * parallaxFactor

    this.graphicsLayer {
        this.translationY = translation
    }
}
