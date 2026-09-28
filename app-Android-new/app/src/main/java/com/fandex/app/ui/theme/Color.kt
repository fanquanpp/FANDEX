package com.fandex.app.ui.theme

import androidx.compose.ui.graphics.Color

// 品牌基础色与语义色已统一由设计令牌生成，见 TokenColors.kt。
// 重新生成：pnpm --filter @fandex/tokens generate:kt

/**
 * 模块分类色：与 shd-shared/metadata/modules.json 的 categories 调色板
 * 保持一致（内容分类维度，非设计令牌体系）。
 */
object CategoryColors {
    val Tools = Color(0xFF4F5BD5)
    val Frontend = Color(0xFFD63031)
    val Backend = Color(0xFFE17055)
    val Database = Color(0xFF00B894)
    val Cs = Color(0xFF8854D0)
    val Math = Color(0xFF6C5CE7)
    val Cloud = Color(0xFFE05A2B)
}
