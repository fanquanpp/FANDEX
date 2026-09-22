package com.fandex.app

import com.fandex.app.data.repository.FrontmatterParser
import org.junit.Assert.assertEquals
import org.junit.Test

class FrontmatterParserTest {

    @Test
    fun parsesAllTenStandardFields() {
        val markdown = """
            ---
            order: 40
            title: 标题
            module: 'getting-started'
            category: 工具链
            difficulty: intermediate
            description: 一句话描述。
            author: fanquanpp
            updated: '2026-08-01'
            related:
              - 'markdown/001-Overview'
              - "git/002-Basic"
            prerequisites:
              - 'getting-started/001-Intro'
            ---

            # 正文标题

            正文内容。
        """.trimIndent()

        val doc = FrontmatterParser.parseMarkdown(markdown, "040-Doc")

        assertEquals(40, doc.frontmatter.order)
        assertEquals("标题", doc.frontmatter.title)
        assertEquals("getting-started", doc.frontmatter.module)
        assertEquals("工具链", doc.frontmatter.category)
        assertEquals("intermediate", doc.frontmatter.difficulty)
        assertEquals("一句话描述。", doc.frontmatter.description)
        assertEquals("fanquanpp", doc.frontmatter.author)
        assertEquals("2026-08-01", doc.frontmatter.updated)
        assertEquals(listOf("markdown/001-Overview", "git/002-Basic"), doc.frontmatter.related)
        assertEquals(listOf("getting-started/001-Intro"), doc.frontmatter.prerequisites)

        assertEquals("# 正文标题\n\n正文内容。", doc.content)
        assertEquals("040-Doc", doc.slug)
    }

    @Test
    fun parsesMarkdownWithoutFrontmatter() {
        val markdown = "# 只有正文\n\n没有 frontmatter 围栏。"
        val doc = FrontmatterParser.parseMarkdown(markdown, "fallback-slug")

        assertEquals("fallback-slug", doc.frontmatter.title)
        assertEquals(markdown, doc.content)
        assertEquals(0, doc.frontmatter.order)
        assertEquals(emptyList<String>(), doc.frontmatter.related)
        assertEquals(emptyList<String>(), doc.frontmatter.prerequisites)
    }

    @Test
    fun fillsDefaultsForMissingFields() {
        val markdown = """
            ---
            title: 只有标题与正文
            ---

            正文。
        """.trimIndent()

        val doc = FrontmatterParser.parseMarkdown(markdown, "030-Partial")

        assertEquals("只有标题与正文", doc.frontmatter.title)
        assertEquals(0, doc.frontmatter.order)
        assertEquals("", doc.frontmatter.module)
        assertEquals("beginner", doc.frontmatter.difficulty)
        assertEquals("fanquanpp", doc.frontmatter.author)
        assertEquals("", doc.frontmatter.updated)
        assertEquals("正文。", doc.content)
    }

    @Test
    fun fallsBackToSlugWhenTitleMissing() {
        val markdown = "---\norder: 10\n---\n\n正文。"
        val doc = FrontmatterParser.parseMarkdown(markdown, "010-NoTitle")
        assertEquals("010-NoTitle", doc.frontmatter.title)
        assertEquals(10, doc.frontmatter.order)
    }

    @Test
    fun invalidOrderFallsBackToZero() {
        val doc = FrontmatterParser.parseFrontmatter("order: abc", "slug")
        assertEquals(0, doc.order)
    }

    @Test
    fun emptyBodyAfterFrontmatter() {
        val markdown = "---\ntitle: T\n---\n"
        val doc = FrontmatterParser.parseMarkdown(markdown, "slug")
        assertEquals("", doc.content)
        assertEquals("T", doc.frontmatter.title)
    }

    @Test
    fun parsesCrlfLineEndings() {
        val markdown = "---\r\norder: 50\r\ntitle: XSS 攻击\r\nrelated:\r\n  - 'a/001'\r\n---\r\n\r\n正文第一段。"
        val doc = FrontmatterParser.parseMarkdown(markdown, "005-XSSAttack")
        assertEquals("XSS 攻击", doc.frontmatter.title)
        assertEquals(50, doc.frontmatter.order)
        assertEquals(listOf("a/001"), doc.frontmatter.related)
        assertEquals("正文第一段。", doc.content)
    }

    @Test
    fun parsesCrLineEndings() {
        val markdown = "---\rtitle: T\r---\r\r正文。"
        val doc = FrontmatterParser.parseMarkdown(markdown, "slug")
        assertEquals("T", doc.frontmatter.title)
        assertEquals("正文。", doc.content)
    }

    @Test
    fun parsesRawYamlDirectly() {
        val fm = FrontmatterParser.parseFrontmatter("title: '带引号标题'\nrelated:\n- 'a/001'", "slug")
        assertEquals("带引号标题", fm.title)
        assertEquals(listOf("a/001"), fm.related)
    }
}
