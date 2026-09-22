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

private const val DURATION_NORMAL = 250

private const val DURATION_FAST = 150

private val TabEnter: EnterTransition = fadeIn(tween(DURATION_NORMAL, easing = FastOutSlowInEasing)) +
    slideInVertically(tween(DURATION_NORMAL, easing = FastOutSlowInEasing)) { it / 24 }

private val TabExit: ExitTransition = fadeOut(tween(DURATION_FAST))

private val DetailEnter: EnterTransition =
    slideInHorizontally(tween(DURATION_NORMAL, easing = FastOutSlowInEasing)) { it / 4 } +
        fadeIn(tween(DURATION_NORMAL, easing = FastOutSlowInEasing))

private val DetailExit: ExitTransition = fadeOut(tween(DURATION_FAST))

private val DetailPopEnter: EnterTransition = fadeIn(tween(DURATION_NORMAL, easing = FastOutSlowInEasing))

private val DetailPopExit: ExitTransition =
    slideOutHorizontally(tween(DURATION_NORMAL, easing = FastOutSlowInEasing)) { it / 4 } +
        fadeOut(tween(DURATION_NORMAL, easing = FastOutSlowInEasing))

@Composable
fun AppRoot() {
    val navController = rememberNavController()
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
