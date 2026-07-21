package com.fandex.app.data

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontWeight
import com.fandex.app.ui.theme.MarkdownColorScheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * ApplySyntaxHighlight 单元测试
 *
 * 测试目标：
 * - 关键字 token 提取：验证 Kotlin/Java 等语言关键字被识别并应用 hlKeyword 颜色
 * - 字符串 token 提取：验证单引号/双引号字符串被识别并应用 hlString 颜色
 * - 注释 token 提取：验证单行注释（//）与块注释（/* */）被识别并应用 hlComment 颜色
 *
 * 测试策略：
 * - 直接调用 internal fun ApplySyntaxHighlight，使用 MarkdownColorScheme.LightScheme
 * - 验证返回的 AnnotatedString.text 与输入 code 一致（不改变文本内容）
 * - 验证 spanStyles 数量、范围（start/end）与颜色（SpanStyle.color）符合预期
 */
class ApplySyntaxHighlightTest {

    /** 测试用颜色方案（使用 LightScheme 固定值，便于断言具体颜色） */
    private val colorScheme: MarkdownColorScheme = MarkdownColorScheme.LightScheme

    /**
     * 测试关键字 token 提取
     *
     * 输入：`val x`（Kotlin 代码）
     * 期望：
     * - 返回文本与输入一致
     * - spanStyles 包含 1 个关键字 token（val）
     * - token 范围为 0..3（exclusive end）
     * - token 颜色为 hlKeyword
     */
    @Test
    fun `关键字 token 被提取并应用 hlKeyword 颜色`() {
        val code = "val x"

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        // 验证文本不变
        assertEquals(code, result.text)

        // 验证 spanStyles 包含关键字 token
        val keywordSpans = result.spanStyles.filter { it.item.color == colorScheme.hlKeyword }
        assertEquals("应识别 1 个关键字 token", 1, keywordSpans.size)

        val span = keywordSpans[0]
        assertEquals("关键字 token 起始位置", 0, span.start)
        assertEquals("关键字 token 结束位置（exclusive）", 3, span.end)
        assertEquals("关键字 token 字体粗细", FontWeight.Medium, span.item.fontWeight)
    }

    /**
     * 测试多个关键字 token 提取
     *
     * 输入：`fun foo() { return 1 }`（Kotlin 代码）
     * 期望：识别出 fun、return 两个关键字 token
     */
    @Test
    fun `多个关键字 token 均被提取`() {
        val code = "fun foo() { return 1 }"

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)

        val keywordSpans = result.spanStyles.filter { it.item.color == colorScheme.hlKeyword }
        assertEquals("应识别 2 个关键字 token", 2, keywordSpans.size)

        // 第一个关键字 fun（位置 0..3，exclusive end）
        assertEquals(0, keywordSpans[0].start)
        assertEquals(3, keywordSpans[0].end)

        // 第二个关键字 return（位置 12..18，exclusive end）
        assertEquals(12, keywordSpans[1].start)
        assertEquals(18, keywordSpans[1].end)
    }

    /**
     * 测试字符串 token 提取（双引号）
     *
     * 输入：`"hello"`（双引号字符串）
     * 期望：
     * - 返回文本与输入一致
     * - spanStyles 包含 1 个字符串 token
     * - token 范围覆盖整个字符串（包含引号）
     * - token 颜色为 hlString
     */
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

    /**
     * 测试字符串 token 提取（单引号）
     *
     * 输入：`'a'`（单引号字符）
     * 期望：识别为字符串 token
     */
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

    /**
     * 测试字符串内含转义字符
     *
     * 输入：`"hello \"world\""`（含转义双引号）
     * 期望：完整识别为字符串 token（转义双引号不截断字符串）
     */
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

    /**
     * 测试单行注释 token 提取
     *
     * 输入：`// comment`（单行注释）
     * 期望：
     * - 返回文本与输入一致
     * - spanStyles 包含 1 个注释 token
     * - token 范围覆盖整行注释
     * - token 颜色为 hlComment
     */
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

    /**
     * 测试块注释 token 提取
     *
     * 输入：`/* block comment */`（块注释）
     * 期望：识别为注释 token
     */
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

    /**
     * 测试 Python hash 注释提取
     *
     * 输入：`# comment`（Python 风格注释）
     * 期望：识别为注释 token（Python 语言使用 # 注释）
     */
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

    /**
     * 测试关键字、字符串、注释混合场景
     *
     * 输入：`val s = "hello" // greet`（Kotlin 代码）
     * 期望：识别关键字 val、字符串 "hello"、注释 // greet 三个 token
     */
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

        // 关键字 val 在位置 0..3
        assertEquals(0, keywordSpans[0].start)
        assertEquals(3, keywordSpans[0].end)

        // 字符串 "hello" 在位置 8..15
        assertEquals(8, stringSpans[0].start)
        assertEquals(15, stringSpans[0].end)

        // 注释 // greet 在位置 16..24
        assertEquals(16, commentSpans[0].start)
        assertEquals(24, commentSpans[0].end)
    }

    /**
     * 测试字符串内关键字不被二次匹配
     *
     * 输入：`"val"`（字符串内含关键字 val）
     * 期望：字符串优先匹配，内部的 val 不被识别为关键字 token
     *
     * 说明：实现使用 processedRanges 跟踪已处理范围，避免重叠匹配
     */
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

    /**
     * 测试 math 语言不做语法高亮
     *
     * 输入：任意代码 + language="math"
     * 期望：返回纯文本 AnnotatedString，无 spanStyles
     */
    @Test
    fun `math 语言不做语法高亮`() {
        val code = "E = mc^2"

        val result = ApplySyntaxHighlight(code, "math", colorScheme)

        assertEquals(code, result.text)
        assertTrue("math 语言不应产生 spanStyles", result.spanStyles.isEmpty())
    }

    /**
     * 测试空字符串不做语法高亮
     *
     * 输入：空字符串
     * 期望：返回空 AnnotatedString，无 spanStyles
     */
    @Test
    fun `空字符串不做语法高亮`() {
        val code = ""

        val result = ApplySyntaxHighlight(code, "kotlin", colorScheme)

        assertEquals(code, result.text)
        assertTrue("空字符串不应产生 spanStyles", result.spanStyles.isEmpty())
    }

    /**
     * 测试未知语言不提取关键字
     *
     * 输入：`val x` + language="unknownlang"
     * 期望：无关键字 token（LanguageKeywords 中无 unknownlang 映射）
     */
    @Test
    fun `未知语言不提取关键字`() {
        val code = "val x"

        val result = ApplySyntaxHighlight(code, "unknownlang", colorScheme)

        assertEquals(code, result.text)
        val keywordSpans = result.spanStyles.filter { it.item.color == colorScheme.hlKeyword }
        assertTrue("未知语言不应有关键字 token", keywordSpans.isEmpty())
    }
}
