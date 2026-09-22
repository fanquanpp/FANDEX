package com.fandex.app.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.BrightnessAuto
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TextDecrease
import androidx.compose.material.icons.filled.TextIncrease
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fandex.app.ui.common.FandexMotion
import com.fandex.app.ui.common.pressScale
import com.fandex.app.ui.common.selectionPulse
import com.fandex.app.ui.common.tweenFast
import com.fandex.app.ui.theme.LocalExtendedColors

const val REPO_URL = "https://github.com/fanquanpp/FANDEX"

@Composable
fun TopDock(
    title: String,
    showBack: Boolean,
    onBack: () -> Unit,
    onOpenDrawer: () -> Unit,
    onSyntax: () -> Unit,
    onLearningPath: () -> Unit,
    onSearch: () -> Unit,
    showNavActions: Boolean = true,
    showHome: Boolean = false,
    onHome: () -> Unit = {},
    accentHex: String? = null,
    themeQuickToggle: @Composable () -> Unit = {},
    pageActions: @Composable () -> Unit = {}
) {
    val extendedColors = LocalExtendedColors.current
    val accent = accentHex?.let { CategoryColor.parse(it) } ?: MaterialTheme.colorScheme.primary

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .statusBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AnimatedContent(
                targetState = showBack,
                transitionSpec = {
                    (fadeIn(tweenFast()) + scaleIn(initialScale = 0.8f, animationSpec = tweenFast())) togetherWith
                        (fadeOut(tweenFast()) + scaleOut(targetScale = 0.8f, animationSpec = tweenFast()))
                },
                label = "dockLeadingIcon"
            ) { back ->
                FdxIconButton(
                    icon = if (back) Icons.AutoMirrored.Filled.ArrowBack else Icons.Filled.Menu,
                    contentDescription = if (back) "返回" else "菜单",
                    onClick = if (back) onBack else onOpenDrawer
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(14.dp)
                    .background(accent)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )

            pageActions()

            Spacer(modifier = Modifier.width(8.dp))

            DockActionSegment(
                showNavActions = showNavActions,
                showHome = showHome,
                onSyntax = onSyntax,
                onLearningPath = onLearningPath,
                onSearch = onSearch,
                onHome = onHome,
                themeQuickToggle = themeQuickToggle
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(extendedColors.borderSubtle)
        )
    }
}

@Composable
private fun DockActionSegment(
    showNavActions: Boolean,
    showHome: Boolean,
    onSyntax: () -> Unit,
    onLearningPath: () -> Unit,
    onSearch: () -> Unit,
    onHome: () -> Unit,
    themeQuickToggle: @Composable () -> Unit
) {
    val extendedColors = LocalExtendedColors.current

    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(extendedColors.bgElevated)
            .border(1.dp, extendedColors.borderDefault, RoundedCornerShape(4.dp))
            .padding(horizontal = 4.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        var hasPrevious = false

        if (showNavActions) {
            DockSegmentItem(hasPrevious) { DockIcon(Icons.Filled.Code, "语法速览", onSyntax) }
            DockSegmentItem(true) { DockIcon(Icons.Filled.Explore, "学习路线", onLearningPath) }
            DockSegmentItem(true) { DockIcon(Icons.Filled.Search, "搜索", onSearch) }
            hasPrevious = true
        }

        if (showHome) {
            DockSegmentItem(hasPrevious) { DockIcon(Icons.Filled.Home, "首页", onHome) }
            hasPrevious = true
        }

            DockSegmentItem(hasPrevious) {
                val uriHandler = LocalUriHandler.current
                DockIcon(Icons.AutoMirrored.Filled.OpenInNew, "源仓库") {
                    runCatching { uriHandler.openUri(REPO_URL) }
                }
            }

        DockSegmentItem(true, content = themeQuickToggle)
    }
}

@Composable
private fun DockSegmentItem(
    withLeadingDivider: Boolean,
    content: @Composable () -> Unit
) {
    if (withLeadingDivider) {
        Box(
            modifier = Modifier
                .width(1.dp)
                .height(16.dp)
                .background(LocalExtendedColors.current.borderSubtle)
        )
    }
    content()
}

@Composable
private fun DockIcon(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    contentDescription: String,
    onClick: () -> Unit
) {
    FdxIconButton(
        icon = icon,
        contentDescription = contentDescription,
        onClick = onClick
    )
}

@Composable
fun FilterChip(
    label: String,
    selected: Boolean,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val extendedColors = LocalExtendedColors.current
    val interaction = remember { MutableInteractionSource() }

    val bg by animateColorAsState(
        targetValue = if (selected) color else extendedColors.bgElevated,
        animationSpec = tween(FandexMotion.DurationFast),
        label = "filterChipBg"
    )
    val fg by animateColorAsState(
        targetValue = if (selected) {
            if (color.isLightColor()) Color.White
            else Color(0xFF0A0A0A)
        } else extendedColors.fgSecondary,
        animationSpec = tween(FandexMotion.DurationFast),
        label = "filterChipFg"
    )
    val borderColor by animateColorAsState(
        targetValue = if (selected) color else extendedColors.borderDefault,
        animationSpec = tween(FandexMotion.DurationFast),
        label = "filterChipBorder"
    )

    Box(
        modifier = modifier
            .pressScale(interaction)
            .selectionPulse(selected)
            .clip(RoundedCornerShape(4.dp))
            .background(bg)
            .border(1.dp, borderColor, RoundedCornerShape(4.dp))
            .clickable(interactionSource = interaction, indication = null, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = fg,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium
        )
    }
}

private fun Color.isLightColor(): Boolean {
    val lum = 0.299 * red + 0.587 * green + 0.114 * blue
    return lum > 0.6
}

@Composable
fun ThemeQuickToggle(
    viewModel: com.fandex.app.MainViewModel
) {
    val mode by viewModel.themeMode.collectAsState()
    AnimatedContent(
        targetState = mode,
        transitionSpec = {
            (fadeIn(tweenFast()) + scaleIn(initialScale = 0.8f, animationSpec = tweenFast())) togetherWith
                (fadeOut(tweenFast()) + scaleOut(targetScale = 0.8f, animationSpec = tweenFast()))
        },
        label = "themeToggleIcon"
    ) { current ->
        FdxIconButton(
            icon = when (current) {
                com.fandex.app.data.prefs.ThemeMode.SYSTEM -> Icons.Filled.BrightnessAuto
                com.fandex.app.data.prefs.ThemeMode.LIGHT -> Icons.Filled.LightMode
                com.fandex.app.data.prefs.ThemeMode.DARK -> Icons.Filled.DarkMode
            },
            contentDescription = "切换主题",
            onClick = { viewModel.cycleThemeMode() }
        )
    }
}

@Composable
fun FontScaleControls(
    viewModel: com.fandex.app.MainViewModel
) {
    val scale by viewModel.fontScale.collectAsState()
    FdxIconButton(
        icon = Icons.Filled.TextDecrease,
        contentDescription = "减小字号",
        onClick = { viewModel.decreaseFontScale() },
        enabled = scale > com.fandex.app.data.prefs.ThemePreferences.MIN_FONT_SCALE
    )
    FdxIconButton(
        icon = Icons.Filled.TextIncrease,
        contentDescription = "增大字号",
        onClick = { viewModel.increaseFontScale() },
        enabled = scale < com.fandex.app.data.prefs.ThemePreferences.MAX_FONT_SCALE
    )
}
