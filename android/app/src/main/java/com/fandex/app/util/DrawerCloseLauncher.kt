package com.fandex.app.util

import android.util.Log
import androidx.compose.material3.DrawerState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** 日志 TAG */
private const val TAG = "DrawerCloseLauncher"

/**
 * 抽屉关闭 + 导航扩展工具
 *
 * 功能：统一"关闭抽屉 -> 执行导航"的模板代码，消除多处重复 try-catch 协程样板
 * 输入：
 *   - drawerState: 抽屉状态
 *   - scope: 协程作用域
 *   - onNavigate: 导航执行闭包（在主线程同步执行）
 * 输出：无返回值，触发协程异步关闭抽屉，并立即同步执行导航
 *
 * 设计说明：
 *   1. 抽屉关闭为挂起操作（suspend），需在协程中调用
 *   2. 导航操作为非挂起，可直接同步执行，避免与协程调度耦合
 *   3. 异常静默处理：抽屉关闭失败不应阻塞导航流程
 *   4. 替代项目内多处 `scope.launch { try { drawerState.close() } catch ... }; navController.navigate(...)` 重复代码
 *
 * 使用示例：
 *   ```
 *   drawerState.closeAndNavigate(scope) {
 *       navController.navigate(Screen.Home.route) { ... }
 *   }
 *   ```
 */
fun DrawerState.closeAndNavigate(
    scope: CoroutineScope,
    onNavigate: () -> Unit
) {
    /* 异步关闭抽屉，失败静默处理（不影响后续导航） */
    scope.launch {
        try { close() } catch (e: Exception) { Log.w(TAG, "抽屉关闭失败: ${e.message}", e) }
    }
    /* 同步执行导航，确保路由跳转即时响应 */
    onNavigate()
}
