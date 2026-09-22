package com.fandex.app.ui.screens.syntax

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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fandex.app.ui.common.fandexEntrance
import com.fandex.app.ui.common.pressScale
import com.fandex.app.ui.common.tweenNormal
import com.fandex.app.ui.components.CategoryColor
import com.fandex.app.ui.components.ModuleIcon
import com.fandex.app.ui.components.StatsBar
import com.fandex.app.ui.components.ThemeQuickToggle
import com.fandex.app.ui.components.TopDock
import com.fandex.app.ui.theme.LocalExtendedColors

@Composable
fun SyntaxScreen(
    onModuleClick: (String) -> Unit,
    onBack: () -> Unit,
    onOpenDrawer: () -> Unit,
    onHome: () -> Unit = {},
    viewModel: SyntaxViewModel = viewModel()
) {
    LaunchedEffect(Unit) {
        viewModel.load()
    }

    val index by viewModel.index.collectAsState()

    var hasEntered by remember { mutableStateOf(false) }
    val dataReady = index.languages.isNotEmpty()
    LaunchedEffect(dataReady) {
        if (dataReady) hasEntered = true
    }

    Scaffold(
        topBar = {
            TopDock(
                title = "语法速览",
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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Crossfade(
                targetState = dataReady,
                animationSpec = tweenNormal(),
                label = "syntaxStateCrossfade"
            ) { loaded ->
                if (!loaded) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else {
                    val languages = index.languages
                    val totalPoints = languages.sumOf { it.count }
                    val totalDocs = languages.sumOf { it.docCount }

                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        item(key = "stats") {
                            StatsBar(
                                stats = listOf(
                                    "${languages.size}" to "语言",
                                    "$totalPoints" to "语法点",
                                    "$totalDocs" to "文档"
                                ),
                                modifier = Modifier.fandexEntrance(index = 0, visible = hasEntered)
                            )
                        }
                        itemsIndexed(languages, key = { _, language -> language.id }) { position, language ->
                            SyntaxLanguageItem(
                                language = language,
                                position = position,
                                onClick = { onModuleClick(language.id) },
                                modifier = Modifier
                                    .animateItem()
                                    .fandexEntrance(index = position + 1, visible = hasEntered)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SyntaxLanguageItem(
    language: com.fandex.app.data.model.SyntaxLanguage,
    position: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val extendedColors = LocalExtendedColors.current
    val accent = CategoryColor.parse(language.color)
    val interaction = remember { MutableInteractionSource() }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .pressScale(interaction)
            .clip(RoundedCornerShape(4.dp))
            .background(extendedColors.bgElevated)
            .border(1.dp, extendedColors.borderDefault, RoundedCornerShape(4.dp))
            .clickable(interactionSource = interaction, indication = null, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "%02d".format(position + 1),
            style = MaterialTheme.typography.labelMedium,
            color = extendedColors.fgTertiary,
            fontFamily = FontFamily.Monospace
        )
        Spacer(modifier = Modifier.width(10.dp))

        ModuleIcon(
            label = language.icon.ifEmpty { language.title.take(2) },
            color = accent
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = language.title,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "语法速查",
                style = MaterialTheme.typography.bodySmall,
                color = extendedColors.fgSecondary
            )
        }

        Text(
            text = "${language.count} 语法点",
            style = MaterialTheme.typography.labelSmall,
            color = accent,
            modifier = Modifier
                .clip(RoundedCornerShape(4.dp))
                .background(accent.copy(alpha = 0.1f))
                .border(1.dp, accent.copy(alpha = 0.35f), RoundedCornerShape(4.dp))
                .padding(horizontal = 8.dp, vertical = 2.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = "${language.docCount} 篇",
            style = MaterialTheme.typography.labelSmall,
            color = extendedColors.fgTertiary,
            modifier = Modifier
                .clip(RoundedCornerShape(4.dp))
                .background(extendedColors.bgSunken)
                .padding(horizontal = 8.dp, vertical = 2.dp)
        )
    }
}
