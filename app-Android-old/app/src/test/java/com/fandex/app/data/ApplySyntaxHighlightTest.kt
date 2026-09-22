package com.fandex.app.data

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontWeight
import com.fandex.app.ui.theme.MarkdownColorScheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ApplySyntaxHighlightTest {

    private val colorScheme: MarkdownColorScheme = MarkdownColorScheme.LightScheme

    @Test
    fun `关键字 token 被提取并应用 hlKeyword 颜色`() {
        val code = "val x"

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)

        val keywordSpans = result.spanStyles.filter { it.item.color == colorScheme.hlKeyword }
        assertEquals("应识别 1 个关键字 token", 1, keywordSpans.size)

        val span = keywordSpans[0]
        assertEquals("关键字 token 起始位置", 0, span.start)
        assertEquals("关键字 token 结束位置（exclusive）", 3, span.end)
        assertEquals("关键字 token 字体粗细", FontWeight.Medium, span.item.fontWeight)
    }

    @Test
    fun `多个关键字 token 均被提取`() {
        val code = "fun foo() { return 1 }"

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)

        val keywordSpans = result.spanStyles.filter { it.item.color == colorScheme.hlKeyword }
        assertEquals("应识别 2 个关键字 token", 2, keywordSpans.size)

        assertEquals(0, keywordSpans[0].start)
        assertEquals(3, keywordSpans[0].end)

        assertEquals(12, keywordSpans[1].start)
        assertEquals(18, keywordSpans[1].end)
    }

    @Test
    fun `双引号字符串 token 被提取并应用 hlString 颜色`() {
        val code = "\"hello\""

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)

        val stringSpans = result.spanStyles.filter { it.item.color == colorScheme.hlString }
        assertEquals("应识别 1 个字符串 token", 1, stringSpans.size)

        val span = stringSpans[0]
        assertEquals("字符串 token 起始位置", 0, span.start)
        assertEquals("字符串 token 结束位置（exclusive）", 7, span.end)
    }

    @Test
    fun `单引号字符串 token 被提取`() {
        val code = "'a'"

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)

        val stringSpans = result.spanStyles.filter { it.item.color == colorScheme.hlString }
        assertEquals("应识别 1 个字符串 token", 1, stringSpans.size)
        assertEquals(0, stringSpans[0].start)
        assertEquals(3, stringSpans[0].end)
    }

    @Test
    fun `含转义字符的字符串被完整识别`() {
        val code = "\"hello \\\"world\\\"\""

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)

        val stringSpans = result.spanStyles.filter { it.item.color == colorScheme.hlString }
        assertEquals("应识别 1 个字符串 token", 1, stringSpans.size)
        assertEquals(0, stringSpans[0].start)
        assertEquals(code.length, stringSpans[0].end)
    }

    @Test
    fun `单行注释 token 被提取并应用 hlComment 颜色`() {
        val code = "// comment"

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)

        val commentSpans = result.spanStyles.filter { it.item.color == colorScheme.hlComment }
        assertEquals("应识别 1 个注释 token", 1, commentSpans.size)

        val span = commentSpans[0]
        assertEquals("注释 token 起始位置", 0, span.start)
        assertEquals("注释 token 结束位置（exclusive）", 10, span.end)
    }

    @Test
    fun `块注释 token 被提取`() {
        val code = "/* block comment */"

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)

        val commentSpans = result.spanStyles.filter { it.item.color == colorScheme.hlComment }
        assertEquals("应识别 1 个注释 token", 1, commentSpans.size)
        assertEquals(0, commentSpans[0].start)
        assertEquals(code.length, commentSpans[0].end)
    }

    @Test
    fun `Python hash 注释被提取`() {
        val code = "# comment"

        val result = ApplySyntaxHighlight(code, "python", colorScheme)

        assertEquals(code, result.text)

        val commentSpans = result.spanStyles.filter { it.item.color == colorScheme.hlComment }
        assertEquals("应识别 1 个注释 token", 1, commentSpans.size)
        assertEquals(0, commentSpans[0].start)
        assertEquals(9, commentSpans[0].end)
    }

    @Test
    fun `关键字字符串注释混合提取`() {
        val code = "val s = \"hello\" // greet"

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)

        val keywordSpans = result.spanStyles.filter { it.item.color == colorScheme.hlKeyword }
        val stringSpans = result.spanStyles.filter { it.item.color == colorScheme.hlString }
        val commentSpans = result.spanStyles.filter { it.item.color == colorScheme.hlComment }

        assertEquals("关键字 token 数", 1, keywordSpans.size)
        assertEquals("字符串 token 数", 1, stringSpans.size)
        assertEquals("注释 token 数", 1, commentSpans.size)

        assertEquals(0, keywordSpans[0].start)
        assertEquals(3, keywordSpans[0].end)

        assertEquals(8, stringSpans[0].start)
        assertEquals(15, stringSpans[0].end)

        assertEquals(16, commentSpans[0].start)
        assertEquals(24, commentSpans[0].end)
    }

    @Test
    fun `字符串内关键字不被二次匹配`() {
        val code = "\"val\""

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)

        val stringSpans = result.spanStyles.filter { it.item.color == colorScheme.hlString }
        val keywordSpans = result.spanStyles.filter { it.item.color == colorScheme.hlKeyword }

        assertEquals("应识别 1 个字符串 token", 1, stringSpans.size)
        assertEquals("字符串内的 val 不应被识别为关键字 token", 0, keywordSpans.size)
    }

    @Test
    fun `math 语言不做语法高亮`() {
        val code = "E = mc^2"

        val result = ApplySyntaxHighlight(code, "math", colorScheme)

        assertEquals(code, result.text)
        assertTrue("math 语言不应产生 spanStyles", result.spanStyles.isEmpty())
    }

    @Test
    fun `空字符串不做语法高亮`() {
        val code = ""

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)
        assertTrue("空字符串不应产生 spanStyles", result.spanStyles.isEmpty())
    }

    @Test
    fun `未知语言不提取关键字`() {
        val code = "val x"

        val result = ApplySyntaxHighlight(code, "unknownlang", colorScheme)

        assertEquals(code, result.text)
        val keywordSpans = result.spanStyles.filter { it.item.color == colorScheme.hlKeyword }
        assertTrue("未知语言不应有关键字 token", keywordSpans.isEmpty())
    }
}
