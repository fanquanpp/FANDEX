package com.fandex.app.util

import android.util.Log
import androidx.compose.material3.DrawerState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

private const val TAG = "DrawerCloseLauncher"

fun DrawerState.closeAndNavigate(
    scope: CoroutineScope,
    onNavigate: () -> Unit
) {
    scope.launch {
        try { close() } catch (e: Exception) { Log.w(TAG, "抽屉关闭失败: ${e.message}", e) }
    }
    onNavigate()
}
