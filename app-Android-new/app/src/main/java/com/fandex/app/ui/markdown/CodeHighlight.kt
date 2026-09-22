package com.fandex.app.ui.markdown

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.buildAnnotatedString
import com.fandex.app.ui.theme.LocalExtendedColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun rememberHighlightedCode(code: String, language: String): AnnotatedString {
    val extendedColors = LocalExtendedColors.current
    return produceState(
        initialValue = buildAnnotatedString { append(code) },
        code,
        language,
        extendedColors
    ) {
        value = withContext(Dispatchers.Default) {
            val palette = SyntaxHighlighter.Palette(
                text = 0,
                keyword = extendedColors.codeKeyword.toArgb(),
                string = extendedColors.codeString.toArgb(),
                number = extendedColors.codeNumber.toArgb(),
                comment = extendedColors.codeComment.toArgb(),
                annotation = extendedColors.codeAnnotation.toArgb(),
                function = extendedColors.codeFunction.toArgb(),
                tag = extendedColors.codeTag.toArgb()
            )
            SyntaxHighlighter.highlight(code, language, palette)
        }
    }.value
}
