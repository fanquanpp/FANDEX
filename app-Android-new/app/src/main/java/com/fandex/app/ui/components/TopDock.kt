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

/** 源仓库地址（GitHub 按钮跳转目标） */
const val REPO_URL = "https://github.com/fanquanpp/FANDEX"

/**
 * 全局顶部功能 Dock
 *
 * 层次设计（体现"按钮有距离感，不与页面同纸"）：
 * - 整体为 surface 底 + 底部 1dp borderSubtle 分割线，与页面内容明确分层
 * - 右侧动作区收进一个"分段容器"：bgElevated 底 + 1dp borderDefault 边框 + 4dp 直角小圆角，
 *   图标按钮之间以 1dp x 16dp borderSubtle 竖条分隔，形成工具条层次
 * - 左侧标题前以 3dp x 14dp 模块色竖条装饰（传入 accentHex 时用模块色，否则用 primary）
 * - 返回 / 菜单图标与主题三态图标切换均带 fade + scale 过渡动效
 *
 * 参考旧版 FANDEX-App 顶栏设计：多页面通用功能常驻
 * - 左侧：抽屉菜单（首页）/ 返回（详情页）
 * - 中部：页面标题（首页为品牌名）
 * - 右侧：页面专属按钮 + 常驻功能按钮（语法速览 / 学习路线 / 搜索 / 首页 / 源仓库 / 主题快切）
 *
 * 图标统一取自共享 Material 图标集与 modules.json 元数据，不单独造图标
 */
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
    // 标题竖条装饰色：优先模块分类色，缺省回退 primary
    val accent = accentHex?.let { CategoryColor.parse(it) } ?: MaterialTheme.colorScheme.primary

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            // 状态栏内边距：自定义 Dock 需自行处理（M3 TopAppBar 默认自带）
            .statusBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 左侧：抽屉 / 返回（图标切换带 fade + scale 过渡）
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

            // 标题区：模块色竖条装饰 + 标题
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

            // 页面专属按钮（目录 / 分享等）：独立于右侧全局工具条
            pageActions()

            Spacer(modifier = Modifier.width(8.dp))

            // 常驻功能分段容器：层次感的核心载体
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

        // 底部 1dp 分割线：Dock 与页面内容的分界
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(extendedColors.borderSubtle)
        )
    }
}

/**
 * 右侧常驻功能分段容器
 *
 * bgElevated 底 + 1dp borderDefault 边框 + 4dp 直角小圆角；
 * 相邻图标按钮之间插入 1dp x 16dp borderSubtle 竖条分隔，
 * 形成一整条"工具条"而非散落按钮（层次感距离感的核心交付）
 */
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

        // 常驻导航：语法速览 / 学习路线 / 搜索（详情页收起以保标题空间）
        if (showNavActions) {
            DockSegmentItem(hasPrevious) { DockIcon(Icons.Filled.Code, "语法速览", onSyntax) }
            DockSegmentItem(true) { DockIcon(Icons.Filled.Explore, "学习路线", onLearningPath) }
            DockSegmentItem(true) { DockIcon(Icons.Filled.Search, "搜索", onSearch) }
            hasPrevious = true
        }

        // 首页（非首页时显示，一键回主页）
        if (showHome) {
            DockSegmentItem(hasPrevious) { DockIcon(Icons.Filled.Home, "首页", onHome) }
            hasPrevious = true
        }

        // 源仓库（浏览器打开 GitHub 仓库）
            DockSegmentItem(hasPrevious) {
                val uriHandler = LocalUriHandler.current
                DockIcon(Icons.AutoMirrored.Filled.OpenInNew, "源仓库") {
                    runCatching { uriHandler.openUri(REPO_URL) }
                }
            }

        // 主题快切（全页面常驻；当前所有调用方均传入非空内容）
        DockSegmentItem(true, content = themeQuickToggle)
    }
}

/**
 * 分段容器内的条目：非首个条目前插入 1dp x 16dp 竖条分隔
 */
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

/**
 * Dock 图标按钮（统一走 FdxIconButton，20dp 图标 + 按压缩放）
 */
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

/**
 * 分类筛选 Chip（参考旧版首页筛选行）
 *
 * 选中态：分类色填充 + 反色文字；未选中：边框 + 次级文字
 * 底色 / 边框 / 文字色随选中态平滑过渡，选中瞬间叠加弹性缩放脉冲
 */
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

    // 选中 / 未选中三态颜色平滑过渡
    val bg by animateColorAsState(
        targetValue = if (selected) color else extendedColors.bgElevated,
        animationSpec = tween(FandexMotion.DurationFast),
        label = "filterChipBg"
    )
    val fg by animateColorAsState(
        targetValue = if (selected) {
            // 依据背景亮度选择可读文字色
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

/** 亮度粗判（>0.6 视为浅色背景，用深色文字） */
private fun Color.isLightColor(): Boolean {
    val lum = 0.299 * red + 0.587 * green + 0.114 * blue
    return lum > 0.6
}

/**
 * 主题快切按钮
 *
 * 参考旧版顶栏主题按钮：跟随系统 -> 浅色 -> 深色 循环
 * 图标随当前模式以 fade + scale 过渡切换（共享 Material 图标集）
 */
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

/**
 * 字号缩放控件（文档页顶栏）
 *
 * 移植自旧端文章页顶栏的字号增减交互：步进 0.1，范围 0.8-1.4；
 * 到达边界时对应按钮置灰。缩放全局生效（FandexTheme 覆盖 LocalDensity）
 */
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
