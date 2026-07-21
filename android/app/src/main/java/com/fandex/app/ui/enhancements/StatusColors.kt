package com.fandex.app.ui.enhancements

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * StatusColors 状态颜色系统
 *
 * 功能：提供语义化状态颜色（成功/警告/错误/信息），用于统一的 UI 状态反馈
 *
 * 实现要点：
 * - 定义 `StatusColors` data class 包含四种状态颜色
 *   - success 绿色 0xFF00B894
 *   - warning 橙色 0xFFF9A825
 *   - error   红色 0xFFD63031
 *   - info    蓝色 0xFF4F5BD5
 * - 提供 `LocalStatusColors` CompositionLocal 在 Compose 树中注入颜色
 * - 提供 `StatusChip(text: String, status: StatusType)` Composable 渲染状态标签
 *
 * 设计原则：
 * - 颜色与品牌色板保持独立，避免与 MaterialTheme colorScheme 冲突
 * - StatusType 枚举与 StatusColors 字段一一对应，便于扩展
 * - StatusChip 使用半透明背景 + 实色边框，适配暗色/亮色模式
 *
 * 使用示例：
 *   CompositionLocalProvider(LocalStatusColors provides StatusColors.Default) {
 *       StatusChip(text = "成功", status = StatusType.SUCCESS)
 *   }
 */

/**
 * 状态类型枚举
 */
enum class StatusType {
    SUCCESS,
    WARNING,
    ERROR,
    INFO
}

/**
 * 状态颜色配置
 *
 * 字段说明：
 *   - success 成功（绿色，用于正向反馈：保存成功/任务完成）
 *   - warning 警告（橙色，用于提示性反馈：未读消息/待处理）
 *   - error   错误（红色，用于负向反馈：操作失败/网络异常）
 *   - info    信息（蓝色，用于中性提示：版本更新/公告）
 */
data class StatusColors(
    val success: Color,
    val warning: Color,
    val error: Color,
    val info: Color
) {
    companion object {
        /** 默认状态颜色方案（基于 Material 设计规范） */
        val Default = StatusColors(
            success = Color(0xFF00B894),
            warning = Color(0xFFF9A825),
            error = Color(0xFFD63031),
            info = Color(0xFF4F5BD5)
        )
    }
}

/**
 * 状态颜色的 CompositionLocal
 *
 * 功能：在 Compose 树中提供状态颜色方案，避免逐层透传
 *
 * 使用示例：
 *   val colors = LocalStatusColors.current
 *   Box(modifier = Modifier.background(colors.success))
 */
val LocalStatusColors = staticCompositionLocalOf<StatusColors> {
    StatusColors.Default
}

/**
 * 获取当前状态颜色（便捷访问）
 *
 * 功能：通过 StatusType 直接获取对应的 Color
 *
 * 输入：
 *   - type 状态类型
 * 输出：对应的 Color
 */
@ReadOnlyComposable
@Composable
fun statusColor(type: StatusType): Color {
    val colors = LocalStatusColors.current
    return when (type) {
        StatusType.SUCCESS -> colors.success
        StatusType.WARNING -> colors.warning
        StatusType.ERROR -> colors.error
        StatusType.INFO -> colors.info
    }
}

/**
 * 状态标签 Chip
 *
 * 功能：渲染带状态色边框与半透明背景的小型标签
 *
 * 设计说明：
 * - 圆角 12.dp，内边距 4dp 水平 / 2dp 垂直
 * - 背景：状态色 10% 透明度
 * - 边框：状态色 50% 透明度，1dp 宽
 * - 文字：状态色 100% 透明度，SemiBold 字重，10sp
 *
 * 输入：
 *   - text   标签文本
 *   - status 状态类型
 *   - modifier 修饰符
 */
@Composable
fun StatusChip(
    text: String,
    status: StatusType,
    modifier: Modifier = Modifier
) {
    val color = statusColor(status)
    val shape = RoundedCornerShape(12.dp)

    Text(
        text = text,
        color = color,
        fontWeight = FontWeight.SemiBold,
        fontSize = MaterialTheme.typography.labelSmall.fontSize,
        modifier = modifier
            .clip(shape)
            .background(color.copy(alpha = 0.10f), shape)
            .border(width = 1.dp, color = color.copy(alpha = 0.50f), shape = shape)
            .padding(horizontal = 4.dp, vertical = 2.dp)
    )
}
