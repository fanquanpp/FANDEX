package com.fandex.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PreprocessMarkdownTest {

    @Test
    fun `块级公式替换为 math 围栏代码块`() {
        val input = "\$\$E=mc^2\$\$"
        val expected = "```math\nE=mc^2\n```"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    @Test
    fun `多行块级公式正确替换`() {
        val input = "前文\n\$\$\nx = 1\ny = 2\n\$\$\n后文"
        val expected = "前文\n```math\nx = 1\ny = 2\n```\n后文"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    @Test
    fun `行内公式替换为带美元符的行内代码`() {
        val input = "公式 \$x^2\$ 测试"
        val expected = "公式 `\$x^2\$` 测试"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    @Test
    fun `同一行多个行内公式均被替换`() {
        val input = "\$a\$ + \$b\$ = \$c\$"
        val expected = "`\$a\$` + `\$b\$` = `\$c\$`"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    @Test
    fun `TOC 大写标记被移除`() {
        val input = "[TOC]"

        val result = PreprocessMarkdown(input)

        assertEquals("", result)
    }

    @Test
    fun `toc 小写双括号标记被移除`() {
        val input = "[[toc]]"

        val result = PreprocessMarkdown(input)

        assertEquals("", result)
    }

    @Test
    fun `toc 花括号标记被移除`() {
        val input = "{:toc}"

        val result = PreprocessMarkdown(input)

        assertEquals("", result)
    }

    @Test
    fun `TOC 标记行被移除前后文保留`() {
        val input = "前文\n[TOC]\n后文"
        val expected = "前文\n\n后文"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    @Test
    fun `表格行内行内公式保持原样`() {
        val input = "| 列1 | \$x\$ |"

        val result = PreprocessMarkdown(input)

        assertEquals(input, result)
    }

    @Test
    fun `表格行跳过普通行替换`() {
        val input = "| 表头 | \$x\$ |\n|---|---|\n公式 \$y\$ 测试"
        val expected = "| 表头 | \$x\$ |\n|---|---|\n公式 `\$y\$` 测试"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    @Test
    fun `代码块内单个美元符不被误替换`() {
        val input = "```kotlin\nval \$cost = 10\n```"

        val result = PreprocessMarkdown(input)

        assertEquals(input, result)
    }

    @Test
    fun `代码块内不成对美元符不被误替换`() {
        val input = "```\n\$a\n```"

        val result = PreprocessMarkdown(input)

        assertEquals(input, result)
    }

    @Test
    fun `纯文本原样返回`() {
        val input = "# 标题\n\n普通段落文本，无公式无标记。"

        val result = PreprocessMarkdown(input)

        assertEquals(input, result)
    }

    @Test
    fun `块级与行内公式混合处理`() {
        val input = "块级：\$\$E=mc^2\$\$\n行内：\$x^2\$"
        val expected = "块级：```math\nE=mc^2\n```\n行内：`\$x^2\$`"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    @Test
    fun `块级公式处理后不干扰行内公式匹配`() {
        val input = "\$\$a+b\$\$ 和 \$c\$"
        val expected = "```math\na+b\n``` 和 `\$c\$`"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
        assertTrue("应包含 math 代码块", result.contains("```math"))
        assertTrue("应包含行内代码高亮", result.contains("`\$c\$`"))
        assertFalse("不应残留未替换的行内公式", result.contains(" \$c\$ "))
    }
}
