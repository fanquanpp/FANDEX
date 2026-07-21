package com.fandex.app.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fandex.app.data.ContentIndex
import com.fandex.app.data.Document
import com.fandex.app.data.Strings

/**
 * 侧边栏内容组件
 *
 * 功能：合并原 SidebarModuleContent 与 SidebarArticleContent，统一渲染模块文档列表
 * 输入：
 *   - contentIndex: 内容索引
 *   - currentModuleId: 当前模块 ID
 *   - strings: 多语言字符串
 *   - onDocumentClick: 文档点击回调（module, slug, title）
 *   - onNavigateHome: 返回主页回调
 *   - highlightCurrent: 是否高亮当前文档（文章路由下传 true，模块路由下传 false）
 *   - currentSlug: 当前文档 slug（仅当 highlightCurrent=true 时生效，用于匹配高亮项）
 * 输出：返回主页按钮 + 模块标题 + 文档列表（可选高亮当前项）
 *
 * 设计说明：
 *   1. 通过 highlightCurrent 参数区分两种场景，消除重复组件定义
 *   2. 高亮策略：背景色使用 primaryContainer，文字加粗显示
 */
@Composable
fun SidebarContent(
    contentIndex: ContentIndex?,
    currentModuleId: String,
    strings: Strings.LangStrings,
    onDocumentClick: (String, String, String) -> Unit,
    onNavigateHome: () -> Unit,
    highlightCurrent: Boolean = false,
    currentSlug: String? = null
) {
    val module = contentIndex?.modules?.find { it.id == currentModuleId }
    val category = module?.let { m ->
        contentIndex?.categories?.find { it.id == m.category }
    }
    val documents = module?.let { m ->
        m.documents.map { docName ->
            Document(slug = docName, title = docName, module = m.id)
        }
    } ?: emptyList()

    /* 解析分类强调色（解析失败时由 CategoryColorParser 返回兜底色） */
    val accentColor = remember(category?.color) {
        CategoryColorParser.parse(category?.color)
    }

    Column(
        modifier = Modifier
            .fillMaxHeight()
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        /* 返回主页按钮 */
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onNavigateHome)
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Home,
                contentDescription = strings.home,
                modifier = Modifier.size(18.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = strings.home,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        /* 模块标题 */
        if (module != null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .width(3.dp)
                        .height(20.dp)
                        .clip(RoundedCornerShape(1.dp))
                        .background(accentColor)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = module.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${documents.size} ${strings.docs}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        /* 文档列表 */
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            items(documents, key = { it.slug }) { document ->
                /* 判断当前文档是否需要高亮：仅当 highlightCurrent=true 且 slug 匹配时高亮 */
                val isCurrent = highlightCurrent && currentSlug != null && document.slug == currentSlug
                DocumentListItem(
                    document = document,
                    accentColor = accentColor,
                    isCurrent = isCurrent,
                    onClick = onDocumentClick,
                    modifier = Modifier.animateItem(
                        placementSpec = spring(
                            stiffness = Spring.StiffnessMediumLow,
                            dampingRatio = Spring.DampingRatioNoBouncy
                        )
                    )
                )
            }
        }
    }
}
