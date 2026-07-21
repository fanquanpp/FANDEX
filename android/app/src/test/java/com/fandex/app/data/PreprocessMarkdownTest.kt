package com.fandex.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * PreprocessMarkdown 单元测试
 *
 * 测试目标：
 * - LaTeX 块级公式 $$...$$ 替换为 ```math 围栏代码块
 * - LaTeX 行内公式 $...$ 替换为行内代码（带 $ 前后缀）
 * - TOC 标记（[TOC] / [[toc]] / {:toc}）移除
 * - 表格行（| 开头）内的 $...$ 保留，避免反引号破坏表格语法
 * - 代码块内的单个 $ 不被误替换为行内公式（正则要求成对 $）
 *
 * 测试策略：
 * - 直接调用 internal fun PreprocessMarkdown，验证输出字符串
 * - 每个用例覆盖一个独立功能点，断言精确字符串匹配
 */
class PreprocessMarkdownTest {

    /**
     * 测试块级公式 $$...$$ 替换
     *
     * 输入：`$$E=mc^2$$`
     * 期望：替换为 ```math\nE=mc^2\n``` 围栏代码块
     */
    @Test
    fun `块级公式替换为 math 围栏代码块`() {
        val input = "\$\$E=mc^2\$\$"
        val expected = "```math\nE=mc^2\n```"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    /**
     * 测试多行块级公式替换
     *
     * 输入：跨多行的 $$...$$ 公式
     * 期望：完整匹配多行内容并替换为 math 代码块
     */
    @Test
    fun `多行块级公式正确替换`() {
        val input = "前文\n\$\$\nx = 1\ny = 2\n\$\$\n后文"
        val expected = "前文\n```math\nx = 1\ny = 2\n```\n后文"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    /**
     * 测试行内公式 $...$ 替换
     *
     * 输入：`公式 $x^2$ 测试`
     * 期望：替换为 `公式 `$x^2$` 测试`（行内代码带 $ 前后缀）
     */
    @Test
    fun `行内公式替换为带美元符的行内代码`() {
        val input = "公式 \$x^2\$ 测试"
        val expected = "公式 `\$x^2\$` 测试"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    /**
     * 测试同一行内多个行内公式替换
     *
     * 输入：`$a$ + $b$ = $c$`
     * 期望：所有 $...$ 配对均被替换为行内代码
     */
    @Test
    fun `同一行多个行内公式均被替换`() {
        val input = "\$a\$ + \$b\$ = \$c\$"
        val expected = "`\$a\$` + `\$b\$` = `\$c\$`"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    /**
     * 测试 [TOC] 标记移除
     *
     * 输入：`[TOC]` 单独一行
     * 期望：被移除（替换为空字符串）
     */
    @Test
    fun `TOC 大写标记被移除`() {
        val input = "[TOC]"

        val result = PreprocessMarkdown(input)

        assertEquals("", result)
    }

    /**
     * 测试 [[toc]] 标记移除
     *
     * 输入：`[[toc]]` 单独一行
     * 期望：被移除
     */
    @Test
    fun `toc 小写双括号标记被移除`() {
        val input = "[[toc]]"

        val result = PreprocessMarkdown(input)

        assertEquals("", result)
    }

    /**
     * 测试 {:toc} 标记移除
     *
     * 输入：`{:toc}` 单独一行
     * 期望：被移除
     */
    @Test
    fun `toc 花括号标记被移除`() {
        val input = "{:toc}"

        val result = PreprocessMarkdown(input)

        assertEquals("", result)
    }

    /**
     * 测试 TOC 标记前后有正文时仅移除标记行
     *
     * 输入：`前文\n[TOC]\n后文`
     * 期望：仅 [TOC] 行被移除，前后文保留
     */
    @Test
    fun `TOC 标记行被移除前后文保留`() {
        val input = "前文\n[TOC]\n后文"
        val expected = "前文\n\n后文"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    /**
     * 测试表格行内的 $...$ 不被替换
     *
     * 输入：`| 列1 | $x$ |`
     * 期望：保持原样，$x$ 不被替换为行内代码（避免反引号破坏表格语法）
     */
    @Test
    fun `表格行内行内公式保持原样`() {
        val input = "| 列1 | \$x\$ |"

        val result = PreprocessMarkdown(input)

        assertEquals(input, result)
    }

    /**
     * 测试表格行与普通行混合场景
     *
     * 输入：表格行 + 普通行（含行内公式）
     * 期望：表格行保持原样，普通行的行内公式被替换
     */
    @Test
    fun `表格行跳过普通行替换`() {
        val input = "| 表头 | \$x\$ |\n|---|---|\n公式 \$y\$ 测试"
        val expected = "| 表头 | \$x\$ |\n|---|---|\n公式 `\$y\$` 测试"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    /**
     * 测试代码块内单个 $ 不被误替换
     *
     * 输入：代码块内含单个 $ 的变量名（如 PHP/Ruby 变量）
     * 期望：原样保留，因为单个 $ 无配对，不匹配行内公式正则
     *
     * 说明：PreprocessMarkdown 在 commonmark 解析前执行，
     *      代码块还未被识别，但行内公式正则要求成对 $...$，
     *      因此单个 $ 天然不会被替换，构成事实上的"代码块保护"
     */
    @Test
    fun `代码块内单个美元符不被误替换`() {
        val input = "```kotlin\nval \$cost = 10\n```"

        val result = PreprocessMarkdown(input)

        assertEquals(input, result)
    }

    /**
     * 测试代码块内不成对美元符不被误替换
     *
     * 输入：代码块内仅有单个 $（如 PHP 变量 $a），无配对 $
     * 期望：原样保留，因为行内公式正则要求成对 $...$
     *
     * 说明：3 个 $ 时前 2 个会配对被替换，因此真正的"不成对"场景需要 $ 数量为奇数且不连续配对。
     *      本用例使用单个 $ 验证最基础的不成对保护行为。
     */
    @Test
    fun `代码块内不成对美元符不被误替换`() {
        val input = "```\n\$a\n```"

        val result = PreprocessMarkdown(input)

        assertEquals(input, result)
    }

    /**
     * 测试纯文本无公式无标记时原样返回
     *
     * 输入：普通 Markdown 文本
     * 期望：原样返回，无任何替换
     */
    @Test
    fun `纯文本原样返回`() {
        val input = "# 标题\n\n普通段落文本，无公式无标记。"

        val result = PreprocessMarkdown(input)

        assertEquals(input, result)
    }

    /**
     * 测试块级公式与行内公式混合场景
     *
     * 输入：同时包含块级公式和行内公式
     * 期望：块级公式先被替换为 math 代码块，行内公式后被替换为行内代码
     */
    @Test
    fun `块级与行内公式混合处理`() {
        val input = "块级：\$\$E=mc^2\$\$\n行内：\$x^2\$"
        val expected = "块级：```math\nE=mc^2\n```\n行内：`\$x^2\$`"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
    }

    /**
     * 测试 $$ 不被误识别为行内公式
     *
     * 输入：块级公式处理后，math 代码块内的 ``` 不影响行内公式匹配
     * 期望：math 代码块完整保留，外部行内公式被替换
     */
    @Test
    fun `块级公式处理后不干扰行内公式匹配`() {
        val input = "\$\$a+b\$\$ 和 \$c\$"
        val expected = "```math\na+b\n``` 和 `\$c\$`"

        val result = PreprocessMarkdown(input)

        assertEquals(expected, result)
        // 额外断言：结果中包含 math 代码块
        assertTrue("应包含 math 代码块", result.contains("```math"))
        // 额外断言：行内公式被替换为行内代码
        assertTrue("应包含行内代码高亮", result.contains("`\$c\$`"))
        // 额外断言：不应残留原始行内公式 $c$（不在反引号内）
        assertFalse("不应残留未替换的行内公式", result.contains(" \$c\$ "))
    }
}
