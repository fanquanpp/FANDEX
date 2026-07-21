package com.fandex.app.update

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fandex.app.ui.enhancements.FANDEXSpinner

/**
 * 侧边栏"检查更新"设置项
 *
 * 功能：在侧边栏中提供"检查更新"按钮，点击触发手动检查，
 *       支持在按钮下方展示说明提示文字（v3.1.0 新增）
 *
 * 输入：
 *   - onClick：点击回调
 *   - isChecking：是否正在检查中（true 显示旋转加载动画）
 *   - hint：可选的说明提示文字（在按钮下方一行展示）
 *   - modifier：布局修饰符
 *
 * 输出：可点击的设置项行 + 可选的提示文字
 *
 * 设计原则：
 *   - 默认显示 SystemUpdate 图标
 *   - 检查中状态切换为 FANDEXSpinner 旋转动画
 *   - 文字使用 labelLarge 字号保持视觉一致
 *   - 提示文字使用 labelSmall + onSurfaceVariant，弱化视觉权重
 *   - 适配暗色/亮色主题，所有颜色取自 MaterialTheme.colorScheme
 *
 * 使用示例：
 *   UpdateSettingsItem(
 *       onClick = { viewModel.checkForUpdate(manual = true) },
 *       isChecking = checkState is CheckState.Checking,
 *       hint = strings.updateCheckHint
 *   )
 */
@Composable
fun UpdateSettingsItem(
    onClick: () -> Unit,
    isChecking: Boolean = false,
    hint: String = "",
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(enabled = !isChecking, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            /* 状态图标：检查中显示旋转加载，否则显示更新图标 */
            if (isChecking) {
                FANDEXSpinner(
                    size = 18.dp,
                    color = MaterialTheme.colorScheme.primary
                )
            } else {
                Icon(
                    imageVector = Icons.Filled.SystemUpdate,
                    contentDescription = "检查更新",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp)
                )
            }

            /* 文字标签 */
            Text(
                text = if (isChecking) "正在检查..." else "检查更新",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )

            /* 右侧装饰圆点（更新中状态用 primary 色，否则用 surfaceVariant） */
            Spacer(modifier = Modifier.width(2.dp))
        }

        /* v3.1.0 新增：说明提示文字（非空时显示） */
        if (hint.isNotBlank() && !isChecking) {
            Spacer(modifier = Modifier.size(2.dp))
            Text(
                text = hint,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
