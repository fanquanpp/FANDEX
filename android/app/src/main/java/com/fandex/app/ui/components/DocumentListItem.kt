package com.fandex.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fandex.app.data.Document

/**
 * 文档列表项组件
 *
 * 功能：渲染侧边栏/列表中的单个文档项，支持高亮当前文档
 * 输入：
 *   - document: 文档数据
 *   - accentColor: 分类强调色（用于左侧圆点）
 *   - isCurrent: 是否为当前文档（true 时高亮显示）
 *   - onClick: 点击回调（module, slug, title）
 * 输出：圆点 + 标题的横向列表项
 *
 * 设计说明：
 *   1. 统一文档列表项的视觉与交互，消除 SidebarContent 中的内联渲染
 *   2. 通过 isCurrent 参数控制高亮（背景色与字重变化）
 *   3. 透明背景兜底，避免在非高亮场景下出现意外背景
 */
@Composable
fun DocumentListItem(
    document: Document,
    accentColor: androidx.compose.ui.graphics.Color,
    isCurrent: Boolean = false,
    onClick: (String, String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(
                if (isCurrent) MaterialTheme.colorScheme.primaryContainer
                else Color.Transparent
            )
            .clickable { onClick(document.module, document.slug, document.title) }
            .padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        /* 左侧分类色圆点 */
        Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(accentColor.copy(alpha = 0.6f))
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = document.title,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
            color = if (isCurrent) MaterialTheme.colorScheme.onPrimaryContainer
            else MaterialTheme.colorScheme.onSurface,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
    }
}
