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
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Code
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
import androidx.compose.material3.ModalBottomSheet
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
import androidx.compose.ui.platform.LocalUriHandler
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
import com.fandex.app.data.resolveDocuments
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

private const val TAG = "HomeActivity"

class HomeActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val context = LocalContext.current

            val isDarkMode by DataStoreManager.getDarkMode(context)
                .collectAsState(initial = true)

            val fontSizeScale by DataStoreManager.getFontSizeScale(context)
                .collectAsState(initial = 1.0f)

            val isSplashEnabled by DataStoreManager.getSplashEnabled(context)
                .collectAsState(initial = true)

            val dynamicBackground by DataStoreManager.getDynamicBackground(context)
                .collectAsState(initial = true)

            val autoCheckUpdate by DataStoreManager.getAutoCheckUpdate(context)
                .collectAsState(initial = true)

            val scope = rememberCoroutineScope()

            FANDEXTheme(darkTheme = isDarkMode, fontSizeScale = fontSizeScale) {
                val strings = Strings.default

                val updateViewModel: UpdateViewModel = viewModel()

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
                            scope.launch {
                                try {
                                    DataStoreManager.saveDarkMode(context, !isDarkMode)
                                } catch (e: Exception) { Log.w(TAG, "持久化深色模式开关失败: ${e.message}", e) }
                            }
                        },
                        fontSizeScale = fontSizeScale,
                        onFontSizeChange = { newScale ->
                            scope.launch {
                                try {
                                    DataStoreManager.saveFontSizeScale(context, newScale)
                                } catch (e: Exception) { Log.w(TAG, "持久化字体缩放失败: ${e.message}", e) }
                            }
                        },
                        isSplashEnabled = isSplashEnabled,
                        onSplashToggle = { enabled ->
                            scope.launch {
                                try {
                                    DataStoreManager.saveSplashEnabled(context, enabled)
                                } catch (e: Exception) { Log.w(TAG, "持久化启动页开关失败: ${e.message}", e) }
                            }
                        },
                        dynamicBackground = dynamicBackground,
                        onDynamicBackgroundToggle = { enabled ->
                            scope.launch {
                                try {
                                    DataStoreManager.saveDynamicBackground(context, enabled)
                                } catch (e: Exception) { Log.w(TAG, "持久化动态背景开关失败: ${e.message}", e) }
                            }
                        },
                        autoCheckUpdate = autoCheckUpdate,
                        onAutoCheckUpdateToggle = { enabled ->
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FANDEXApp(
    isDarkMode: Boolean = true,
    onToggleTheme: () -> Unit = {},
    fontSizeScale: Float = 1.0f,
    onFontSizeChange: (Float) -> Unit = {},
    isSplashEnabled: Boolean = true,
    onSplashToggle: (Boolean) -> Unit = {},
    dynamicBackground: Boolean = true,
    onDynamicBackgroundToggle: (Boolean) -> Unit = {},
    autoCheckUpdate: Boolean = true,
    onAutoCheckUpdateToggle: (Boolean) -> Unit = {},
    updateViewModel: UpdateViewModel? = null
) {
    val navController = rememberNavController()
    var showRepoSheet by remember { mutableStateOf(false) }
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val strings = Strings.default
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val checkStateFlow = updateViewModel?.checkState
        ?: remember { kotlinx.coroutines.flow.MutableStateFlow(CheckState.Idle) }
    val checkState by checkStateFlow.collectAsState()

    val downloadStateFlow = updateViewModel?.downloadState
        ?: remember { kotlinx.coroutines.flow.MutableStateFlow(DownloadState.Idle) }
    val downloadState by downloadStateFlow.collectAsState()

    var selectedCategory by remember { mutableStateOf<String?>(null) }

    val drawerState = rememberDrawerState(DrawerValue.Closed)

    val isArticleRoute = currentRoute != null && currentRoute.startsWith("article/")
    val isModuleRoute = currentRoute != null && currentRoute.startsWith("module/")
    val isHomeRoute = currentRoute == Screen.Home.route

    var contentIndex by remember { mutableStateOf<ContentIndex?>(null) }
    LaunchedEffect(Unit) {
        contentIndex = ContentLoader.loadIndex(context)
    }

    val currentModuleId = if (isArticleRoute) {
        navBackStackEntry?.arguments?.getString("moduleId") ?: ""
    } else if (isModuleRoute) {
        navBackStackEntry?.arguments?.getString("moduleId") ?: ""
    } else ""

    val currentSlug = if (isArticleRoute) {
        navBackStackEntry?.arguments?.getString("slug") ?: null
    } else null

    val openDrawer: () -> Unit = {
        scope.launch {
            try { drawerState.open() } catch (e: Exception) { Log.w(TAG, "打开侧边栏抽屉失败: ${e.message}", e) }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (showRepoSheet) {
            val uriHandler = LocalUriHandler.current
            ModalBottomSheet(onDismissRequest = { showRepoSheet = false }) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .padding(bottom = 28.dp)
                ) {
                    Text(
                        text = "源仓库",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "项目自 3.7.0 版本起迁移至新仓库，请按所需版本选择",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    RepoSheetItem(
                        title = "fanquanpp/FANDEX",
                        desc = "3.7.0 及之后的最新版本（当前维护主线）",
                        url = "https://github.com/fanquanpp/FANDEX",
                        uriHandler = uriHandler,
                        onDismiss = { showRepoSheet = false }
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    RepoSheetItem(
                        title = "fanquanpp/FANDEX-App",
                        desc = "3.7.0 及之前的历史版本",
                        url = "https://github.com/fanquanpp/FANDEX-App",
                        uriHandler = uriHandler,
                        onDismiss = { showRepoSheet = false }
                    )
                }
            }
        }

        ModalNavigationDrawer(
            drawerState = drawerState,
            drawerContent = {
                ModalDrawerSheet(
                    drawerShape = RoundedCornerShape(topEnd = 0.dp, bottomEnd = 0.dp),
                    modifier = Modifier.width(280.dp)
                ) {
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
                        fontSizeScale = fontSizeScale,
                        onFontSizeChange = onFontSizeChange,
                        updateViewModel = updateViewModel,
                        onCheckUpdate = {
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
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = strings.back,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        } else if (isModuleRoute) {
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = strings.back,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        } else {
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
                            IconButton(onClick = openDrawer) {
                                Icon(
                                    Icons.Default.Menu,
                                    contentDescription = strings.menu,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        } else {
                            IconButton(onClick = { showRepoSheet = true }) {
                                Icon(
                                    Icons.Default.Code,
                                    contentDescription = "源仓库",
                                    modifier = Modifier.size(20.dp)
                                )
                            }
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
                enterTransition = { defaultPageTransitions.enter },
                exitTransition = { defaultPageTransitions.exit },
                popEnterTransition = { defaultPageTransitions.popEnter },
                popExitTransition = { defaultPageTransitions.popExit }
            ) {
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

        val availableState = checkState as? CheckState.Available
        if (updateViewModel != null && availableState != null) {
            UpdateToastCard(
                state = availableState,
                onDownload = {
                    scope.launch {
                        try {
                            updateViewModel.downloadUpdate()
                        } catch (e: Exception) { Log.w(TAG, "启动 APK 下载失败: ${e.message}", e) }
                    }
                },
                onDismiss = { updateViewModel.dismissUpdate() },
                onIgnore = {
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

        val downloadingState = downloadState as? DownloadState.Downloading
        if (updateViewModel != null && downloadingState != null) {
            UpdateDownloadProgressCard(
                state = downloadingState,
                onCancel = {
                    updateViewModel.dismissUpdate()
                },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 160.dp, start = 16.dp, end = 16.dp)
            )
        }

        if (updateViewModel != null && downloadState is DownloadState.Completed) {
            androidx.compose.runtime.LaunchedEffect(downloadState) {
                updateViewModel.installUpdate()
            }
        }
    }
}

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

    val scrollState = rememberScrollState()
    val coroutineScope = rememberCoroutineScope()

    var markdownText by remember { mutableStateOf("") }
    LaunchedEffect(moduleId, slug) {
        scrollState.scrollTo(0)
        val loaded = ContentLoader.loadDocumentMarkdown(context, moduleId, slug)
        markdownText = loaded ?: strings.noContent
    }

    val module = contentIndex?.modules?.find { it.id == moduleId }
    val documents = module?.let { contentIndex.resolveDocuments(it) } ?: emptyList()
    val currentIndex = documents.indexOfFirst { it.slug == slug }
    val prevDoc: Document? = if (currentIndex > 0) documents[currentIndex - 1] else null
    val nextDoc: Document? = if (currentIndex >= 0 && currentIndex < documents.size - 1) documents[currentIndex + 1] else null

    val bottomBarHeight = if (documents.size > 1) 48.dp else 0.dp

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.weight(1f)) {
                MarkdownContent(
                    markdown = markdownText,
                    fontSizeScale = 1.0f,
                    scrollState = scrollState
                )
            }

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

                        Text(
                            text = "${currentIndex + 1}/${documents.size}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

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

@Composable
fun SidebarHomeContent(
    contentIndex: ContentIndex?,
    strings: Strings.LangStrings,
    isDarkMode: Boolean,
    isSplashEnabled: Boolean,
    onModuleClick: (String) -> Unit,
    onSplashToggle: (Boolean) -> Unit,
    dynamicBackground: Boolean = true,
    onDynamicBackgroundToggle: (Boolean) -> Unit = {},
    autoCheckUpdate: Boolean = true,
    onAutoCheckUpdateToggle: (Boolean) -> Unit = {},
    fontSizeScale: Float = 1.0f,
    onFontSizeChange: (Float) -> Unit = {},
    updateViewModel: UpdateViewModel? = null,
    onCheckUpdate: () -> Unit = {},
    isCheckingUpdate: Boolean = false
) {
    Column(
        modifier = Modifier
            .fillMaxHeight()
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
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

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    RoundedCornerShape(8.dp)
                )
                .padding(12.dp)
        ) {
            InfoRow(label = "v${BuildConfig.VERSION_NAME}", value = "")
            InfoRow(label = "fanquanpp", value = "")
            if (contentIndex != null) {
                InfoRow(label = contentIndex.generatedAt, value = "")
            }
            Spacer(modifier = Modifier.height(8.dp))
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
                    val stepped = (newValue * 10).roundToInt() / 10f
                    onFontSizeChange(stepped.coerceIn(0.8f, 1.4f))
                },
                valueRange = 0.8f..1.4f,
                steps = 5,
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

        UpdateSettingsItem(
            onClick = onCheckUpdate,
            isChecking = isCheckingUpdate,
            hint = strings.updateCheckHint
        )
        Spacer(modifier = Modifier.height(12.dp))

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

                    CategoryHeader(category = category)
                    Spacer(modifier = Modifier.height(4.dp))

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
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(dotColor)
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = module.title,
            style = MaterialTheme.typography.bodyMedium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = "${module.documents.size}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}


@Composable
private fun RepoSheetItem(
    title: String,
    desc: String,
    url: String,
    uriHandler: androidx.compose.ui.platform.UriHandler,
    onDismiss: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
            .clickable {
                onDismiss()
                try {
                    uriHandler.openUri(url)
                } catch (e: Exception) {
                    Log.w(TAG, "打开源仓库链接失败: ${e.message}", e)
                }
            }
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(32.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(MaterialTheme.colorScheme.primary)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = desc,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Icon(
            Icons.AutoMirrored.Filled.OpenInNew,
            contentDescription = "跳转浏览器",
            modifier = Modifier.size(18.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
