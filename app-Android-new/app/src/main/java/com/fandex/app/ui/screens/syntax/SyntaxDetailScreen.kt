package com.fandex.app.ui.screens.syntax

import com.fandex.app.ui.components.CategoryColor
import androidx.compose.animation.Crossfade
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fandex.app.data.model.SyntaxCard
import com.fandex.app.ui.components.FdxIconButton
import com.fandex.app.ui.common.fandexEntrance
import com.fandex.app.ui.common.tweenNormal
import com.fandex.app.ui.components.ThemeQuickToggle
import com.fandex.app.ui.components.TopDock
import com.fandex.app.ui.markdown.rememberHighlightedCode
import com.fandex.app.ui.theme.CodeTextStyle
import com.fandex.app.ui.theme.LocalExtendedColors

@Composable
fun SyntaxDetailScreen(
    moduleId: String,
    onBack: () -> Unit,
    onDocClick: (String, String) -> Unit,
    onOpenDrawer: () -> Unit,
    onHome: () -> Unit = {},
    viewModel: SyntaxDetailViewModel = viewModel()
) {
    LaunchedEffect(moduleId) {
        viewModel.loadModule(moduleId)
    }

    val state by viewModel.state.collectAsState()
    val query by viewModel.query.collectAsState()
    val title by viewModel.title.collectAsState()
    val accentHex by viewModel.accentHex.collectAsState()
    val accent = CategoryColor.parse(accentHex)
    val extendedColors = LocalExtendedColors.current

    var hasEntered by remember { mutableStateOf(false) }
    val dataReady = state is SyntaxDetailUiState.Success
    LaunchedEffect(dataReady) {
        if (dataReady) hasEntered = true
    }

    Scaffold(
        topBar = {
            TopDock(
                title = title.ifEmpty { moduleId },
                showBack = true,
                onBack = onBack,
                onOpenDrawer = onOpenDrawer,
                onSyntax = {},
                onLearningPath = {},
                onSearch = {},
                showNavActions = false,
                showHome = true,
                onHome = onHome,
                accentHex = accentHex,
                themeQuickToggle = { ThemeQuickToggle(viewModel = viewModel()) }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            SyntaxSearchField(
                query = query,
                onQueryChange = { viewModel.updateQuery(it) }
            )

            Crossfade(
                targetState = state,
                animationSpec = tweenNormal(),
                label = "syntaxDetailStateCrossfade"
            ) { current ->
                when (current) {
                    is SyntaxDetailUiState.Loading -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    is SyntaxDetailUiState.Error -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = current.message,
                                color = extendedColors.fgSecondary
                            )
                        }
                    }
                    is SyntaxDetailUiState.Success -> {
                        val s = current
                        val filtered = remember(s.cards, query) {
                            val q = query.trim()
                            if (q.isEmpty()) s.cards
                            else s.cards.filter { card ->
                                card.name.contains(q, ignoreCase = true) ||
                                    card.formula.contains(q, ignoreCase = true) ||
                                    card.code.contains(q, ignoreCase = true) ||
                                    card.section.contains(q, ignoreCase = true)
                            }
                        }
                        val grouped = remember(filtered) {
                            filtered.groupBy { it.section.ifEmpty { "其他" } }
                        }

                        if (filtered.isEmpty()) {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "未找到匹配的语法点",
                                    color = extendedColors.fgSecondary
                                )
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                var runningIndex = 0
                                grouped.forEach { (section, cards) ->
                                    val headerIndex = runningIndex
                                    runningIndex += 1
                                    item(key = "section-$section") {
                                        SectionHeader(
                                            section = section,
                                            accent = accent,
                                            modifier = Modifier
                                                .animateItem()
                                                .fandexEntrance(
                                                    index = headerIndex,
                                                    visible = hasEntered
                                                )
                                        )
                                    }
                                    val cardStart = runningIndex
                                    runningIndex += cards.size
                                    items(cards.size, key = { cards[it].id.ifEmpty { "$section-$it" } }) { index ->
                                        SyntaxCardItem(
                                            card = cards[index],
                                            moduleId = moduleId,
                                            docSlug = s.docTitleToSlug[cards[index].docTitle],
                                            onDocClick = onDocClick,
                                            modifier = Modifier
                                                .animateItem()
                                                .fandexEntrance(
                                                    index = cardStart + index,
                                                    visible = hasEntered
                                                )
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SyntaxSearchField(
    query: String,
    onQueryChange: (String) -> Unit
) {
    val extendedColors = LocalExtendedColors.current
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()

    val borderColor by animateColorAsState(
        targetValue = if (focused) extendedColors.borderFocus else extendedColors.borderDefault,
        animationSpec = tween(durationMillis = 150),
        label = "syntaxSearchBorder"
    )

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(4.dp))
            .border(1.dp, borderColor, RoundedCornerShape(4.dp))
    ) {
        TextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier.fillMaxWidth(),
            interactionSource = interaction,
            placeholder = { Text("搜索语法点...") },
            leadingIcon = {
                Icon(
                    Icons.Outlined.Search,
                    contentDescription = null,
                    tint = extendedColors.fgTertiary
                )
            },
            singleLine = true,
            shape = RoundedCornerShape(4.dp),
            colors = TextFieldDefaults.colors(
                focusedContainerColor = extendedColors.bgSecondary,
                unfocusedContainerColor = extendedColors.bgSecondary,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
                disabledIndicatorColor = Color.Transparent,
                errorIndicatorColor = Color.Transparent
            )
        )
    }
}

@Composable
private fun SectionHeader(
    section: String,
    accent: Color,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(14.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(accent)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = section,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun SyntaxCardItem(
    card: SyntaxCard,
    moduleId: String,
    docSlug: String?,
    onDocClick: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    val extendedColors = LocalExtendedColors.current
    val clipboard = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(4.dp))
            .background(extendedColors.bgElevated)
            .border(1.dp, extendedColors.borderDefault, RoundedCornerShape(4.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(
            text = card.name,
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.SemiBold
        )

        if (card.formula.isNotEmpty()) {
            val scrollState = rememberScrollState()
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(4.dp))
                    .background(extendedColors.bgSunken)
                    .padding(8.dp)
            ) {
                Text(
                    text = card.formula,
                    style = CodeTextStyle,
                    color = extendedColors.codeText,
                    modifier = Modifier.horizontalScroll(scrollState)
                )
            }
        }

        if (card.code.isNotEmpty()) {
            val scrollState = rememberScrollState()
            val highlighted = rememberHighlightedCode(card.code, card.lang)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(4.dp))
                    .background(extendedColors.codeBg)
            ) {
                Text(
                    text = highlighted,
                    style = CodeTextStyle,
                    color = extendedColors.codeText,
                    modifier = Modifier
                        .padding(8.dp)
                        .horizontalScroll(scrollState)
                )
                FdxIconButton(
                    icon = if (copied) Icons.Filled.CheckCircle else Icons.Outlined.ContentCopy,
                    contentDescription = if (copied) "已复制" else "复制",
                    onClick = {
                        clipboard.setText(AnnotatedString(card.code))
                        copied = true
                    },
                    tint = if (copied) extendedColors.success else extendedColors.fgTertiary,
                    modifier = Modifier.align(Alignment.TopEnd)
                )
            }
        }

        if (docSlug != null) {
            Text(
                text = "查看文档：${card.docTitle}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.clickable { onDocClick(moduleId, docSlug) }
            )
        }
    }
}
