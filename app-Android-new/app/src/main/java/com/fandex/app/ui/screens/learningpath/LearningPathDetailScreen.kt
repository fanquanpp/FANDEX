package com.fandex.app.ui.screens.learningpath

import com.fandex.app.ui.components.CategoryColor
import androidx.compose.animation.Crossfade
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fandex.app.data.model.LearningPathStage
import com.fandex.app.ui.common.fandexEntrance
import com.fandex.app.ui.common.tweenNormal
import com.fandex.app.ui.components.DifficultyBadge
import com.fandex.app.ui.components.ThemeQuickToggle
import com.fandex.app.ui.components.TopDock
import com.fandex.app.ui.theme.LocalExtendedColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LearningPathDetailScreen(
    moduleId: String,
    onBack: () -> Unit,
    onDocClick: (String, String) -> Unit,
    onOpenDrawer: () -> Unit,
    onHome: () -> Unit = {},
    viewModel: LearningPathDetailViewModel = viewModel()
) {
    LaunchedEffect(moduleId) {
        viewModel.loadPath(moduleId)
    }

    val state by viewModel.state.collectAsState()
    val title by viewModel.title.collectAsState()
    val accentHex by viewModel.accentHex.collectAsState()
    val accent = CategoryColor.parse(accentHex)

    var hasEntered by remember { mutableStateOf(false) }
    val dataReady = state is LearningPathDetailUiState.Success
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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Crossfade(
                targetState = state,
                animationSpec = tweenNormal(),
                label = "pathDetailStateCrossfade"
            ) { current ->
                when (current) {
                    is LearningPathDetailUiState.Loading -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    is LearningPathDetailUiState.Error -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = current.message,
                                color = LocalExtendedColors.current.fgSecondary
                            )
                        }
                    }
                    is LearningPathDetailUiState.Success -> {
                        val path = current.path
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            if (path.summary.isNotEmpty()) {
                                item(key = "summary") {
                                    Text(
                                        text = path.summary,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = LocalExtendedColors.current.fgSecondary,
                                        modifier = Modifier
                                            .animateItem()
                                            .fandexEntrance(index = 0, visible = hasEntered)
                                    )
                                }
                            }
                            itemsIndexed(
                                path.stages,
                                key = { _, stage -> stage.id.ifEmpty { stage.title } }
                            ) { index, stage ->
                                StageItem(
                                    moduleId = path.module,
                                    stage = stage,
                                    accent = accent,
                                    onDocClick = onDocClick,
                                    modifier = Modifier
                                        .animateItem()
                                        .fandexEntrance(index = index + 1, visible = hasEntered)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StageItem(
    moduleId: String,
    stage: LearningPathStage,
    accent: androidx.compose.ui.graphics.Color,
    onDocClick: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    val extendedColors = LocalExtendedColors.current

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(4.dp))
            .background(extendedColors.bgElevated)
            .border(1.dp, extendedColors.borderDefault, RoundedCornerShape(4.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = stage.title,
            style = MaterialTheme.typography.titleMedium,
            color = accent,
            fontWeight = FontWeight.SemiBold
        )
        if (stage.subtitle.isNotEmpty()) {
            Text(
                text = stage.subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = extendedColors.fgSecondary
            )
        }
        stage.nodes.forEach { node ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = node.doc.isNotEmpty()) {
                        onDocClick(moduleId, node.doc)
                    }
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .width(3.dp)
                        .height(28.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(accent.copy(alpha = 0.7f))
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = node.title,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (node.desc.isNotEmpty()) {
                        Text(
                            text = node.desc,
                            style = MaterialTheme.typography.bodySmall,
                            color = extendedColors.fgTertiary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                if (node.doc.isNotEmpty()) {
                    Spacer(modifier = Modifier.width(8.dp))
                    DifficultyBadge(difficulty = node.difficulty)
                }
            }
        }
    }
}
