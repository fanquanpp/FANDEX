package com.fandex.app.ui.screens.search

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fandex.app.ui.common.fandexEntrance
import com.fandex.app.ui.common.tweenNormal
import com.fandex.app.ui.components.DocListItem
import com.fandex.app.ui.components.ThemeQuickToggle
import com.fandex.app.ui.components.TopDock
import com.fandex.app.ui.theme.LocalExtendedColors

private enum class SearchPhase { SEARCHING, EMPTY, CONTENT }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    onDocClick: (String, String) -> Unit,
    onBack: () -> Unit,
    onOpenDrawer: () -> Unit,
    onHome: () -> Unit = {},
    viewModel: SearchViewModel = viewModel()
) {
    val query by viewModel.query.collectAsState()
    val results by viewModel.results.collectAsState()
    val isSearching by viewModel.isSearching.collectAsState()
    val moduleTitles by viewModel.moduleTitles.collectAsState()
    val extendedColors = LocalExtendedColors.current

    var hasEntered by remember { mutableStateOf(false) }
    LaunchedEffect(results.isNotEmpty()) {
        if (results.isNotEmpty()) hasEntered = true
    }

    val phase = when {
        isSearching -> SearchPhase.SEARCHING
        results.isEmpty() && query.isNotEmpty() -> SearchPhase.EMPTY
        else -> SearchPhase.CONTENT
    }

    Scaffold(
        topBar = {
            TopDock(
                title = "搜索",
                showBack = true,
                onBack = onBack,
                onOpenDrawer = onOpenDrawer,
                onSyntax = {},
                onLearningPath = {},
                onSearch = {},
                showNavActions = false,
                showHome = true,
                onHome = onHome,
                themeQuickToggle = { ThemeQuickToggle(viewModel = viewModel()) }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            TextField(
                value = query,
                onValueChange = { viewModel.updateQuery(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                placeholder = { Text("输入关键词...") },
                leadingIcon = {
                    Icon(
                        Icons.Outlined.Search,
                        contentDescription = null,
                        tint = extendedColors.fgTertiary
                    )
                },
                singleLine = true,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = extendedColors.bgSecondary,
                    unfocusedContainerColor = extendedColors.bgSecondary
                )
            )

            Crossfade(
                targetState = phase,
                animationSpec = tweenNormal(),
                label = "searchPhaseCrossfade"
            ) { current ->
                when (current) {
                    SearchPhase.SEARCHING -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    SearchPhase.EMPTY -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "未找到相关文档",
                                color = extendedColors.fgSecondary
                            )
                        }
                    }
                    SearchPhase.CONTENT -> {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(bottom = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            itemsIndexed(
                                results,
                                key = { _, doc -> "${doc.module}/${doc.slug}" }
                            ) { index, doc ->
                                DocListItem(
                                    doc = doc,
                                    onClick = { onDocClick(doc.module, doc.slug) },
                                    moduleLabel = moduleTitles[doc.module],
                                    modifier = Modifier
                                        .animateItem()
                                        .fandexEntrance(index = index, visible = hasEntered)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
