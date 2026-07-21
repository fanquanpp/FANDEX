package com.fandex.app.ui.components

import android.util.Log
import androidx.compose.ui.graphics.Color

/**
 * 分类颜色解析工具
 *
 * 功能：将分类配置中的颜色字符串解析为 Compose Color 对象
 * 输入：颜色字符串（可能为 hex 形式如 "#4F5BD5" 或 "0xFF4F5BD5"）
 * 输出：对应的 Color 对象，解析失败时返回兜底颜色
 *
 * 设计说明：
 * 1. 集中颜色解析逻辑，消除项目内多处重复的 try-catch 模板代码
 * 2. 提供统一的兜底色（PrimaryBlue 0xFF4F5BD5），保证 UI 一致性
 * 3. 容错策略：输入为空、格式错误、不支持的格式均返回兜底色
 */
object CategoryColorParser {

    /** 日志 TAG */
    private const val TAG = "CategoryColorParser"

    /** 默认兜底颜色（FANDEX 品牌主色） */
    private val fallbackColor: Color = Color(0xFF4F5BD5)

    /**
     * 解析颜色字符串为 Color
     *
     * 输入：colorStr - 颜色字符串，可能为 null、空串或非法格式
     * 输出：解析成功的 Color 对象；输入非法时返回兜底颜色
     *
     * 流程：
     *   1. 输入为空或空白 -> 返回兜底色
     *   2. 调用 Android 系统颜色解析 -> 成功则包装为 Compose Color
     *   3. 解析异常 -> 返回兜底色
     */
    fun parse(colorStr: String?): Color {
        if (colorStr.isNullOrBlank()) return fallbackColor
        return try {
            Color(android.graphics.Color.parseColor(colorStr))
        } catch (e: Exception) {
            Log.e(TAG, "解析分类颜色失败,使用兜底色: ${e.message}", e)
            fallbackColor
        }
    }
}
