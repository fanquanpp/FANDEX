package com.fandex.app.ui.drawer

import android.app.Application
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fandex.app.BuildConfig
import com.fandex.app.FandexApp
import com.fandex.app.data.model.CategoryInfo
import com.fandex.app.data.prefs.ThemeMode
import com.fandex.app.data.prefs.ThemePreferences
import com.fandex.app.ui.common.pressScale
import com.fandex.app.ui.components.CategoryColor
import com.fandex.app.ui.theme.LocalExtendedColors
import com.fandex.app.update.CheckState
import com.fandex.app.update.UpdateSettingsItem
import com.fandex.app.update.UpdateViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

/**
 * 抽屉 ViewModel
 *
 * 提供抽屉所需的站点统计、分类模块导航数据与主题控制
 * （设置收纳进抽屉，参考旧版 FANDEX-App 的抽屉面板设计）
 */
class DrawerViewModel(application: Application) : AndroidViewModel(application) {

    private val container = (application as FandexApp).container

    /** 分类模块数据 */
    private val _categories = MutableStateFlow<List<CategoryInfo>>(emptyList())
    val categories: StateFlow<List<CategoryInfo>> = _categories.asStateFlow()

    /** 站点统计 */
    private val _stats = MutableStateFlow(DrawerStats())
    val stats: StateFlow<DrawerStats> = _stats.asStateFlow()

    /** 模块文档计数（模块导航行展示） */
    private val _moduleCounts = MutableStateFlow<Map<String, Int>>(emptyMap())
    val moduleCounts: StateFlow<Map<String, Int>> = _moduleCounts.asStateFlow()

    val themeMode: StateFlow<ThemeMode> = container.themePreferences.themeMode
        .stateIn(viewModelScope, SharingStarted.Eagerly, ThemeMode.SYSTEM)

    /** 全局字号缩放倍率（0.8-1.4，默认 1.0） */
    val fontScale: StateFlow<Float> = container.themePreferences.fontScale
        .stateIn(viewModelScope, SharingStarted.Eagerly, ThemePreferences.DEFAULT_FONT_SCALE)

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            runCatching {
                _categories.value = container.moduleRepository.categories()
                val docStats = container.docRepository.stats()
                _stats.value = DrawerStats(
                    categoryCount = _categories.value.size,
                    moduleCount = docStats.moduleCount,
                    docCount = docStats.docCount
                )
                // 各模块文档计数
                _moduleCounts.value = container.docRepository.docIndex()
                    .groupingBy { it.module }.eachCount()
            }
        }
    }

    fun setThemeMode(mode: ThemeMode) {
        viewModelScope.launch { container.themePreferences.setThemeMode(mode) }
    }

    /** 写入全局字号缩放（自动收敛到 0.8-1.4 区间） */
    fun setFontScale(scale: Float) {
        viewModelScope.launch { container.themePreferences.setFontScale(scale) }
    }
}

/** 抽屉统计信息 */
data class DrawerStats(
    val categoryCount: Int = 0,
    val moduleCount: Int = 0,
    val docCount: Int = 0
)

/** 抽屉导航项 */
private data class DrawerNav(
    val icon: ImageVector,
    val label: String,
    val route: String
)

/**
 * 应用抽屉面板
 *
 * 功能布局参考旧版 FANDEX-App 抽屉，采用固定分区结构：
 * - 固定顶部：品牌头部 + 快捷导航 + 主题三选（不随内容滚动）
 * - 滚动区域：模块快速导航（多彩分类分组 + 计数）
 * - 固定底部：免责声明
 */
@Composable
fun AppDrawer(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    onModuleClick: (String) -> Unit,
    viewModel: DrawerViewModel = viewModel(),
    updateViewModel: UpdateViewModel = viewModel()
) {
    val extendedColors = LocalExtendedColors.current
    val categories by viewModel.categories.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val moduleCounts by viewModel.moduleCounts.collectAsState()
    val themeMode by viewModel.themeMode.collectAsState()
    val fontScale by viewModel.fontScale.collectAsState()
    val autoCheckEnabled by updateViewModel.autoCheckEnabled.collectAsState()
    val ignoredVersion by updateViewModel.ignoredVersion.collectAsState()
    val checkState by updateViewModel.checkState.collectAsState()

    val navItems = listOf(
        DrawerNav(Icons.Filled.Home, "首页", com.fandex.app.ui.navigation.Routes.HOME),
        DrawerNav(Icons.Filled.Code, "语法速览", com.fandex.app.ui.navigation.Routes.SYNTAX),
        DrawerNav(Icons.Filled.Explore, "学习路线", com.fandex.app.ui.navigation.Routes.LEARNING_PATH),
        DrawerNav(Icons.Filled.Search, "搜索", com.fandex.app.ui.navigation.Routes.SEARCH)
    )

    Column(modifier = Modifier.fillMaxWidth()) {
        // ---------------------------------------------------------------
        // 固定顶部：品牌头部
        // ---------------------------------------------------------------
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = "FANDEX",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.ExtraBold
            )
            Text(
                text = "全栈知识速查体系",
                style = MaterialTheme.typography.bodySmall,
                color = extendedColors.fgSecondary
            )
            Text(
                text = "v${BuildConfig.VERSION_NAME} · fanquanpp",
                style = MaterialTheme.typography.labelSmall,
                color = extendedColors.fgTertiary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                DrawerStat("${stats.categoryCount}", "分类")
                DrawerStatDivider()
                DrawerStat("${stats.moduleCount}", "模块")
                DrawerStatDivider()
                DrawerStat("${stats.docCount}", "文档")
            }
        }

        // 品牌头部与固定分区之间的 1dp 分割线：增强分区层次
        HorizontalDivider(color = extendedColors.borderSubtle)

        // ---------------------------------------------------------------
        // 固定顶部：快捷导航（当前路由高亮，选中底色平滑过渡）
        // ---------------------------------------------------------------
        navItems.forEach { item ->
            val selected = currentRoute == item.route ||
                (item.route != com.fandex.app.ui.navigation.Routes.HOME &&
                    currentRoute.startsWith(item.route))
            // 选中态背景色 180ms 平滑过渡
            val itemBackground by animateColorAsState(
                targetValue = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
                else Color.Transparent,
                animationSpec = tween(durationMillis = 180),
                label = "drawerNavBg"
            )
            // 图标与文字颜色随选中态过渡
            val itemTint by animateColorAsState(
                targetValue = if (selected) MaterialTheme.colorScheme.primary
                else extendedColors.fgSecondary,
                animationSpec = tween(durationMillis = 180),
                label = "drawerNavTint"
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigate(item.route) }
                    .background(itemBackground)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = item.icon,
                    contentDescription = null,
                    tint = itemTint
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = item.label,
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (selected) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurface,
                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
        HorizontalDivider(color = extendedColors.borderSubtle)

        // ---------------------------------------------------------------
        // 固定顶部：主题三选（紧凑分段）
        // ---------------------------------------------------------------
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            listOf(
                ThemeMode.SYSTEM to "系统",
                ThemeMode.LIGHT to "浅色",
                ThemeMode.DARK to "深色"
            ).forEach { (mode, label) ->
                val selected = themeMode == mode
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(4.dp))
                        .background(
                            if (selected) MaterialTheme.colorScheme.primary
                            else extendedColors.bgElevated
                        )
                        .border(
                            1.dp,
                            if (selected) MaterialTheme.colorScheme.primary
                            else extendedColors.borderDefault,
                            RoundedCornerShape(4.dp)
                        )
                        .clickable { viewModel.setThemeMode(mode) }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelLarge,
                        color = if (selected) {
                            if (MaterialTheme.colorScheme.primary.isLightDrawer()) Color(0xFF0A0A0A)
                            else Color.White
                        } else extendedColors.fgSecondary
                    )
                }
            }
        }

        HorizontalDivider(color = extendedColors.borderSubtle)

        // ---------------------------------------------------------------
        // 固定顶部：设置区（字号缩放 + 更新自检）
        // ---------------------------------------------------------------
        DrawerSectionTitle("显示设置")

        // 全局字号缩放：0.8-1.4，步长 0.1 共 7 档（移植自旧端 fontSizeScale 交互）
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "字号缩放",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "%.1fx".format(fontScale),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Medium
                )
            }
            Slider(
                value = fontScale,
                onValueChange = { newValue ->
                    // 步长 0.1，量化到 0.8/0.9/1.0/1.1/1.2/1.3/1.4
                    val stepped = (newValue * 10).roundToInt() / 10f
                    viewModel.setFontScale(stepped.coerceIn(0.8f, 1.4f))
                },
                valueRange = 0.8f..1.4f,
                steps = 5, // 7 档 = 6 区间 = 5 个步长分隔点
                modifier = Modifier.fillMaxWidth()
            )
        }

        HorizontalDivider(color = extendedColors.borderSubtle)

        DrawerSectionTitle("应用更新")

        // 自动检查更新开关：开启时每日后台静默检查一次
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "自动检查更新",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "每日联网时后台静默检查一次新版本",
                    style = MaterialTheme.typography.labelSmall,
                    color = extendedColors.fgTertiary,
                    maxLines = 2
                )
            }
            Switch(
                checked = autoCheckEnabled,
                onCheckedChange = { updateViewModel.setAutoCheckEnabled(it) },
                colors = SwitchDefaults.colors(
                    checkedTrackColor = MaterialTheme.colorScheme.primary
                )
            )
        }

        // 手动检查更新：检查中展示加载指示，结果通过 hint 文字反馈
        UpdateSettingsItem(
            onClick = { updateViewModel.checkForUpdate(manual = true) },
            isChecking = checkState is CheckState.Checking,
            hint = updateHintOf(checkState, autoCheckEnabled)
        )

        // 忽略版本：存在被忽略版本时展示，可一键恢复提醒
        if (ignoredVersion.isNotBlank()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "已忽略版本 v$ignoredVersion",
                    style = MaterialTheme.typography.labelSmall,
                    color = extendedColors.fgTertiary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "恢复提醒",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .clickable { updateViewModel.clearIgnoredVersion() }
                        .padding(horizontal = 8.dp, vertical = 6.dp)
                )
            }
        }

        HorizontalDivider(color = extendedColors.borderSubtle)

        // ---------------------------------------------------------------
        // 滚动区域：模块快速导航（多彩分类）
        // ---------------------------------------------------------------
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
        ) {
            DrawerSectionTitle("模块导航")
            categories.forEach { category ->
                val color = CategoryColor.parse(category.colorHex)
                // 分类小节标题
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .width(3.dp)
                            .height(12.dp)
                            .clip(RoundedCornerShape(1.dp))
                            .background(color)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = category.label,
                        style = MaterialTheme.typography.labelLarge,
                        color = extendedColors.fgSecondary,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                // 模块行（点击直达模块页，带分类内序号与计数）
                category.modules.forEachIndexed { index, module ->
                    val interaction = remember { MutableInteractionSource() }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .pressScale(interaction)
                            .clickable(
                                interactionSource = interaction,
                                indication = null
                            ) { onModuleClick(module.id) }
                            .padding(horizontal = 24.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "%02d".format(index + 1),
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 10.sp,
                            color = color.copy(alpha = 0.85f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .width(3.dp)
                                .height(16.dp)
                                .clip(RoundedCornerShape(1.dp))
                                .background(color)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = module.title,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            modifier = Modifier.weight(1f)
                        )
                        moduleCounts[module.id]?.let { count ->
                            Text(
                                text = "$count",
                                style = MaterialTheme.typography.labelSmall,
                                color = extendedColors.fgTertiary
                            )
                        }
                    }
                }
            }
        }

        // ---------------------------------------------------------------
        // 固定底部：免责声明
        // ---------------------------------------------------------------
        HorizontalDivider(color = extendedColors.borderSubtle)
        Text(
            text = "内容由人工与 AI 共同编写，请结合官方文档独立验证",
            style = MaterialTheme.typography.labelSmall,
            color = extendedColors.fgTertiary,
            modifier = Modifier.padding(16.dp)
        )
    }
}

/**
 * 检查更新结果提示文字
 *
 * 依据检查状态机给出一条简要反馈（Idle / Checking 时不提示）
 */
private fun updateHintOf(state: CheckState, autoCheckEnabled: Boolean): String = when (state) {
    is CheckState.UpToDate -> "当前已是最新版本"
    is CheckState.Failed -> state.message
    is CheckState.Available -> "发现新版本，可在页面顶部下载"
    else -> if (autoCheckEnabled) "每日联网时自动检查" else "自动检查已关闭"
}

/** 抽屉分区标题 */
@Composable
private fun DrawerSectionTitle(title: String) {    Row(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(12.dp)
                .clip(RoundedCornerShape(1.dp))
                .background(MaterialTheme.colorScheme.primary)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.labelLarge,
            color = LocalExtendedColors.current.fgTertiary,
            fontWeight = FontWeight.SemiBold
        )
    }
}

/** 抽屉统计项 */
@Composable
private fun DrawerStat(value: String, label: String) {
    val extendedColors = LocalExtendedColors.current
    Row(verticalAlignment = Alignment.Bottom) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.width(2.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = extendedColors.fgTertiary
        )
    }
}

/** 统计项分割竖线 */
@Composable
private fun DrawerStatDivider() {
    Box(
        modifier = Modifier
            .padding(horizontal = 12.dp)
            .width(1.dp)
            .height(14.dp)
            .background(LocalExtendedColors.current.borderSubtle)
    )
}

/** Color 亮度粗判 */
private fun Color.isLightDrawer(): Boolean {
    val lum = 0.299 * red + 0.587 * green + 0.114 * blue
    return lum > 0.6
}
