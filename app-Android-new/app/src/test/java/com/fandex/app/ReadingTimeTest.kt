package com.fandex.app

import com.fandex.app.data.repository.ReadingTime
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * 阅读时长估算单元测试
 *
 * 覆盖 compute 各分支：空文、纯代码块、Markdown 标记剥离、
 * 不足 300 字兜底 1 分钟、边界 300/301 字、长文进位
 */
class ReadingTimeTest {

    /** 空文本：无有效字符，兜底 1 分钟 */
    @Test
    fun emptyTextReturnsOneMinute() {
        assertEquals(1, ReadingTime.compute(""))
        assertEquals(1, ReadingTime.compute("   \n\t "))
    }

    /** 纯代码块：代码内容被整体剔除，兜底 1 分钟 */
    @Test
    fun codeBlockContentIsStripped() {
        val body = "```kotlin\n" + "val x = 1\n".repeat(100) + "```"
        assertEquals(1, ReadingTime.compute(body))
    }

    /** Markdown 标记字符（# * ` 等）不计入字数 */
    @Test
    fun markdownMarkersAreStripped() {
        // 299 个"字" + 全部为标记字符 -> 实际有效字符 0，兜底 1 分钟
        val markers = "#*`~[]()>_-!|".repeat(30)
        assertEquals(1, ReadingTime.compute(markers))
    }

    /** 不足 300 个有效字符：兜底 1 分钟 */
    @Test
    fun shortTextReturnsOneMinute() {
        assertEquals(1, ReadingTime.compute("短文本"))
        assertEquals(1, ReadingTime.compute("a".repeat(299)))
    }

    /** 恰好 300 个有效字符：1 分钟；301 个：2 分钟（向上取整） */
    @Test
    fun boundaryCharactersRoundUp() {
        assertEquals(1, ReadingTime.compute("a".repeat(300)))
        assertEquals(2, ReadingTime.compute("a".repeat(301)))
    }

    /** 长文本：非空白字符数 / 300 向上取整 */
    @Test
    fun longTextDividesByThreeHundred() {
        // 3000 字符 -> 10 分钟
        assertEquals(10, ReadingTime.compute("a".repeat(3000)))
        // 2999 字符 -> 10 分钟（向上取整）
        assertEquals(10, ReadingTime.compute("a".repeat(2999)))
    }

    /** 空白字符不计入有效字数 */
    @Test
    fun whitespaceIsNotCounted() {
        // 300 个字母 + 任意空白 -> 仍为 1 分钟
        assertEquals(1, ReadingTime.compute("a".repeat(300) + "\n" + " ".repeat(100)))
    }

    /** 组合场景：标题 + 正文 + 代码块混合 */
    @Test
    fun mixedContentIsHandled() {
        val body = buildString {
            appendLine("## 标题")                       // 标记剥离后 2 个汉字
            appendLine("这是正文内容。")                 // 6 个有效字符（含句号）
            appendLine("```bash\nnpm install\n```")     // 代码块剔除
        }
        // 有效字符约 8 个 -> 1 分钟（仅验证不因代码块误计）
        assertEquals(1, ReadingTime.compute(body))
    }
}
