package com.fandex.app.ui.components

import android.util.Log
import androidx.compose.ui.graphics.Color

object CategoryColorParser {

    private const val TAG = "CategoryColorParser"

    private val fallbackColor: Color = Color(0xFF4F5BD5)

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
