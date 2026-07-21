package com.fandex.app.ui.enhancements

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

/**
 * CustomScrollbar 自定义滚动条
 *
 * 功能：为 LazyColumn / ScrollableColumn 提供自定义样式的滚动条
 *
 * 实现要点：
 * - 提供 `Modifier.verticalScrollbar(scrollState: ScrollState)` 扩展函数（普通滚动场景）
 * - 提供 `LazyListState.verticalScrollbar()` 扩展函数（LazyList 场景）
 * - 滚动条宽度 4dp，颜色 `Color.Gray.copy(alpha=0.4f)`
 * - 使用 `derivedStateOf` 计算滚动条位置和高度（避免每帧重组）
 * - 滚动时显示，停止 1 秒后淡出
 *
 * 设计原则：
 * - 使用 `Animatable` 控制透明度，滚动时 200ms 升至 1.0，停止 1s 后 400ms 衰减至 0
 * - 通过 `drawWithContent` 在内容之上叠加滚动条，避免遮挡内容主体
 * - 滚动条仅在需要时可见，避免无意义视觉干扰
 *
 * 使用示例：
 *   val scrollState = rememberScrollState()
 *   Column(modifier = Modifier
 *       .verticalScroll(scrollState)
 *       .verticalScrollbar(scrollState)
 *   ) { ... }
 *
 *   val listState = rememberLazyListState()
 *   LazyColumn(state = listState, modifier = Modifier.verticalScrollbar(listState)) { ... }
 */

/** 滚动条颜色（灰色 40% 透明度） */
private val ScrollbarColor = Color.Gray.copy(alpha = 0.4f)

/** 滚动条宽度（4dp） */
private val ScrollbarWidth = 4.dp

/**
 * 滚动条位置与高度数据
 */
private data class ThumbMetrics(
    val top: Float,
    val height: Float
)

/**
 * 根据视口/内容/偏移计算滚动条位置
 *
 * 输入：
 *   - viewportHeight 视口高度（px）
 *   - contentHeight  内容总高度（px）
 *   - scrollOffset   当前滚动偏移（px）
 * 输出：ThumbMetrics 或 null（内容不超过视口时不返回）
 */
private fun computeThumbMetrics(
    viewportHeight: Float,
    contentHeight: Float,
    scrollOffset: Float
): ThumbMetrics? {
    if (contentHeight <= viewportHeight || contentHeight <= 0f || viewportHeight <= 0f) {
        return null
    }
    val thumbRatio = (viewportHeight / contentHeight).coerceIn(0.05f, 1f)
    val thumbHeight = viewportHeight * thumbRatio
    val maxScroll = contentHeight - viewportHeight
    val scrollRatio = (scrollOffset / maxScroll).coerceIn(0f, 1f)
    val thumbTop = scrollRatio * (viewportHeight - thumbHeight)
    return ThumbMetrics(top = thumbTop, height = thumbHeight)
}

/**
 * 为普通 ScrollState 提供自定义垂直滚动条
 *
 * 功能：基于 ScrollState.value 与 maxValue 计算滚动条位置
 *
 * 实现说明：
 * - ScrollState.maxValue 即为内容总像素高度与视口高度之差
 * - 通过 onSizeChanged 获取实际视口高度
 * - 内容总高度 = maxValue + viewportHeight
 *
 * 输入：
 *   - scrollState 外部 rememberScrollState() 实例
 */
fun Modifier.verticalScrollbar(
    scrollState: ScrollState
): Modifier = composed {
    /* 容器视口高度 */
    var viewportHeight by remember { mutableFloatStateOf(0f) }

    /* 滚动条透明度（0~1），由 Animatable 驱动 */
    val scrollbarAlpha = remember { Animatable(0f) }

    /* 是否正在滚动：通过 derivedStateOf 监听 scrollState.value 变化 */
    val isScrolling by remember {
        derivedStateOf { scrollState.value > 0 && scrollState.value < scrollState.maxValue }
    }

    /* 监听滚动状态变化触发淡入/淡出动画 */
    LaunchedEffect(isScrolling) {
        if (isScrolling) {
            scrollbarAlpha.animateTo(1f, tween(200))
        } else {
            /* 停止 1 秒后淡出 */
            delay(1000)
            scrollbarAlpha.animateTo(0f, tween(400))
        }
    }

    /* 当前透明度（避免每帧读取 Animatable.value 触发重组，使用派生状态） */
    val currentAlpha by remember { derivedStateOf { scrollbarAlpha.value } }

    this
        .onSizeChanged { viewportHeight = it.height.toFloat() }
        .drawWithContent {
            /* 先绘制内容，再叠加滚动条 */
            drawContent()
            val contentHeight = scrollState.maxValue.toFloat() + viewportHeight
            val metrics = computeThumbMetrics(
                viewportHeight = viewportHeight,
                contentHeight = contentHeight,
                scrollOffset = scrollState.value.toFloat()
            )
            if (metrics != null && currentAlpha > 0.001f) {
                val barWidthPx = ScrollbarWidth.toPx()
                drawRect(
                    color = ScrollbarColor.copy(alpha = ScrollbarColor.alpha * currentAlpha),
                    topLeft = Offset(size.width - barWidthPx, metrics.top),
                    size = Size(barWidthPx, metrics.height)
                )
            }
        }
}

/**
 * 为 LazyListState 提供自定义垂直滚动条
 *
 * 功能：基于 LazyListState.layoutInfo 计算滚动条位置
 *
 * 实现说明：
 * - 通过 layoutInfo.visibleItemsInfo 估算内容总高度
 * - 通过 isScrollInProgress 判断是否正在滚动
 *
 * 使用示例：
 *   val listState = rememberLazyListState()
 *   LazyColumn(state = listState, modifier = listState.verticalScrollbar()) { ... }
 *
 * 输入：
 *   - this LazyListState 实例
 * 输出：附带滚动条的 Modifier
 */
fun LazyListState.verticalScrollbar(): Modifier = Modifier.composed {
    val lazyListState = this@verticalScrollbar
    val layoutInfo = lazyListState.layoutInfo

    /* 视口高度 */
    val viewportHeight by remember {
        derivedStateOf { layoutInfo.viewportSize.height.toFloat() }
    }

    /* 内容总高度估算：可见项平均高度 * 总项数 */
    val contentHeight by remember {
        derivedStateOf {
            val items = layoutInfo.visibleItemsInfo
            val total = layoutInfo.totalItemsCount
            if (items.isNotEmpty() && total > 0) {
                val avgHeight = items.sumOf { it.size }.toFloat() / items.size
                avgHeight * total
            } else {
                0f
            }
        }
    }

    /* 滚动偏移估算：首项 index * 平均高度 + 首项负偏移 */
    val scrollOffset by remember {
        derivedStateOf {
            val items = layoutInfo.visibleItemsInfo
            val total = layoutInfo.totalItemsCount
            if (items.isNotEmpty() && total > 0) {
                val firstItem = items.first()
                val avgHeight = items.sumOf { it.size }.toFloat() / items.size
                firstItem.index * avgHeight + (-firstItem.offset.toFloat())
            } else {
                0f
            }
        }
    }

    /* 滚动条透明度（0~1），由 Animatable 驱动 */
    val scrollbarAlpha = remember { Animatable(0f) }

    LaunchedEffect(lazyListState.isScrollInProgress) {
        if (lazyListState.isScrollInProgress) {
            scrollbarAlpha.animateTo(1f, tween(200))
        } else {
            delay(1000)
            scrollbarAlpha.animateTo(0f, tween(400))
        }
    }

    val currentAlpha by remember { derivedStateOf { scrollbarAlpha.value } }

    Modifier.drawWithContent {
        drawContent()
        val metrics = computeThumbMetrics(
            viewportHeight = viewportHeight,
            contentHeight = contentHeight,
            scrollOffset = scrollOffset
        )
        if (metrics != null && currentAlpha > 0.001f) {
            val barWidthPx = ScrollbarWidth.toPx()
            drawRect(
                color = ScrollbarColor.copy(alpha = ScrollbarColor.alpha * currentAlpha),
                topLeft = Offset(size.width - barWidthPx, metrics.top),
                size = Size(barWidthPx, metrics.height)
            )
        }
    }
}
