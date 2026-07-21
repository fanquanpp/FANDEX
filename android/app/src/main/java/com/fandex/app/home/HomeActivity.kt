package com.fandex.app.home

import android.util.Log
import com.fandex.app.BuildConfig
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.TextDecrease
import androidx.compose.material.icons.filled.TextIncrease
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.fandex.app.data.ContentIndex
import com.fandex.app.data.ContentLoader
import com.fandex.app.data.DataStoreManager
import com.fandex.app.data.Document
import com.fandex.app.data.MarkdownContent
import com.fandex.app.data.Strings
import com.fandex.app.navigation.Screen
import com.fandex.app.ui.components.CategoryColorParser
import com.fandex.app.ui.components.LocalStrings
import com.fandex.app.ui.components.SidebarContent
import com.fandex.app.ui.enhancements.combinedTransitions
import com.fandex.app.ui.enhancements.defaultPageTransitions
import com.fandex.app.ui.enhancements.verticalSlideTransitions
import com.fandex.app.ui.theme.FANDEXTheme
import com.fandex.app.update.CheckState
import com.fandex.app.update.DownloadState
import com.fandex.app.update.UpdateDownloadProgressCard
import com.fandex.app.update.UpdateSettingsItem
import com.fandex.app.update.UpdateToastCard
import com.fandex.app.update.UpdateViewModel
import com.fandex.app.util.closeAndNavigate
import java.net.URLDecoder
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

/** 文件级日志 TAG，供 HomeActivity 类与顶层 FANDEXApp 函数统一使用 */
private const val TAG = "HomeActivity"

/**
 * 首页 Activity
 *
 * 功能：应用主入口，管理 Navigation Compose 路由、侧边栏、主题/字体设置持久化
 * 输入：无
 * 输出：完整的导航框架，包含首页、模块、文章三个路由及侧边栏导航
 * 流程：onCreate -> 设置 Compose 内容 -> 从 DataStore 读取偏好 -> 渲染侧边栏和路由
 */
class HomeActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val context = LocalContext.current

            /* 从 DataStore 读取深色模式偏好，默认 true */
            val isDarkMode by DataStoreManager.getDarkMode(context)
                .collectAsState(initial = true)

            /* 从 DataStore 读取字体缩放偏好，默认 1.0 */
            val fontSizeScale by DataStoreManager.getFontSizeScale(context)
                .collectAsState(initial = 1.0f)

            /* 从 DataStore 读取启动页开关偏好，默认 true */
            val isSplashEnabled by DataStoreManager.getSplashEnabled(context)
                .collectAsState(initial = true)

            /* 从 DataStore 读取动态背景开关，默认 true */
            val dynamicBackground by DataStoreManager.getDynamicBackground(context)
                .collectAsState(initial = true)

            /* 从 DataStore 读取自动检查更新开关，默认 true */
            val autoCheckUpdate by DataStoreManager.getAutoCheckUpdate(context)
                .collectAsState(initial = true)

            /* 协程作用域，用于 DataStore 写入操作 */
            val scope = rememberCoroutineScope()

            FANDEXTheme(darkTheme = isDarkMode, fontSizeScale = fontSizeScale) {
                /* 获取简体中文字符串集合并注入 CompositionLocal，供 Compose 树任意子组件读取 */
                val strings = Strings.default

                /* 创建 UpdateViewModel 实例，承载更新自检状态机 */
                val updateViewModel: UpdateViewModel = viewModel()

                /* 启动后 5s 触发静默检查更新（仅当 autoCheckUpdate=true 时才会实际发起请求） */
                LaunchedEffect(Unit) {
                    try {
                        delay(5000)
                        updateViewModel.checkForUpdate(manual = false)
                    } catch (e: Exception) { Log.w(TAG, "启动后静默检查更新失败: ${e.message}", e) }
                }

                CompositionLocalProvider(LocalStrings provides strings) {
                    FANDEXApp(
                        isDarkMode = isDarkMode,
                        onToggleTheme = {
                            /* 切换深色模式并持久化 */
                            scope.launch {
                                try {
                                    DataStoreManager.saveDarkMode(context, !isDarkMode)
                                } catch (e: Exception) { Log.w(TAG, "持久化深色模式开关失败: ${e.message}", e) }
                            }
                        },
                        fontSizeScale = fontSizeScale,
                        onFontSizeChange = { newScale ->
                            /* 字体缩放变更并持久化 */
                            scope.launch {
                                try {
                                    DataStoreManager.saveFontSizeScale(context, newScale)
                                } catch (e: Exception) { Log.w(TAG, "持久化字体缩放失败: ${e.message}", e) }
                            }
                        },
                        isSplashEnabled = isSplashEnabled,
                        onSplashToggle = { enabled ->
                            /* 启动页开关变更并持久化 */
                            scope.launch {
                                try {
                                    DataStoreManager.saveSplashEnabled(context, enabled)
                                } catch (e: Exception) { Log.w(TAG, "持久化启动页开关失败: ${e.message}", e) }
                            }
                        },
                        dynamicBackground = dynamicBackground,
                        onDynamicBackgroundToggle = { enabled ->
                            /* 动态背景开关变更并持久化 */
                            scope.launch {
                                try {
                                    DataStoreManager.saveDynamicBackground(context, enabled)
                                } catch (e: Exception) { Log.w(TAG, "持久化动态背景开关失败: ${e.message}", e) }
                            }
                        },
                        autoCheckUpdate = autoCheckUpdate,
                        onAutoCheckUpdateToggle = { enabled ->
                            /* 自动检查更新开关变更并持久化 */
                            scope.launch {
                                try {
                                    DataStoreManager.saveAutoCheckUpdate(context, enabled)
                                } catch (e: Exception) { Log.w(TAG, "持久化自动检查更新开关失败: ${e.message}", e) }
                            }
                        },
                        updateViewModel = updateViewModel
                    )
                }
            }
        }
    }
}

/**
 * FANDEX 应用主框架
 *
 * 功能：管理侧边栏、顶部导航栏、NavHost 路由、主题/字体设置
 * 输入：isDarkMode、onToggleTheme、fontSizeScale、onFontSizeChange
 * 输出：侧边栏 + 统一顶部导航栏 + 页面路由容器
 * 流程：初始化导航控制器 -> 判断当前路由 -> 渲染侧边栏/顶部栏 -> 路由分发
 *
 * 设计变更：
 * - 移除底部导航栏，所有功能按钮整合到顶部导航栏
 * - 侧边栏根据当前路由显示不同内容
 * - 文章阅读页全屏显示，仅保留紧凑顶部栏和底部翻页栏
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FANDEXApp(
    isDarkMode: Boolean = true,
    onToggleTheme: () -> Unit = {},
    fontSizeScale: Float = 1.0f,
    onFontSizeChange: (Float) -> Unit = {},
    isSplashEnabled: Boolean = true,
    onSplashToggle: (Boolean) -> Unit = {},
    /* 动态背景开关：传递到侧边栏供用户配置，后续可联动背景装饰系统 */
    dynamicBackground: Boolean = true,
    onDynamicBackgroundToggle: (Boolean) -> Unit = {},
    /* 自动检查更新开关：传递到侧边栏供用户配置，UpdateViewModel 内部也会读取 */
    autoCheckUpdate: Boolean = true,
    onAutoCheckUpdateToggle: (Boolean) -> Unit = {},
    /* 更新自检 ViewModel：驱动 UpdateToastCard 与 UpdateDownloadProgressCard 浮层 */
    updateViewModel: UpdateViewModel? = null
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val strings = Strings.default
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    /* 订阅 UpdateViewModel 状态：用于驱动 UpdateToastCard / UpdateDownloadProgressCard 浮层
       与侧边栏"正在检查"指示器；updateViewModel 为 null 时使用 Idle 兜底，保证预览模式可用。
       注意：collectAsState 必须无条件调用（Compose 规则），因此先用统一类型 StateFlow 接收，
       再订阅，避免条件分支违反 Compose 调用约定 */
    val checkStateFlow = updateViewModel?.checkState
        ?: remember { kotlinx.coroutines.flow.MutableStateFlow(CheckState.Idle) }
    val checkState by checkStateFlow.collectAsState()

    val downloadStateFlow = updateViewModel?.downloadState
        ?: remember { kotlinx.coroutines.flow.MutableStateFlow(DownloadState.Idle) }
    val downloadState by downloadStateFlow.collectAsState()

    /* 分类筛选状态（提升至 FANDEXApp 层级，导航返回时保持选中状态） */
    var selectedCategory by remember { mutableStateOf<String?>(null) }

    /* 侧边栏状态 */
    val drawerState = rememberDrawerState(DrawerValue.Closed)

    /* 判断当前路由类型 */
    val isArticleRoute = currentRoute != null && currentRoute.startsWith("article/")
    val isModuleRoute = currentRoute != null && currentRoute.startsWith("module/")
    val isHomeRoute = currentRoute == Screen.Home.route

    /* 加载内容索引用于侧边栏 */
    var contentIndex by remember { mutableStateOf<ContentIndex?>(null) }
    LaunchedEffect(Unit) {
        /* ContentLoader.loadIndex 内部已通过 withContext(Dispatchers.IO) 切换至 IO 调度器，避免阻塞主线程 */
        contentIndex = ContentLoader.loadIndex(context)
    }

    /* 文章页获取当前模块 ID，用于侧边栏文档列表 */
    val currentModuleId = if (isArticleRoute) {
        navBackStackEntry?.arguments?.getString("moduleId") ?: ""
    } else if (isModuleRoute) {
        navBackStackEntry?.arguments?.getString("moduleId") ?: ""
    } else ""

    /* 文章页获取当前文档 slug，用于侧边栏高亮当前文档 */
    val currentSlug = if (isArticleRoute) {
        navBackStackEntry?.arguments?.getString("slug") ?: null
    } else null

    /* 打开侧边栏的统一方法 */
    val openDrawer: () -> Unit = {
        scope.launch {
            try { drawerState.open() } catch (e: Exception) { Log.w(TAG, "打开侧边栏抽屉失败: ${e.message}", e) }
        }
    }

    /* 使用 Box 包裹 ModalNavigationDrawer，便于在最上层叠加更新提示浮层，
       Toast 卡片不占用布局空间，不阻挡用户与底层内容的交互 */
    Box(modifier = Modifier.fillMaxSize()) {
        ModalNavigationDrawer(
            drawerState = drawerState,
            drawerContent = {
                ModalDrawerSheet(
                    drawerShape = RoundedCornerShape(topEnd = 0.dp, bottomEnd = 0.dp),
                    modifier = Modifier.width(280.dp)
                ) {
                    /* 根据当前路由显示不同侧边栏内容 */
                    when {
                    isArticleRoute -> SidebarContent(
                        contentIndex = contentIndex,
                        currentModuleId = currentModuleId,
                        strings = strings,
                        onDocumentClick = { mod, slug, title ->
                            drawerState.closeAndNavigate(scope) {
                                navController.navigate(Screen.Article.createRoute(mod, slug, title)) {
                                    popUpTo(Screen.Article.route) { inclusive = true }
                                    launchSingleTop = true
                                }
                            }
                        },
                        onNavigateHome = {
                            drawerState.closeAndNavigate(scope) {
                                navController.navigate(Screen.Home.route) {
                                    popUpTo(Screen.Home.route) { inclusive = true }
                                    launchSingleTop = true
                                }
                            }
                        },
                        highlightCurrent = true,
                        currentSlug = currentSlug
                    )
                    isModuleRoute -> SidebarContent(
                        contentIndex = contentIndex,
                        currentModuleId = currentModuleId,
                        strings = strings,
                        onDocumentClick = { mod, slug, title ->
                            drawerState.closeAndNavigate(scope) {
                                navController.navigate(Screen.Article.createRoute(mod, slug, title))
                            }
                        },
                        onNavigateHome = {
                            drawerState.closeAndNavigate(scope) {
                                navController.navigate(Screen.Home.route) {
                                    popUpTo(Screen.Home.route) { inclusive = true }
                                    launchSingleTop = true
                                }
                            }
                        },
                        highlightCurrent = false
                    )
                    else -> SidebarHomeContent(
                        contentIndex = contentIndex,
                        strings = strings,
                        isDarkMode = isDarkMode,
                        isSplashEnabled = isSplashEnabled,
                        onModuleClick = { moduleId ->
                            drawerState.closeAndNavigate(scope) {
                                navController.navigate(Screen.Module.createRoute(moduleId)) {
                                    popUpTo(Screen.Home.route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        },
                        onSplashToggle = onSplashToggle,
                        dynamicBackground = dynamicBackground,
                        onDynamicBackgroundToggle = onDynamicBackgroundToggle,
                        autoCheckUpdate = autoCheckUpdate,
                        onAutoCheckUpdateToggle = onAutoCheckUpdateToggle,
                        /* v3.6.0：UI 显示大小调节 */
                        fontSizeScale = fontSizeScale,
                        onFontSizeChange = onFontSizeChange,
                        updateViewModel = updateViewModel,
                        onCheckUpdate = {
                            /* 手动触发检查更新：checkForUpdate 是 suspend 函数，需协程包装 */
                            updateViewModel?.let { vm ->
                                scope.launch {
                                    try {
                                        vm.checkForUpdate(manual = true)
                                    } catch (e: Exception) { Log.w(TAG, "手动触发检查更新失败: ${e.message}", e) }
                                }
                            }
                        },
                        isCheckingUpdate = checkState is CheckState.Checking
                    )
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                /* 统一顶部导航栏，根据路由显示不同按钮 */
                TopAppBar(
                    title = {
                        Text(
                            text = when {
                                isArticleRoute -> {
                                    val encodedTitle = navBackStackEntry?.arguments?.getString("title") ?: ""
                                    try { URLDecoder.decode(encodedTitle, "UTF-8") } catch (e: Exception) { Log.w(TAG, "解码文章标题失败,使用原始字符串: ${e.message}", e); encodedTitle }
                                }
                                isModuleRoute -> currentModuleId
                                else -> "FANDEX"
                            },
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            style = if (isHomeRoute) MaterialTheme.typography.titleLarge else MaterialTheme.typography.titleMedium,
                            fontWeight = if (isHomeRoute) FontWeight.Bold else FontWeight.SemiBold,
                            color = if (isHomeRoute) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                        )
                    },
                    navigationIcon = {
                        if (isArticleRoute) {
                            /* 文章页：返回按钮 */
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = strings.back,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        } else if (isModuleRoute) {
                            /* 模块页：返回按钮 */
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = strings.back,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        } else {
                            /* 首页：菜单按钮 */
                            IconButton(onClick = openDrawer) {
                                Icon(
                                    Icons.Default.Menu,
                                    contentDescription = strings.menu,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    },
                    actions = {
                        if (isArticleRoute) {
                            /* 文章页：字体缩放 + 菜单 */
                            IconButton(
                                onClick = {
                                    val newScale = (fontSizeScale - 0.1f).coerceIn(0.8f, 1.4f)
                                    onFontSizeChange(newScale)
                                },
                                enabled = fontSizeScale > 0.8f
                            ) {
                                Icon(
                                    Icons.Default.TextDecrease,
                                    contentDescription = strings.fontSizeDecrease,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            IconButton(
                                onClick = {
                                    val newScale = (fontSizeScale + 0.1f).coerceIn(0.8f, 1.4f)
                                    onFontSizeChange(newScale)
                                },
                                enabled = fontSizeScale < 1.4f
                            ) {
                                Icon(
                                    Icons.Default.TextIncrease,
                                    contentDescription = strings.fontSizeIncrease,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            IconButton(onClick = openDrawer) {
                                Icon(
                                    Icons.Default.Menu,
                                    contentDescription = strings.menu,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        } else if (isModuleRoute) {
                            /* 模块页：菜单 */
                            IconButton(onClick = openDrawer) {
                                Icon(
                                    Icons.Default.Menu,
                                    contentDescription = strings.menu,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        } else {
                            /* 首页：主页 + 主题 */
                            IconButton(onClick = {
                                navController.navigate(Screen.Home.route) {
                                    popUpTo(Screen.Home.route) { inclusive = true }
                                    launchSingleTop = true
                                }
                            }) {
                                Icon(
                                    Icons.Default.Home,
                                    contentDescription = strings.home,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            IconButton(onClick = onToggleTheme) {
                                Icon(
                                    imageVector = if (isDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                                    contentDescription = if (isDarkMode) strings.lightMode else strings.darkMode,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                )
            }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = Screen.Home.route,
                modifier = Modifier.padding(innerPadding),
                /* v3.1.0：默认全局过渡 - 横向滑动 + 淡入 */
                enterTransition = { defaultPageTransitions.enter },
                exitTransition = { defaultPageTransitions.exit },
                popEnterTransition = { defaultPageTransitions.popEnter },
                popExitTransition = { defaultPageTransitions.popExit }
            ) {
                /* 首页路由 */
                composable(Screen.Home.route) {
                    HomeScreen(
                        contentIndex = contentIndex,
                        selectedCategory = selectedCategory,
                        onCategoryChange = { newCategory -> selectedCategory = newCategory },
                        onNavigateToModule = { moduleId ->
                            navController.navigate(Screen.Module.createRoute(moduleId))
                        }
                    )
                }

                /* 模块详情路由 - v3.1.0：混合过渡（横向滑动 + 缩放 + 淡入） */
                composable(
                    route = Screen.Module.route,
                    arguments = listOf(navArgument("moduleId") { type = NavType.StringType }),
                    enterTransition = { combinedTransitions.enter },
                    exitTransition = { combinedTransitions.exit },
                    popEnterTransition = { combinedTransitions.popEnter },
                    popExitTransition = { combinedTransitions.popExit }
                ) { backStackEntry ->
                    val moduleId = backStackEntry.arguments?.getString("moduleId") ?: ""
                    ModuleScreen(
                        moduleId = moduleId,
                        contentIndex = contentIndex,
                        onNavigateToArticle = { mod, slug, title ->
                            navController.navigate(Screen.Article.createRoute(mod, slug, title))
                        }
                    )
                }

                /* 文章阅读路由 - v3.1.0：纵向滑动过渡（深入阅读语义） */
                composable(
                    route = Screen.Article.route,
                    arguments = listOf(
                        navArgument("moduleId") { type = NavType.StringType },
                        navArgument("slug") { type = NavType.StringType },
                        navArgument("title") { type = NavType.StringType }
                    ),
                    enterTransition = { verticalSlideTransitions.enter },
                    exitTransition = { verticalSlideTransitions.exit },
                    popEnterTransition = { verticalSlideTransitions.popEnter },
                    popExitTransition = { verticalSlideTransitions.popExit }
                ) { backStackEntry ->
                    val moduleId = backStackEntry.arguments?.getString("moduleId") ?: ""
                    val slug = backStackEntry.arguments?.getString("slug") ?: ""
                    val encodedTitle = backStackEntry.arguments?.getString("title") ?: ""
                    val title = try {
                        URLDecoder.decode(encodedTitle, "UTF-8")
                    } catch (e: Exception) {
                        Log.w(TAG, "解码文章路由标题参数失败,使用原始字符串: ${e.message}", e)
                        encodedTitle
                    }

                    ArticleScreenContent(
                        moduleId = moduleId,
                        slug = slug,
                        title = title,
                        isDarkMode = isDarkMode,
                        fontSizeScale = fontSizeScale,
                        contentIndex = contentIndex,
                        onNavigateBack = { navController.popBackStack() },
                        onNavigateToArticle = { mod, s, t ->
                            navController.navigate(Screen.Article.createRoute(mod, s, t)) {
                                popUpTo(Screen.Article.route) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    )
                }
            }
        }
    }

        /* 更新提示 Toast 浮层：仅在发现新版本时显示，3 秒后自动消失，
           不阻挡用户与底层内容的交互 */
        val availableState = checkState as? CheckState.Available
        if (updateViewModel != null && availableState != null) {
            UpdateToastCard(
                state = availableState,
                onDownload = {
                    /* downloadUpdate 是 suspend 函数，需协程包装 */
                    scope.launch {
                        try {
                            updateViewModel.downloadUpdate()
                        } catch (e: Exception) { Log.w(TAG, "启动 APK 下载失败: ${e.message}", e) }
                    }
                },
                onDismiss = { updateViewModel.dismissUpdate() },
                onIgnore = {
                    /* ignoreVersion 是 suspend 函数，需协程包装 */
                    scope.launch {
                        try {
                            updateViewModel.ignoreVersion(availableState.updateInfo.latestVersion)
                        } catch (e: Exception) { Log.w(TAG, "持久化忽略版本号失败: ${e.message}", e) }
                    }
                },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 80.dp, start = 16.dp, end = 16.dp)
            )
        }

        /* 下载进度浮层：仅在下载进行中显示，居中偏上 */
        val downloadingState = downloadState as? DownloadState.Downloading
        if (updateViewModel != null && downloadingState != null) {
            UpdateDownloadProgressCard(
                state = downloadingState,
                onCancel = {
                    /* 取消下载目前通过 dismissUpdate + 重置 downloadState 实现，
                       暂保留接口以便后续接入 UpdateDownloader.cancel() */
                    updateViewModel.dismissUpdate()
                },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 160.dp, start = 16.dp, end = 16.dp)
            )
        }

        /* 下载完成提示浮层：调起系统安装器 */
        if (updateViewModel != null && downloadState is DownloadState.Completed) {
            /* 下载完成后立即调起安装界面（一次性触发，无需常驻浮层） */
            androidx.compose.runtime.LaunchedEffect(downloadState) {
                updateViewModel.installUpdate()
            }
        }
    }
}

/**
 * 文章阅读内容组件（不含顶部栏，由 HomeActivity 统一管理）
 *
 * 功能：使用 MarkdownContent 原生渲染 Markdown 文档内容，支持翻页和返回顶部
 * 输入：
 *   - moduleId: 当前模块 ID
 *   - slug: 文档唯一标识
 *   - title: 文档标题
 *   - isDarkMode: 是否暗色模式
 *   - fontSizeScale: 字体缩放比例（0.8-1.4）
 *   - contentIndex: 内容索引（由 FANDEXApp 统一加载传入，用于翻页定位）
 *   - onNavigateBack: 返回上一页回调
 *   - onNavigateToArticle: 翻页导航回调
 * 输出：原生 Compose 渲染的文档阅读界面
 * 流程：
 *   1. 接收上层传入的索引，查找当前文档在模块中的位置
 *   2. 加载 Markdown 文本，传入 MarkdownContent 原生渲染
 *   3. 底部栏提供上一篇/下一篇翻页及页码显示
 *   4. 右下角返回顶部悬浮按钮
 */
@Composable
fun ArticleScreenContent(
    moduleId: String,
    slug: String,
    title: String,
    isDarkMode: Boolean = true,
    fontSizeScale: Float = 1.0f,
    contentIndex: ContentIndex? = null,
    onNavigateBack: () -> Unit,
    onNavigateToArticle: (String, String, String) -> Unit = { _, _, _ -> }
) {
    val context = LocalContext.current
    val strings = Strings.default

    /* 滚动状态，用于返回顶部动画 */
    val scrollState = rememberScrollState()
    val coroutineScope = rememberCoroutineScope()

    /* 加载当前文档的 Markdown 文本 */
    var markdownText by remember { mutableStateOf("") }
    LaunchedEffect(moduleId, slug) {
        /* v3.6.0 操作逻辑优化：翻页时重置滚动位置到顶部，避免新文档停留在上一文档的滚动位置 */
        scrollState.scrollTo(0)
        val loaded = ContentLoader.loadDocumentMarkdown(context, moduleId, slug)
        markdownText = loaded ?: strings.noContent
    }

    /* 查找当前文档在模块中的位置，计算上一篇/下一篇 */
    val module = contentIndex?.modules?.find { it.id == moduleId }
    val documents = module?.documents?.map { docName ->
        Document(slug = docName, title = docName, module = moduleId)
    } ?: emptyList()
    val currentIndex = documents.indexOfFirst { it.slug == slug }
    val prevDoc: Document? = if (currentIndex > 0) documents[currentIndex - 1] else null
    val nextDoc: Document? = if (currentIndex >= 0 && currentIndex < documents.size - 1) documents[currentIndex + 1] else null

    /* 底部翻页栏高度，用于返回顶部按钮的底部偏移计算 */
    val bottomBarHeight = if (documents.size > 1) 48.dp else 0.dp

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            /* Markdown 原生渲染内容区 */
            Box(modifier = Modifier.weight(1f)) {
                MarkdownContent(
                    markdown = markdownText,
                    /* v3.6.0：全局字号缩放已由 FANDEXTheme 的 LocalDensity 统一处理，
                       此处传 1.0 避免双重缩放（MarkdownContent 内部仍有 fontSizeScale 乘法逻辑） */
                    fontSizeScale = 1.0f,
                    scrollState = scrollState
                )
            }

            /* 底部翻页栏：紧凑设计，仅在有多个文档时显示 */
            if (documents.size > 1) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 2.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 2.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        /* 上一篇按钮 */
                        TextButton(
                            onClick = {
                                prevDoc?.let { doc ->
                                    onNavigateToArticle(doc.module, doc.slug, doc.title)
                                }
                            },
                            enabled = prevDoc != null,
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                                contentDescription = strings.previousDoc,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Text(
                                text = strings.previousDoc,
                                style = MaterialTheme.typography.labelSmall,
                                maxLines = 1
                            )
                        }

                        /* 页码指示器 */
                        Text(
                            text = "${currentIndex + 1}/${documents.size}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        /* 下一篇按钮 */
                        TextButton(
                            onClick = {
                                nextDoc?.let { doc ->
                                    onNavigateToArticle(doc.module, doc.slug, doc.title)
                                }
                            },
                            enabled = nextDoc != null,
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                        ) {
                            Text(
                                text = strings.nextDoc,
                                style = MaterialTheme.typography.labelSmall,
                                maxLines = 1
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Icon(
                                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                                contentDescription = strings.nextDoc,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }

        /* 返回顶部悬浮按钮：右下角小圆形 */
        FloatingActionButton(
            onClick = {
                coroutineScope.launch {
                    scrollState.animateScrollTo(0)
                }
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(
                    end = 12.dp,
                    bottom = bottomBarHeight + 8.dp
                )
                .size(32.dp),
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
            elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 2.dp)
        ) {
            Icon(
                Icons.Filled.KeyboardArrowUp,
                contentDescription = strings.backToTop,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

/**
 * 首页侧边栏内容
 *
 * 功能：展示 FANDEX 应用信息、作者信息、更新时间、数量统计、分类与模块列表
 * 输入：ContentIndex 数据、语言字符串、深色模式标志、模块点击回调
 * 输出：可滚动的侧边栏导航列表
 * 流程：渲染应用信息 -> 统计数据 -> 分类与模块列表
 */
@Composable
fun SidebarHomeContent(
    contentIndex: ContentIndex?,
    strings: Strings.LangStrings,
    isDarkMode: Boolean,
    isSplashEnabled: Boolean,
    onModuleClick: (String) -> Unit,
    onSplashToggle: (Boolean) -> Unit,
    /* 动态背景开关：传递至开关行控件供用户配置，后续可联动背景装饰系统 */
    dynamicBackground: Boolean = true,
    onDynamicBackgroundToggle: (Boolean) -> Unit = {},
    /* 自动检查更新开关：传递至开关行控件供用户配置 */
    autoCheckUpdate: Boolean = true,
    onAutoCheckUpdateToggle: (Boolean) -> Unit = {},
    /* v3.6.0：UI 显示大小调节（0.8-1.4） */
    fontSizeScale: Float = 1.0f,
    onFontSizeChange: (Float) -> Unit = {},
    /* 更新自检 ViewModel：保留参数预留未来在侧边栏显示更多状态信息 */
    updateViewModel: UpdateViewModel? = null,
    /* 检查更新按钮点击回调 */
    onCheckUpdate: () -> Unit = {},
    /* 是否正在检查更新（用于显示旋转加载动画） */
    isCheckingUpdate: Boolean = false
) {
    Column(
        modifier = Modifier
            .fillMaxHeight()
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        /* FANDEX 标题 */
        Text(
            text = strings.appName,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = strings.homeSubtitle,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(modifier = Modifier.height(12.dp))

        /* 应用信息区 */
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    RoundedCornerShape(8.dp)
                )
                .padding(12.dp)
        ) {
            /* 版本信息 - 从 BuildConfig 动态读取 */
            InfoRow(label = "v${BuildConfig.VERSION_NAME}", value = "")
            /* 作者信息 */
            InfoRow(label = "fanquanpp", value = "")
            /* 更新时间 */
            if (contentIndex != null) {
                InfoRow(label = contentIndex.generatedAt, value = "")
            }
            Spacer(modifier = Modifier.height(8.dp))
            /* 数量统计 */
            if (contentIndex != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    StatItem(count = "${contentIndex.categories.size}", label = strings.category)
                    StatItem(count = "${contentIndex.modules.size}", label = strings.modules)
                    StatItem(count = "${contentIndex.modules.sumOf { it.documents.size }}", label = strings.documents)
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        /* 启动页开关 */
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    RoundedCornerShape(8.dp)
                )
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = strings.splashScreen,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Switch(
                checked = isSplashEnabled,
                onCheckedChange = onSplashToggle,
                modifier = Modifier.height(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))

        /* 动态背景开关：与"启动页开关"样式保持一致，控制背景装饰系统动态层 */
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    RoundedCornerShape(8.dp)
                )
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = strings.dynamicBackground,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Switch(
                checked = dynamicBackground,
                onCheckedChange = onDynamicBackgroundToggle,
                modifier = Modifier.height(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))

        /* v3.6.0：UI 显示大小调节（Slider）
         * 通过 LocalDensity 全局缩放字号，所有 sp 单位的 Text 自动响应
         * 范围 0.8x - 1.4x，步长 0.1x，共 7 档（含端点） */
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    RoundedCornerShape(8.dp)
                )
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = strings.displaySize,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "%.1fx".format(fontSizeScale),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Medium
                )
            }
            Slider(
                value = fontSizeScale,
                onValueChange = { newValue ->
                    /* 步长 0.1，量化到 0.8/0.9/1.0/1.1/1.2/1.3/1.4 */
                    val stepped = (newValue * 10).roundToInt() / 10f
                    onFontSizeChange(stepped.coerceIn(0.8f, 1.4f))
                },
                valueRange = 0.8f..1.4f,
                steps = 5, /* 7 档 = 6 区间 = 5 步长分隔点 */
                modifier = Modifier.fillMaxWidth()
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = strings.displaySizeSmall,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = strings.displaySizeHint,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = strings.displaySizeLarge,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))

        /* 自动检查更新开关：控制应用启动后是否自动发起静默检查 */
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    RoundedCornerShape(8.dp)
                )
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = strings.autoCheckUpdate,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = strings.updateAutoCheckHint,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Switch(
                checked = autoCheckUpdate,
                onCheckedChange = onAutoCheckUpdateToggle,
                modifier = Modifier.height(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))

        /* 检查更新按钮：点击触发手动检查，检查中显示旋转加载动画 */
        UpdateSettingsItem(
            onClick = onCheckUpdate,
            isChecking = isCheckingUpdate,
            hint = strings.updateCheckHint
        )
        Spacer(modifier = Modifier.height(12.dp))

        /* 免责声明 */
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    RoundedCornerShape(8.dp)
                )
                .padding(12.dp)
        ) {
            Text(
                text = strings.disclaimerTitle,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = strings.disclaimer,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 16.sp
            )
        }
        Spacer(modifier = Modifier.height(12.dp))

        /* 分类与模块列表 */
        if (contentIndex != null) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                val groupedModules = contentIndex.modules.groupBy { it.category }
                val orderedCategories = contentIndex.categories.filter { groupedModules.containsKey(it.id) }

                items(orderedCategories) { category ->
                    val categoryModules = groupedModules[category.id] ?: emptyList()

                    /* 分类标题 */
                    CategoryHeader(category = category)
                    Spacer(modifier = Modifier.height(4.dp))

                    /* 分类下的模块列表 */
                    categoryModules.forEach { module ->
                        ModuleSidebarItem(
                            module = module,
                            categoryColor = category.color,
                            strings = strings,
                            onClick = { onModuleClick(module.id) }
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
    }
}

/**
 * 信息行组件
 *
 * 功能：显示单行信息文本
 * 输入：标签文本、值文本
 * 输出：单行文本
 */
@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 1.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        if (value.isNotBlank()) {
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

/**
 * 统计项组件
 *
 * 功能：显示数量 + 标签的统计信息
 * 输入：数量字符串、标签字符串
 * 输出：居中的统计项
 */
@Composable
private fun StatItem(count: String, label: String) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = count,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 侧边栏分类标题
 *
 * 功能：展示分类名称，带颜色指示条
 * 输入：Category 对象
 * 输出：分类标题行
 */
@Composable
fun CategoryHeader(category: com.fandex.app.data.Category) {
    val catColor = remember(category.color) {
        CategoryColorParser.parse(category.color)
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(start = 4.dp, top = 4.dp, bottom = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(16.dp)
                .clip(RoundedCornerShape(1.dp))
                .background(catColor)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = category.label,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

/**
 * 侧边栏模块条目
 *
 * 功能：展示模块名称、颜色圆点、文档数量，点击跳转模块详情
 * 输入：Module 对象、分类颜色字符串、语言字符串、点击回调
 * 输出：可点击的模块导航项
 */
@Composable
fun ModuleSidebarItem(
    module: com.fandex.app.data.Module,
    categoryColor: String,
    strings: Strings.LangStrings,
    onClick: () -> Unit
) {
    val dotColor = remember(categoryColor) {
        CategoryColorParser.parse(categoryColor)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        /* 颜色圆点 */
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(dotColor)
        )
        Spacer(modifier = Modifier.width(10.dp))
        /* 模块标题 */
        Text(
            text = module.title,
            style = MaterialTheme.typography.bodyMedium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(6.dp))
        /* 文档数量 */
        Text(
            text = "${module.documents.size}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

