package com.fandex.app.ui.screens.document

import com.fandex.app.ui.components.CategoryColor
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fandex.app.data.model.DocIndexEntry
import com.fandex.app.ui.common.fandexEntrance
import com.fandex.app.ui.common.tweenNormal
import com.fandex.app.ui.components.DifficultyBadge
import com.fandex.app.ui.components.FdxIconButton
import com.fandex.app.ui.components.FontScaleControls
import com.fandex.app.ui.components.ThemeQuickToggle
import com.fandex.app.ui.components.TopDock
import com.fandex.app.ui.markdown.MarkdownRenderer
import com.fandex.app.ui.markdown.TocEntry
import com.fandex.app.ui.theme.LocalExtendedColors
import kotlinx.coroutines.launch

/**
 * 文档详情页
 *
 * 对齐 Web 端文档详情页：
 * - 顶部栏（标题 + 目录 + 返回）与阅读进度条
 * - 文档元信息（难度 / 更新日期 / 阅读时长）
 * - 前置知识、Markdown 渲染正文、相关文档推荐
 * - 上下篇导航
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentScreen(
    moduleId: String,
    docSlug: String,
    onBack: () -> Unit,
    onDocClick: (String, String) -> Unit,
    onOpenDrawer: () -> Unit,
    onHome: () -> Unit = {},
    viewModel: DocumentViewModel = viewModel()
) {
    LaunchedEffect(moduleId, docSlug) {
        viewModel.loadDoc(moduleId, docSlug)
    }

    val state by viewModel.state.collectAsState()
    val renderer = remember { MarkdownRenderer() }
    val listState = rememberLazyListState()
    val success = state as? DocumentUiState.Success

    // 入场门控：内容就绪后的下一帧置 true，触发元信息与引用区块的轻量入场
    var hasEntered by remember { mutableStateOf(false) }
    LaunchedEffect(success != null) {
        if (success != null) hasEntered = true
    }

    // 目录滚动目标：块下标 -> 列表项下标（meta 与前置知识位于块之前）
    fun listItemIndexOfBlock(blockIndex: Int): Int {
        var index = 1 // meta
        if ((success?.prerequisites?.size ?: 0) > 0) index++
        return index + blockIndex
    }

    Scaffold(
        bottomBar = {
            if (success != null) {
                // 底部导航入场：内容加载完成时自底部 24dp 滑入 + 淡入（仅一次）
                val enterState = remember {
                    MutableTransitionState(false).apply { targetState = true }
                }
                val density = LocalDensity.current
                AnimatedVisibility(
                    visibleState = enterState,
                    enter = slideInVertically(tweenNormal()) {
                        with(density) { 24.dp.roundToPx() }
                    } + fadeIn(tweenNormal())
                ) {
                    PersistentDocNav(
                        prev = success.prev,
                        next = success.next,
                        accentHex = success.accentHex,
                        onDocClick = onDocClick
                    )
                }
            }
        },
        topBar = {
            Column {
                TopDock(
                    title = success?.doc?.frontmatter?.title ?: "加载中",
                    showBack = true,
                    onBack = onBack,
                    onOpenDrawer = onOpenDrawer,
                    onSyntax = {},
                    onLearningPath = {},
                    onSearch = {},
                    showNavActions = false,
                    showHome = true,
                    onHome = onHome,
                    // 模块色竖条装饰
                    accentHex = success?.accentHex,
                    themeQuickToggle = { ThemeQuickToggle(viewModel = viewModel()) },
                    pageActions = {
                        // 字号增减（移植自旧端文章页顶栏交互）
                        FontScaleControls(viewModel = viewModel())
                        val toc = success?.toc.orEmpty()
                        if (toc.isNotEmpty()) {
                            DocumentTocButton(
                                toc = toc,
                                listState = listState,
                                indexOfBlock = ::listItemIndexOfBlock
                            )
                        }
                    }
                )
                // 阅读进度条
                if (success != null) {
                    ReadingProgressBar(
                        listState = listState,
                        totalItems = totalItemsOf(success)
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (state) {
                is DocumentUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                is DocumentUiState.Error -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = (state as DocumentUiState.Error).message,
                            color = LocalExtendedColors.current.fgSecondary
                        )
                    }
                }
                is DocumentUiState.Success -> {
                    val data = state as DocumentUiState.Success

                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // 文档元信息（轻量入场）
                        item(key = "meta") {
                            Box(
                                modifier = Modifier.fandexEntrance(index = 0, visible = hasEntered)
                            ) {
                                DocMetaInfo(data)
                            }
                        }

                        // 前置知识（轻量入场）
                        if (data.prerequisites.isNotEmpty()) {
                            item(key = "prereq") {
                                Box(
                                    modifier = Modifier.fandexEntrance(index = 1, visible = hasEntered)
                                ) {
                                    DocRefSection(
                                        title = "前置知识",
                                        docs = data.prerequisites,
                                        accentHex = data.accentHex,
                                        onDocClick = onDocClick
                                    )
                                }
                            }
                        }

                        // 正文分块渲染（加粗文字使用模块分类色，对齐 web 端）
                        itemsIndexed(data.blocks, key = { index, _ -> "block-$index" }) { _, block ->
                            renderer.Block(block, accentColor = CategoryColor.parse(data.accentHex))
                        }

                        // 相关文档（轻量入场）
                        if (data.related.isNotEmpty()) {
                            item(key = "related") {
                                Box(
                                    modifier = Modifier.fandexEntrance(index = 2, visible = hasEntered)
                                ) {
                                    DocRefSection(
                                        title = "相关文档",
                                        docs = data.related,
                                        accentHex = data.accentHex,
                                        onDocClick = onDocClick
                                    )
                                }
                            }
                        }

                    }

                    // 回到顶部：滚过前几屏内容后出现
                    BackToTopButton(
                        listState = listState,
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(16.dp)
                    )
                }
            }
        }
    }
}

/**
 * 回到顶部悬浮按钮
 *
 * 长文档滚过前三项后出现，点击平滑回滚到页首
 */
@Composable
private fun BackToTopButton(listState: LazyListState, modifier: Modifier = Modifier) {
    val visible by remember {
        derivedStateOf { listState.firstVisibleItemIndex > 2 }
    }
    val scope = rememberCoroutineScope()
    val extendedColors = LocalExtendedColors.current

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn() + scaleIn(initialScale = 0.8f),
        exit = fadeOut() + scaleOut(targetScale = 0.8f),
        modifier = modifier
    ) {
        SmallFloatingActionButton(
            onClick = {
                scope.launch {
                    listState.animateScrollToItem(index = 0)
                }
            },
            containerColor = extendedColors.bgElevated,
            contentColor = MaterialTheme.colorScheme.primary
        ) {
            Icon(
                imageVector = Icons.Filled.KeyboardArrowUp,
                contentDescription = "回到顶部"
            )
        }
    }
}

/** 计算列表总项数（进度条分母） */
private fun totalItemsOf(state: DocumentUiState.Success): Int {
    var count = 1 // meta
    if (state.prerequisites.isNotEmpty()) count++
    count += state.blocks.size
    if (state.related.isNotEmpty()) count++
    return count
}

/**
 * 阅读进度条
 *
 * 按列表可见项占比估算阅读进度，与 web 端滚动进度对应；
 * 进度值经 animateFloatAsState 平滑，避免滚动时跳变
 */
@Composable
private fun ReadingProgressBar(listState: LazyListState, totalItems: Int) {
    val progress by remember(totalItems) {
        derivedStateOf {
            if (totalItems <= 1) {
                0f
            } else {
                (listState.firstVisibleItemIndex.toFloat() / totalItems).coerceIn(0f, 1f)
            }
        }
    }
    // 进度平滑过渡（220ms 减速）
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tweenNormal(),
        label = "readingProgress"
    )
    LinearProgressIndicator(
        progress = { animatedProgress },
        modifier = Modifier
            .fillMaxWidth()
            .height(2.dp)
    )
}

/**
 * 目录按钮 + 底部目录面板
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DocumentTocButton(
    toc: List<TocEntry>,
    listState: LazyListState,
    indexOfBlock: (Int) -> Int
) {
    var showSheet by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState()

    // 目录按钮（统一走 FdxIconButton，20dp 图标 + 按压缩放）
    FdxIconButton(
        icon = Icons.AutoMirrored.Filled.MenuBook,
        contentDescription = "目录",
        onClick = { showSheet = true },
        modifier = Modifier.padding(end = 4.dp)
    )

    if (showSheet) {
        ModalBottomSheet(onDismissRequest = { showSheet = false }, sheetState = sheetState) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp)
            ) {
                Text(
                    text = "目录",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
                )
                toc.forEach { entry ->
                    Text(
                        text = entry.title,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (entry.level <= 3) MaterialTheme.colorScheme.onSurface
                        else LocalExtendedColors.current.fgSecondary,
                        fontWeight = if (entry.level == 2) FontWeight.SemiBold else FontWeight.Normal,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                showSheet = false
                                scope.launch {
                                    // 平滑滚动到目标小节
                                    listState.animateScrollToItem(index = indexOfBlock(entry.blockIndex))
                                }
                            }
                            .padding(
                                start = (16 + (entry.level - 2) * 16).dp,
                                end = 20.dp,
                                top = 8.dp,
                                bottom = 8.dp
                            )
                    )
                }
            }
        }
    }
}

/**
 * 文档元信息
 */
@Composable
private fun DocMetaInfo(data: DocumentUiState.Success) {
    val extendedColors = LocalExtendedColors.current
    val fm = data.doc.frontmatter

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            DifficultyBadge(difficulty = fm.difficulty)
            if (fm.updated.isNotEmpty()) {
                Text(
                    text = "${fm.updated} 更新",
                    style = MaterialTheme.typography.labelMedium,
                    color = extendedColors.fgTertiary
                )
            }
            Text(
                text = "约 ${data.readingTime} 分钟",
                style = MaterialTheme.typography.labelMedium,
                color = extendedColors.fgTertiary
            )
        }
        if (fm.description.isNotEmpty()) {
            Text(
                text = fm.description,
                style = MaterialTheme.typography.bodyMedium,
                color = extendedColors.fgSecondary
            )
        }
    }
}

/**
 * 前置知识 / 相关文档区块
 */
@Composable
private fun DocRefSection(
    title: String,
    docs: List<DocIndexEntry>,
    accentHex: String,
    onDocClick: (String, String) -> Unit
) {
    val extendedColors = LocalExtendedColors.current
    val accent = CategoryColor.parse(accentHex)

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        // 区块标题
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(14.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(MaterialTheme.colorScheme.primary)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        docs.forEach { doc ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(4.dp))
                    .background(extendedColors.bgElevated)
                    .border(1.dp, extendedColors.borderSubtle, RoundedCornerShape(4.dp))
                    .clickable { onDocClick(doc.module, doc.slug) }
                    .padding(12.dp)
            ) {
                Text(
                    text = doc.title,
                    style = MaterialTheme.typography.bodyMedium,
                    color = accent,
                    fontWeight = FontWeight.Medium
                )
                if (doc.description.isNotEmpty()) {
                    Text(
                        text = doc.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = extendedColors.fgTertiary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}



/**
 * 常驻上下篇导航底栏
 *
 * 阅读过程中始终可见，点击直达上 / 下一篇（多彩分类色点缀）
 */
@Composable
private fun PersistentDocNav(
    prev: DocIndexEntry?,
    next: DocIndexEntry?,
    accentHex: String,
    onDocClick: (String, String) -> Unit
) {
    val extendedColors = LocalExtendedColors.current
    val accent = CategoryColor.parse(accentHex)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(extendedColors.bgElevated)
            .padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 上一篇
        Row(
            modifier = Modifier
                .weight(1f)
                .clip(RoundedCornerShape(4.dp))
                .clickable(enabled = prev != null) {
                    prev?.let { onDocClick(it.module, it.slug) }
                }
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(28.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(if (prev != null) accent else extendedColors.bgSunken)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(
                    text = "上一篇",
                    style = MaterialTheme.typography.labelSmall,
                    color = extendedColors.fgTertiary
                )
                Text(
                    text = prev?.title ?: "已是第一篇",
                    style = MaterialTheme.typography.labelMedium,
                    color = if (prev != null) accent else extendedColors.fgDisabled,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        // 下一篇
        Row(
            modifier = Modifier
                .weight(1f)
                .clip(RoundedCornerShape(4.dp))
                .clickable(enabled = next != null) {
                    next?.let { onDocClick(it.module, it.slug) }
                }
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.End
        ) {
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "下一篇",
                    style = MaterialTheme.typography.labelSmall,
                    color = extendedColors.fgTertiary
                )
                Text(
                    text = next?.title ?: "已是最后一篇",
                    style = MaterialTheme.typography.labelMedium,
                    color = if (next != null) accent else extendedColors.fgDisabled,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(28.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(if (next != null) accent else extendedColors.bgSunken)
            )
        }
    }
}

