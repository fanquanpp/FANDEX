package com.fandex.app.ui.components

import androidx.compose.runtime.staticCompositionLocalOf
import com.fandex.app.data.Strings

val LocalStrings = staticCompositionLocalOf<Strings.LangStrings> {
    error("LocalStrings 未提供：请在外层通过 CompositionLocalProvider(LocalStrings provides strings) 注入")
}
