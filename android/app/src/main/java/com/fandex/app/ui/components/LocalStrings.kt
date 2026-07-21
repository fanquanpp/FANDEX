package com.fandex.app.ui.components

import androidx.compose.runtime.staticCompositionLocalOf
import com.fandex.app.data.Strings

/**
 * 字符串集合的 CompositionLocal
 *
 * 功能：在 Compose 树中提供当前字符串集合（简体中文），避免通过参数逐层透传
 * 输入：LangStrings 实例（由顶层 Composable 通过 CompositionLocalProvider 注入，
 *       通常注入 Strings.default）
 * 输出：LocalStrings.current 可在任意子 Composable 中获取当前文案
 *
 * 使用示例：
 *   ```
 *   CompositionLocalProvider(LocalStrings provides Strings.default) {
 *       MarkdownContent(...)
 *   }
 *
 *   // 在子组件中读取
 *   val strings = LocalStrings.current
 *   Text(text = strings.copy)
 *   ```
 */
val LocalStrings = staticCompositionLocalOf<Strings.LangStrings> {
    error("LocalStrings 未提供：请在外层通过 CompositionLocalProvider(LocalStrings provides strings) 注入")
}
