package com.fandex.app.navigation

import android.util.Log
import java.net.URLEncoder

sealed class Screen(val route: String) {

    companion object {
        private const val TAG = "Screen"
    }

    data object Home : Screen("home")

    data object Module : Screen("module/{moduleId}") {
        fun createRoute(moduleId: String): String = "module/$moduleId"
    }

    data object Article : Screen("article/{moduleId}/{slug}/{title}") {
        fun createRoute(moduleId: String, slug: String, title: String): String {
            val encodedTitle = try { URLEncoder.encode(title, "UTF-8") } catch (e: Exception) { Log.w(TAG, "URL 编码文章标题失败,使用原始字符串: ${e.message}", e); title }
            return "article/$moduleId/$slug/$encodedTitle"
        }
    }
}
