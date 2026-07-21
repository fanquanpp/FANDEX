package com.fandex.app.ui.background

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import com.fandex.app.ui.theme.LocalIsDarkTheme
import com.fandex.app.ui.theme.PrimaryBlue
import kotlin.coroutines.coroutineContext
import kotlin.random.Random
import kotlinx.coroutines.isActive

/**
 * L1 粒子层（Particle Layer）
 *
 * 功能：在 Canvas 上绘制 30~50 个缓慢漂浮的粒子（dust motes 风格），
 *       为应用背景营造层次感与灵动感，呼应"知识在空间中漂浮"的设计隐喻
 *
 * v3.6.0 变更：
 *   - 移除 isSystemInDarkTheme() 直接调用，改用 LocalIsDarkTheme CompositionLocal
 *     保证与 DataStore 用户偏好一致，避免用户切换主题后粒子颜色仍按系统主题渲染
 *
 * 实现要点：
 * - 使用 `withFrameNanos` 驱动逐帧动画，保证 60fps 流畅度
 * - 每个粒子有独立的位置、速度、半径、透明度
 * - 粒子颜色：亮色模式使用 PrimaryBlue(0xFF4F5BD5)，暗色模式使用 0xFF6EA8FE，透明度 0.1~0.3
 * - 边界反弹：粒子触达屏幕边缘后反向运动，避免粒子飞出可视区域
 * - 性能优化：使用单一 Canvas 而非多个 Box；粒子数据用 List 在 remember 中初始化一次，
 *   逐帧通过可观察的 List<ParticleState> 更新位置，触发 Canvas 重绘
 *
 * 设计原则：
 * - 粒子半径与透明度刻意保持低调，避免干扰前景内容阅读
 * - 速度极慢（5~15 dp/s），符合"静谧漂浮"的视觉调性
 * - Canvas 默认不拦截点击事件，pointerEvents 自然透传
 *
 * 输入：modifier 修饰符
 * 输出：充满父容器的粒子动画 Canvas
 */
@Composable
fun L1ParticleLayer(modifier: Modifier = Modifier) {
    /* v3.6.0：通过 CompositionLocal 读取主题状态，与 DataStore 用户偏好同步 */
    val darkTheme = LocalIsDarkTheme.current
    val particleColor = if (darkTheme) Color(0xFF6EA8FE) else PrimaryBlue

    /* 获取 Density 用于 dp -> px 转换 */
    val density = LocalDensity.current

    /* 粒子数量：取 30~50 之间的固定值 40，平衡视觉密度与性能开销 */
    val particleCount = 40

    /* 粒子初始状态列表，仅在首次组合时初始化一次；
       使用 MutableList 以便后续在动画循环中写回反弹后的速度 */
    val particles = remember {
        mutableListOf<ParticleState>().apply {
            repeat(particleCount) { index ->
                add(
                    ParticleState(
                        id = index,
                        x = Random.nextFloat() * 1000f,
                        y = Random.nextFloat() * 2000f,
                        vx = Random.nextFloat() * 20f - 10f,         /* -10~10 px/s，缓慢漂浮 */
                        vy = Random.nextFloat() * 20f - 10f,
                        radiusPx = Random.nextFloat() * 1.5f + 0.5f,  /* 0.5~2 px 粒子半径 */
                        alpha = Random.nextFloat() * 0.2f + 0.1f      /* 0.1~0.3 透明度 */
                    )
                )
            }
        }
    }

    /* 当前粒子位置的可观察状态，每次更新触发 Canvas 重绘 */
    var particlePositions by remember {
        mutableStateOf(particles.map { Offset(it.x, it.y) })
    }

    /* 使用 BoxWithConstraints 获取实际尺寸，用于边界反弹计算 */
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        /* 父容器宽高（px），fallback 至 1f 避免除零 */
        val widthPx = with(density) { maxWidth.toPx() }.coerceAtLeast(1f)
        val heightPx = with(density) { maxHeight.toPx() }.coerceAtLeast(1f)

        /* 逐帧动画驱动循环：基于 withFrameNanos 的高精度帧计时 */
        LaunchedEffect(widthPx, heightPx) {
            var lastNanos = 0L
            /* 当 LaunchedEffect 作用域仍处于活跃状态时持续动画 */
            while (coroutineContext.isActive) {
                withFrameNanos { now ->
                    /* 首帧仅记录时间戳，避免产生异常大的 deltaTime */
                    if (lastNanos == 0L) {
                        lastNanos = now
                        return@withFrameNanos
                    }
                    /* 计算帧间隔（秒），上限 0.05s 防止切换后台返回时跳跃 */
                    val delta = ((now - lastNanos) / 1_000_000_000f).coerceAtMost(0.05f)
                    lastNanos = now

                    /* 逐个粒子更新位置并处理边界反弹 */
                    val newPositions = particlePositions.mapIndexed { index, pos ->
                        val p = particles[index]
                        var nx = pos.x + p.vx * delta
                        var ny = pos.y + p.vy * delta
                        var vx = p.vx
                        var vy = p.vy

                        /* 水平边界反弹：触达左右边缘后水平速度反向 */
                        if (nx < 0f) {
                            nx = -nx
                            vx = -vx
                        } else if (nx > widthPx) {
                            nx = 2 * widthPx - nx
                            vx = -vx
                        }
                        /* 垂直边界反弹：触达上下边缘后垂直速度反向 */
                        if (ny < 0f) {
                            ny = -ny
                            vy = -vy
                        } else if (ny > heightPx) {
                            ny = 2 * heightPx - ny
                            vy = -vy
                        }

                        /* 写回速度（boundary bounce 后的速度需要持久化） */
                        particles[index] = p.copy(vx = vx, vy = vy)
                        Offset(nx, ny)
                    }
                    particlePositions = newPositions
                }
            }
        }

        /* 单一 Canvas 绘制所有粒子，避免多个 Box 嵌套的性能开销 */
        Canvas(modifier = Modifier.fillMaxSize()) {
            /* 读取 particlePositions 触发 Canvas 重绘（snapshot 观察） */
            val positions = particlePositions
            particles.forEachIndexed { index, p ->
                val pos = positions[index]
                drawCircle(
                    color = particleColor.copy(alpha = p.alpha),
                    radius = p.radiusPx,
                    center = pos
                )
            }
        }
    }
}

/**
 * 粒子内部状态
 *
 * 设计说明：使用 data class 便于 copy 修改速度，提升代码可读性
 *
 * @property id         粒子唯一标识（用于稳定索引）
 * @property x          当前 x 坐标（px）
 * @property y          当前 y 坐标（px）
 * @property vx         x 方向速度（px/s）
 * @property vy         y 方向速度（px/s）
 * @property radiusPx   粒子半径（px）
 * @property alpha      透明度（0~1）
 */
private data class ParticleState(
    val id: Int,
    val x: Float,
    val y: Float,
    val vx: Float,
    val vy: Float,
    val radiusPx: Float,
    val alpha: Float
)
