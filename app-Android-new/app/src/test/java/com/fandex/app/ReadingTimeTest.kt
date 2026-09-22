package com.fandex.app

import com.fandex.app.data.repository.ReadingTime
import org.junit.Assert.assertEquals
import org.junit.Test

class ReadingTimeTest {

    @Test
    fun emptyTextReturnsOneMinute() {
        assertEquals(1, ReadingTime.compute(""))
        assertEquals(1, ReadingTime.compute("   \n\t "))
    }

    @Test
    fun codeBlockContentIsStripped() {
        val body = "```kotlin\n" + "val x = 1\n".repeat(100) + "```"
        assertEquals(1, ReadingTime.compute(body))
    }

    @Test
    fun markdownMarkersAreStripped() {
        val markers = "#*`~[]()>_-!|".repeat(30)
        assertEquals(1, ReadingTime.compute(markers))
    }

    @Test
    fun shortTextReturnsOneMinute() {
        assertEquals(1, ReadingTime.compute("短文本"))
        assertEquals(1, ReadingTime.compute("a".repeat(299)))
    }

    @Test
    fun boundaryCharactersRoundUp() {
        assertEquals(1, ReadingTime.compute("a".repeat(300)))
        assertEquals(2, ReadingTime.compute("a".repeat(301)))
    }

    @Test
    fun longTextDividesByThreeHundred() {
        assertEquals(10, ReadingTime.compute("a".repeat(3000)))
        assertEquals(10, ReadingTime.compute("a".repeat(2999)))
    }

    @Test
    fun whitespaceIsNotCounted() {
        assertEquals(1, ReadingTime.compute("a".repeat(300) + "\n" + " ".repeat(100)))
    }

    @Test
    fun mixedContentIsHandled() {
        val body = buildString {
            appendLine("## 标题")
            appendLine("这是正文内容。")
            appendLine("```bash\nnpm install\n```")
        }
        assertEquals(1, ReadingTime.compute(body))
    }
}
