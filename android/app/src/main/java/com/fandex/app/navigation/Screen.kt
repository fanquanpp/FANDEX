package com.fandex.app.navigation

import android.util.Log
import java.net.URLEncoder

/**
 * 导航路由定义
 *
 * 功能：定义应用内所有页面的路由路径
 * 输入：无
 * 输出：路由路径常量
 */
sealed class Screen(val route: String) {

    companion object {
        /** 日志 TAG */
        private const val TAG = "Screen"
    }

    /**
     * 首页路由
     *
     * 展示分类和模块列表
     */
    data object Home : Screen("home")

    /**
     * 模块详情路由
     *
     * 展示指定模块下的文档列表
     * 参数：moduleId - 模块 ID
     */
    data object Module : Screen("module/{moduleId}") {
        /**
         * 创建模块路由路径
         *
         * 输入：模块 ID
         * 输出：路由路径字符串
         */
        fun createRoute(moduleId: String): String = "module/$moduleId"
    }

    /**
     * 文档阅读路由
     *
     * 展示文档内容
     * 参数：moduleId、slug、title（URL 编码）
     */
    data object Article : Screen("article/{moduleId}/{slug}/{title}") {
        /**
         * 创建文章路由路径
         *
         * 输入：模块 ID、文档 slug、文档标题
         * 输出：路由路径字符串（title 经 URL 编码避免特殊字符问题）
         */
        fun createRoute(moduleId: String, slug: String, title: String): String {
            val encodedTitle = try { URLEncoder.encode(title, "UTF-8") } catch (e: Exception) { Log.w(TAG, "URL 编码文章标题失败,使用原始字符串: ${e.message}", e); title }
            return "article/$moduleId/$slug/$encodedTitle"
        }
    }
}
