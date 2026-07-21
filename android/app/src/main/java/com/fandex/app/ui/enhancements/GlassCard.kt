package com.fandex.app.ui.enhancements

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.fandex.app.ui.theme.LocalIsDarkTheme

/**
 * GlassCard 玻璃卡片组件
 *
 * 功能：提供半透明卡片容器，模拟玻璃材质质感
 *
 * v3.6.0 变更：
 *   - 移除渐变边框（属于光晕发散模糊类效果），改用纯色细边框
 *   - 保留半透明背景以维持视觉层次感
 *   - 边框使用纯色 borderColor，去除 Brush.linearGradient 上亮下暗的渐变效果
 *
 * v3.6.0 主题同步修复：
 *   - 移除 isSystemInDarkTheme() 直接调用，改用 LocalIsDarkTheme CompositionLocal
 *     保证与 DataStore 用户偏好一致
 *
 * 实现要点：
 * - 暗色模式：背景 Black.copy(alpha=0.4f)，边框 White.copy(alpha=0.1f)
 * - 亮色模式：背景 White.copy(alpha=0.7f)，边框 Black.copy(alpha=0.05f)
 * - 圆角 16.dp，内边距 16.dp
 * - 边框使用纯色（v3.6.0 移除渐变）
 *
 * 设计原则：
 * - 颜色透明度刻意保持低调，保证卡片下方的装饰层/背景层能透出
 * - 圆角与内边距遵循 Material 3 容器规范
 * - 不强制固定尺寸，由父容器与内容共同决定布局
 *
 * 使用示例：
 *   GlassCard(modifier = Modifier.fillMaxWidth()) {
 *       Text("Hello Glass")
 *   }
 *
 * 输入：
 *   - modifier  修饰符（可选，外部布局控制）
 *   - cornerRadius 圆角半径（默认 16.dp）
 *   - contentPadding 内边距（默认 16.dp）
 *   - content    卡片内容 Composable
 * 输出：带玻璃质感的卡片容器
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 16.dp,
    contentPadding: Dp = 16.dp,
    content: @Composable () -> Unit
) {
    /* v3.6.0：通过 CompositionLocal 读取主题状态，与 DataStore 用户偏好同步 */
    val darkTheme = LocalIsDarkTheme.current
    val backgroundColor = if (darkTheme) {
        Color.Black.copy(alpha = 0.4f)
    } else {
        Color.White.copy(alpha = 0.7f)
    }
    /* v3.6.0：边框使用纯色，移除渐变（去除光晕发散模糊类效果） */
    val borderColor = if (darkTheme) {
        Color.White.copy(alpha = 0.1f)
    } else {
        Color.Black.copy(alpha = 0.05f)
    }

    val shape = RoundedCornerShape(cornerRadius)

    Box(
        modifier = modifier
            .clip(shape)
            .background(backgroundColor, shape)
            .border(width = 1.dp, color = borderColor, shape = shape)
            .padding(contentPadding)
    ) {
        content()
    }
}
