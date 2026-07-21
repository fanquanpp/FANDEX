package com.fandex.app.home

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.material3.*
import com.fandex.app.data.Category
import com.fandex.app.data.ContentIndex
import com.fandex.app.data.DataStoreManager
import com.fandex.app.data.Module
import com.fandex.app.data.Strings
import com.fandex.app.ui.background.BackgroundDecorSystem
import com.fandex.app.ui.components.CategoryColorParser
import com.fandex.app.ui.components.GeoBgVariant

/**
 * 首页界面组件
 *
 * 功能：按分类展示模块列表，支持分类筛选
 * 输入：内容索引、当前选中分类、分类变更回调、模块导航回调
 * 输出：可滚动的分类-模块列表
 * 流程：接收上层传入的索引 -> 渲染分类筛选 -> 渲染增强模块卡片
 *
 * 设计变更：
 * - 移除内部 TopAppBar，由 HomeActivity 统一管理
 * - 移除 onOpenDrawer 回调，侧边栏由 HomeActivity 管理
 * - selectedCategory 状态提升至 FANDEXApp，避免导航返回时筛选状态丢失
 * - contentIndex 由 FANDEXApp 统一加载并传入，避免重复 IO
 */
@Composable
fun HomeScreen(
    contentIndex: ContentIndex? = null,
    selectedCategory: String? = null,
    onCategoryChange: (String?) -> Unit = {},
    onNavigateToModule: (String) -> Unit
) {
    val strings = Strings.default

    /* 从 DataStore 读取动态背景装饰开关，默认 true */
    val context = LocalContext.current
    val dynamicBackgroundEnabled by DataStoreManager.getDynamicBackground(context)
        .collectAsState(initial = true)

    if (contentIndex == null) {
        /* 加载中状态：底层渲染 6 层背景装饰系统，营造等待时的视觉质感 */
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            /* 装饰层作为背景，z-index 低于内容层 */
            BackgroundDecorSystem(
                variant = GeoBgVariant.Loading,
                dynamicBackground = dynamicBackgroundEnabled
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "FANDEX",
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(8.dp))
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = strings.loading,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        return
    }

    /* 根据筛选条件过滤模块 */
    val filteredModules = remember(contentIndex, selectedCategory) {
        if (selectedCategory != null) {
            contentIndex.modules.filter { it.category == selectedCategory }
        } else {
            contentIndex.modules
        }
    }

    /* 构建分类 ID 到 Category 对象的映射，供模块卡片查找分类名 */
    val categoryMap = remember(contentIndex) {
        contentIndex.categories.associateBy { it.id }
    }

    /* 使用 Box 包裹：底层渲染装饰层，上层渲染内容列表 */
    Box(modifier = Modifier.fillMaxSize()) {
        /* 6 层背景装饰系统 · 首页变体 */
        BackgroundDecorSystem(
            variant = GeoBgVariant.Home,
            dynamicBackground = dynamicBackgroundEnabled
        )
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
        /* 分类筛选条 */
        item {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedCategory == null,
                        onClick = { onCategoryChange(null) },
                        label = { Text(strings.all) },
                        modifier = Modifier.animateItem(
                            placementSpec = spring(
                                stiffness = Spring.StiffnessMediumLow,
                                dampingRatio = Spring.DampingRatioNoBouncy
                            )
                        )
                    )
                }
                items(contentIndex.categories, key = { it.id }) { category ->
                    val catColor = remember(category.color) {
                        CategoryColorParser.parse(category.color)
                    }
                    FilterChip(
                        selected = selectedCategory == category.id,
                        onClick = {
                            onCategoryChange(if (selectedCategory == category.id) null else category.id)
                        },
                        label = { Text(category.label) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = catColor.copy(alpha = 0.15f),
                            selectedLabelColor = catColor
                        ),
                        modifier = Modifier.animateItem(
                            placementSpec = spring(
                                stiffness = Spring.StiffnessMediumLow,
                                dampingRatio = Spring.DampingRatioNoBouncy
                            )
                        )
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        /* 模块卡片列表 - 按分类分组 */
        val groupedModules = filteredModules.groupBy { it.category }
        val orderedCategories = contentIndex.categories.filter { groupedModules.containsKey(it.id) }

        items(orderedCategories, key = { it.id }) { category ->
            val categoryModules = groupedModules[category.id] ?: emptyList()
            CategoryModuleSection(
                category = category,
                modules = categoryModules,
                categoryMap = categoryMap,
                strings = strings,
                onModuleClick = onNavigateToModule,
                modifier = Modifier.animateItem(
                    placementSpec = spring(
                        stiffness = Spring.StiffnessMediumLow,
                        dampingRatio = Spring.DampingRatioNoBouncy
                    )
                )
            )
        }
    }
    } /* Box 闭合 */
}

/**
 * 分类模块区块
 *
 * 功能：展示某分类下的所有模块卡片，模块间以分类色短分界线分隔
 * 输入：Category、该分类下的模块列表、分类映射表、语言字符串
 * 输出：分类标题 + 增强模块卡片列表
 */
@Composable
fun CategoryModuleSection(
    category: Category,
    modules: List<Module>,
    categoryMap: Map<String, Category>,
    strings: Strings.LangStrings,
    onModuleClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val cardColor = remember(category.color) {
        CategoryColorParser.parse(category.color)
    }

    Column(modifier = modifier.fillMaxWidth()) {
        /* 分类标题 */
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 6.dp, top = 8.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(18.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(cardColor)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = category.label,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "${modules.size} ${strings.modules}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        /* 模块卡片，模块间以分类色短分界线分隔 */
        modules.forEachIndexed { index, module ->
            ModuleCard(
                module = module,
                accentColor = cardColor,
                categoryLabel = category.label,
                strings = strings,
                onClick = { onModuleClick(module.id) }
            )
            /* 模块间短分界线（最后一个不加） */
            if (index < modules.size - 1) {
                Box(
                    modifier = Modifier
                        .padding(start = 24.dp, top = 2.dp, bottom = 2.dp)
                        .width(32.dp)
                        .height(2.dp)
                        .clip(RoundedCornerShape(1.dp))
                        .background(cardColor.copy(alpha = 0.3f))
                )
            }
        }
    }
}

/**
 * 模块卡片（增强版）
 *
 * 功能：展示单个模块的详细信息，包含标题、文档数、分类名、简介首行
 * 输入：Module 对象、强调色、分类标签、语言字符串
 * 输出：可点击的增强模块卡片
 */
@Composable
fun ModuleCard(
    module: Module,
    accentColor: Color,
    categoryLabel: String,
    strings: Strings.LangStrings,
    onClick: () -> Unit
) {
    /**
     * 提取简介首行
     *
     * 输入：module.description（可能含多行文本）
     * 输出：第一行非空文本，截断至 60 字符
     */
    val descriptionFirstLine = remember(module.description) {
        val firstLine = module.description.lines().firstOrNull { it.isNotBlank() } ?: ""
        if (firstLine.length > 60) firstLine.take(57) + "..." else firstLine
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            /* 模块颜色圆点 */
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(accentColor)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                /* 标题行 */
                Text(
                    text = module.title,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                /* 文档数 + 分类名 */
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 2.dp)
                ) {
                    Text(
                        text = "${module.documents.size} ${strings.docs}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = categoryLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = accentColor.copy(alpha = 0.7f)
                    )
                }
                /* 简介首行 */
                if (descriptionFirstLine.isNotBlank()) {
                    Text(
                        text = descriptionFirstLine,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }
        }
    }
}
