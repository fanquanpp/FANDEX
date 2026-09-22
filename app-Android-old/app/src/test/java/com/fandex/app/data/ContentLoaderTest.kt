package com.fandex.app.data

import android.content.Context
import android.content.res.AssetManager
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream

class ContentLoaderTest {

    private val mockContext: Context = mock()

    private val mockAssets: AssetManager = mock()

    @Test
    fun `loadIndex 正常解析返回有效 ContentIndex`() = runTest {
        val json = """
            {
              "version": "1.0.0",
              "generatedAt": "2026-07-14",
              "categories": [
                {"id": "backend", "label": "后端", "color": "#1976D2"}
              ],
              "modules": [
                {"id": "java", "title": "Java", "category": "backend"}
              ],
              "documents": [
                {"slug": "java-basic", "title": "Java 基础", "module": "java"}
              ]
            }
        """.trimIndent()
        val stream: InputStream = ByteArrayInputStream(json.toByteArray(Charsets.UTF_8))

        whenever(mockContext.assets).thenReturn(mockAssets)
        whenever(mockAssets.open("dist-mobile/index.json")).thenReturn(stream)

        val result = ContentLoader.loadIndex(mockContext)

        assertNotNull(result)
        result!!
        assertEquals("1.0.0", result.version)
        assertEquals("2026-07-14", result.generatedAt)
        assertEquals(1, result.categories.size)
        assertEquals("backend", result.categories[0].id)
        assertEquals("后端", result.categories[0].label)
        assertEquals("#1976D2", result.categories[0].color)
        assertEquals(1, result.modules.size)
        assertEquals("java", result.modules[0].id)
        assertEquals("Java", result.modules[0].title)
        assertEquals("backend", result.modules[0].category)
        assertEquals(1, result.documents.size)
        assertEquals("java-basic", result.documents[0].slug)
        assertEquals("Java 基础", result.documents[0].title)
        assertEquals("java", result.documents[0].module)
    }

    @Test
    fun `loadIndex 文件不存在返回 null`() = runTest {
        whenever(mockContext.assets).thenReturn(mockAssets)
        whenever(mockAssets.open("dist-mobile/index.json"))
            .thenThrow(IOException("file not found"))

        val result = ContentLoader.loadIndex(mockContext)

        assertNull(result)
    }

    @Test
    fun `loadIndex JSON 格式错误返回 null`() = runTest {
        val brokenJson = """{ "version": "broken", "categories": [ }"""
        val stream: InputStream = ByteArrayInputStream(brokenJson.toByteArray(Charsets.UTF_8))

        whenever(mockContext.assets).thenReturn(mockAssets)
        whenever(mockAssets.open("dist-mobile/index.json")).thenReturn(stream)

        val result = ContentLoader.loadIndex(mockContext)

        assertNull(result)
    }

    @Test
    fun `loadDocumentMarkdown 正常加载返回内容`() = runTest {
        val markdown = "# 测试文档\n\n正文内容"
        val stream: InputStream = ByteArrayInputStream(markdown.toByteArray(Charsets.UTF_8))

        whenever(mockContext.assets).thenReturn(mockAssets)
        whenever(mockAssets.open("dist-mobile/docs/java/java-basic.md")).thenReturn(stream)

        val result = ContentLoader.loadDocumentMarkdown(mockContext, "java", "java-basic")

        assertNotNull(result)
        assertEquals(markdown, result)
    }

    @Test
    fun `loadDocumentMarkdown 异常路径返回 null`() = runTest {
        whenever(mockContext.assets).thenReturn(mockAssets)
        whenever(mockAssets.open("dist-mobile/docs/unknown/unknown.md"))
            .thenThrow(IOException("not found"))

        val result = ContentLoader.loadDocumentMarkdown(mockContext, "unknown", "unknown")

        assertNull(result)
    }
}
