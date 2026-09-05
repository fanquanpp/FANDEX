package com.fandex.app.ui.navigation

import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavBackStackEntry
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NamedNavArgument
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.fandex.app.ui.drawer.AppDrawer
import com.fandex.app.ui.screens.document.DocumentScreen
import com.fandex.app.ui.screens.home.HomeScreen
import com.fandex.app.ui.screens.learningpath.LearningPathDetailScreen
import com.fandex.app.ui.screens.learningpath.LearningPathScreen
import com.fandex.app.ui.screens.module.ModuleScreen
import com.fandex.app.ui.screens.search.SearchScreen
import com.fandex.app.ui.screens.syntax.SyntaxDetailScreen
import com.fandex.app.ui.screens.syntax.SyntaxScreen
import com.fandex.app.update.UpdateOverlay
import kotlinx.coroutines.launch

// ---------------------------------------------------------------------------
// 页面过渡动效
//
// 对齐 web 端 motion 令牌：250ms 常规过渡 + cubic-bezier(0.4, 0, 0.2, 1) 减速
// - Tab 级页面（首页/语法/路线/搜索）：淡入淡出 + 轻微上移，层级扁平
// - 详情级页面（模块/文档/语法详情/路线详情）：横滑进入、横滑退出，
//   承接系统预测性返回手势（popExit 在手势中实时播放）
// ---------------------------------------------------------------------------

/** 常规过渡时长（对齐 motion-duration-normal 250ms） */
private const val DURATION_NORMAL = 250

/** 快速淡出时长 */
private const val DURATION_FAST = 150

/** Tab 页进入：淡入 + 4% 高度上移 */
private val TabEnter: EnterTransition = fadeIn(tween(DURATION_NORMAL, easing = FastOutSlowInEasing)) +
    slideInVertically(tween(DURATION_NORMAL, easing = FastOutSlowInEasing)) { it / 24 }

/** Tab 页退出：快速淡出（保持叠层下的视觉连续） */
private val TabExit: ExitTransition = fadeOut(tween(DURATION_FAST))

/** 详情页进入：从右横滑 1/4 屏 + 淡入（表达"推入"层级） */
private val DetailEnter: EnterTransition =
    slideInHorizontally(tween(DURATION_NORMAL, easing = FastOutSlowInEasing)) { it / 4 } +
        fadeIn(tween(DURATION_NORMAL, easing = FastOutSlowInEasing))

/** 详情页退出（被新页面覆盖）：快速淡出 */
private val DetailExit: ExitTransition = fadeOut(tween(DURATION_FAST))

/** 详情页返回进入（下层页面回位）：淡入 */
private val DetailPopEnter: EnterTransition = fadeIn(tween(DURATION_NORMAL, easing = FastOutSlowInEasing))

/** 详情页返回退出：向右横滑离场 + 淡出（预测性返回手势中实时播放） */
private val DetailPopExit: ExitTransition =
    slideOutHorizontally(tween(DURATION_NORMAL, easing = FastOutSlowInEasing)) { it / 4 } +
        fadeOut(tween(DURATION_NORMAL, easing = FastOutSlowInEasing))

/**
 * 应用根组件
 *
 * 参考旧版 FANDEX-App 信息架构：
 * - 设置收纳于抽屉（品牌头部 + 显示设置 + 模块快速导航）
 * - 顶部 Dock 常驻通用功能（各页面内置）
 * - 无底部导航，主页开门见山直入内容
 */
@Composable
fun AppRoot() {
    val navController = rememberNavController()
    // 以状态订阅当前回退栈条目，供抽屉当前项高亮
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: Routes.HOME
    val drawerState = rememberDrawerState(initialValue = androidx.compose.material3.DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val onOpenDrawer: () -> Unit = { scope.launch { drawerState.open() } }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                AppDrawer(
                    currentRoute = currentRoute,
                    onNavigate = { route ->
                        scope.launch { drawerState.close() }
                        navController.navigate(route) {
                            popUpTo(Routes.HOME) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onModuleClick = { moduleId ->
                        scope.launch { drawerState.close() }
                        navController.navigate(Routes.module(moduleId))
                    }
                )
            }
        }
    ) {
        // 更新自检浮层：覆盖在内容上方顶部（Toast 卡片 / 下载进度卡片）
        Box {
            AppNavHost(
                navController = navController,
                onOpenDrawer = onOpenDrawer
            )
            UpdateOverlay(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
            )
        }
    }
}

/**
 * 导航图
 *
 * NavHost 级默认过渡为 Tab 风格；详情级路由通过 detailComposable 覆盖为横滑
 */
@Composable
private fun AppNavHost(
    navController: NavHostController,
    onOpenDrawer: () -> Unit
) {
    NavHost(
        navController = navController,
        startDestination = Routes.HOME,
        enterTransition = { TabEnter },
        exitTransition = { TabExit },
        popEnterTransition = { TabEnter },
        popExitTransition = { TabExit }
    ) {
        // 首页（开门见山：筛选 chips + 模块内容）
        composable(Routes.HOME) {
            HomeScreen(
                onModuleClick = { moduleId ->
                    navController.navigate(Routes.module(moduleId))
                },
                onDocClick = { moduleId, docSlug ->
                    navController.navigate(Routes.document(moduleId, docSlug))
                },
                onSyntax = { navController.navigate(Routes.SYNTAX) },
                onLearningPath = { navController.navigate(Routes.LEARNING_PATH) },
                onSearch = { navController.navigate(Routes.SEARCH) },
                onOpenDrawer = onOpenDrawer
            )
        }

        // 模块详情页
        detailComposable(
            route = Routes.MODULE,
            arguments = listOf(
                navArgument("moduleId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val moduleId = backStackEntry.arguments?.getString("moduleId") ?: return@detailComposable
            ModuleScreen(
                moduleId = moduleId,
                onDocClick = { docSlug ->
                    navController.navigate(Routes.document(moduleId, docSlug))
                },
                onBack = { navController.popBackStack() },
                onOpenDrawer = onOpenDrawer,
                onHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME)
                        launchSingleTop = true
                    }
                },
            )
        }

        // 文档详情页
        detailComposable(
            route = Routes.DOCUMENT,
            arguments = listOf(
                navArgument("moduleId") { type = NavType.StringType },
                navArgument("docSlug") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val moduleId = backStackEntry.arguments?.getString("moduleId") ?: return@detailComposable
            val docSlug = backStackEntry.arguments?.getString("docSlug") ?: return@detailComposable
            DocumentScreen(
                moduleId = moduleId,
                docSlug = docSlug,
                onBack = { navController.popBackStack() },
                // 相关 / 前置 / 上下篇可能跨模块跳转
                onDocClick = { otherModule, otherSlug ->
                    navController.navigate(Routes.document(otherModule, otherSlug))
                },
                onOpenDrawer = onOpenDrawer,
                onHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME)
                        launchSingleTop = true
                    }
                },
            )
        }

        // 语法速览
        composable(Routes.SYNTAX) {
            SyntaxScreen(
                onModuleClick = { moduleId ->
                    navController.navigate(Routes.syntaxDetail(moduleId))
                },
                onBack = { navController.popBackStack() },
                onOpenDrawer = onOpenDrawer,
                onHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME)
                        launchSingleTop = true
                    }
                },
            )
        }

        // 语法详情页
        detailComposable(
            route = Routes.SYNTAX_DETAIL,
            arguments = listOf(
                navArgument("moduleId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val moduleId = backStackEntry.arguments?.getString("moduleId") ?: return@detailComposable
            SyntaxDetailScreen(
                moduleId = moduleId,
                onBack = { navController.popBackStack() },
                // 卡片跳转来源文档
                onDocClick = { docModule, docSlug ->
                    navController.navigate(Routes.document(docModule, docSlug))
                },
                onOpenDrawer = onOpenDrawer,
                onHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME)
                        launchSingleTop = true
                    }
                },
            )
        }

        // 学习路线
        composable(Routes.LEARNING_PATH) {
            LearningPathScreen(
                onPathClick = { moduleId ->
                    navController.navigate(Routes.learningPathDetail(moduleId))
                },
                onBack = { navController.popBackStack() },
                onOpenDrawer = onOpenDrawer,
                onHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME)
                        launchSingleTop = true
                    }
                },
            )
        }

        // 学习路径详情页
        detailComposable(
            route = Routes.LEARNING_PATH_DETAIL,
            arguments = listOf(
                navArgument("moduleId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val moduleId = backStackEntry.arguments?.getString("moduleId") ?: return@detailComposable
            LearningPathDetailScreen(
                moduleId = moduleId,
                onBack = { navController.popBackStack() },
                onDocClick = { docModule, docSlug ->
                    navController.navigate(Routes.document(docModule, docSlug))
                },
                onOpenDrawer = onOpenDrawer,
                onHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME)
                        launchSingleTop = true
                    }
                },
            )
        }

        // 搜索
        composable(Routes.SEARCH) {
            SearchScreen(
                onDocClick = { moduleId, docSlug ->
                    navController.navigate(Routes.document(moduleId, docSlug))
                },
                onBack = { navController.popBackStack() },
                onOpenDrawer = onOpenDrawer,
                onHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME)
                        launchSingleTop = true
                    }
                },
            )
        }
    }
}

/**
 * 详情级路由包装
 *
 * 覆盖进入 / 返回退出为横滑动效，其余沿用 Tab 风格默认值；
 * 预测性返回手势期间将实时播放 popExit 动效
 */
private fun NavGraphBuilder.detailComposable(
    route: String,
    arguments: List<NamedNavArgument> = emptyList(),
    content: @Composable (NavBackStackEntry) -> Unit
) {
    composable(
        route = route,
        arguments = arguments,
        enterTransition = { DetailEnter },
        exitTransition = { DetailExit },
        popEnterTransition = { DetailPopEnter },
        popExitTransition = { DetailPopExit }
    ) { content(it) }
}
