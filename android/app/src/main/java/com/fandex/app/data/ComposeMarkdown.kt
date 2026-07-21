package com.fandex.app.data

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.util.Log
import androidx.annotation.VisibleForTesting
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.commonmark.ext.gfm.strikethrough.Strikethrough
import org.commonmark.ext.gfm.strikethrough.StrikethroughExtension
import org.commonmark.ext.gfm.tables.TableBody
import org.commonmark.ext.gfm.tables.TableCell
import org.commonmark.ext.gfm.tables.TableHead
import org.commonmark.ext.gfm.tables.TableRow
import org.commonmark.ext.gfm.tables.TablesExtension
import org.commonmark.node.BlockQuote
import org.commonmark.node.BulletList
import org.commonmark.node.Code
import org.commonmark.node.Emphasis
import org.commonmark.node.FencedCodeBlock
import org.commonmark.node.Heading
import org.commonmark.node.HtmlBlock
import org.commonmark.node.Image
import org.commonmark.node.IndentedCodeBlock
import org.commonmark.node.Link
import org.commonmark.node.ListItem
import org.commonmark.node.Node
import org.commonmark.node.OrderedList
import org.commonmark.node.Paragraph
import org.commonmark.node.SoftLineBreak
import org.commonmark.node.StrongEmphasis
import org.commonmark.node.Text
import org.commonmark.node.ThematicBreak
import org.commonmark.parser.Parser
import com.fandex.app.ui.components.LocalStrings
import com.fandex.app.ui.theme.LocalMarkdownColorScheme
import com.fandex.app.ui.theme.MarkdownColorScheme

/** 日志 TAG */
private const val TAG = "ComposeMarkdown"

/**
 * Compose 原生 Markdown 渲染器
 *
 * 功能：使用 commonmark-java 解析 Markdown AST，遍历节点使用 Compose 原生组件渲染
 * 输入：Markdown 文本、字体缩放比例（颜色方案通过 LocalMarkdownColorScheme 注入）
 * 输出：Compose 原生 UI 组件树（完全不使用 WebView）
 *
 * 设计原则：
 * - AST 遍历递归渲染，每个节点类型对应独立 Composable
 * - 行内格式使用 AnnotatedString.Builder + pushStyle/pop 实现
 * - 代码块使用 horizontalScroll + monospace font
 * - 表格使用 Row/Column 布局，支持横向滚动
 * - 颜色使用 LocalMarkdownColorScheme 注入的 MarkdownColorScheme
 * - 支持字体缩放（fontSizeScale 参数，0.8-1.4）
 * - 支持深色/浅色模式（由 FANDEXTheme 通过 CompositionLocalProvider 自动注入）
 */

/** commonmark 解析器（线程安全，全局复用） */
private val markdownParser: Parser = Parser.builder()
    .extensions(listOf(TablesExtension.create(), StrikethroughExtension.create()))
    .build()

/**
 * Markdown 预处理：转换 LaTeX 数学公式和 [TOC] 目录标记
 *
 * 输入：原始 Markdown 文本
 * 输出：处理后的 Markdown 文本
 *
 * 流程：
 * 1. 块级公式 $$...$$ -> 围栏代码块 ```math ... ```
 * 2. 行内公式 $...$ -> 行内代码 `...`（带 $ 前后缀标记）
 *    注意：表格行内的行内公式不替换，避免反引号破坏表格语法
 * 3. [TOC] / [[toc]] / {:toc} -> 移除（目录标记在离线应用中无法跳转）
 */
@VisibleForTesting
internal fun PreprocessMarkdown(markdown: String): String {
    /* 第一步：处理块级公式 $$...$$（必须先处理，避免被行内公式匹配干扰） */
    /* 使用非贪婪匹配，支持多行公式 */
    var result = Regex("""\$\$\s*([\s\S]*?)\s*\$\$""").replace(markdown) { match ->
        val formula = match.groupValues[1].trim()
        "```math\n${formula}\n```"
    }

    /* 第二步：逐行处理行内公式 $...$，跳过表格行 */
    /* 表格行以 | 开头，其中的 $...$ 是公式，替换为行内代码会插入反引号破坏表格语法 */
    val blockFormulaPattern = Regex("""```math[\s\S]*?```""")
    result = result.lineSequence().joinToString("\n") { line ->
        if (line.trimStart().startsWith("|")) {
            /* 表格行：保留原始 $...$ 不替换，commonmark 会将其作为普通文本渲染 */
            line
        } else {
            /* 非表格行：替换行内公式为行内代码 */
            blockFormulaPattern.replace(line) { it.value }.let { processedLine ->
                Regex("""(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)""").replace(processedLine) { match ->
                    val formula = match.groupValues[1]
                    "`$${formula}$`"
                }
            }
        }
    }

    /* 第三步：移除 [TOC] / [[toc]] / {:toc} 目录标记 */
    result = result.replace(Regex("""^\[TOC\]\s*$""", RegexOption.MULTILINE), "")
    result = result.replace(Regex("""^\[\[toc\]\]\s*$""", RegexOption.MULTILINE), "")
    result = result.replace(Regex("""^\{:toc\}\s*$""", RegexOption.MULTILINE), "")

    return result
}

/**
 * Markdown 内容主 Composable
 *
 * 输入：
 * - markdown: Markdown 原始文本
 * - fontSizeScale: 字体缩放比例（0.8-1.4，默认 1.0）
 *
 * 输出：Compose 原生渲染的 Markdown 内容
 *
 * 流程：从 LocalMarkdownColorScheme 读取颜色方案 -> 解析 Markdown -> 遍历 AST -> 递归渲染各节点类型
 *
 * 说明：颜色方案由 FANDEXTheme 通过 CompositionLocalProvider 注入，无需传入 isDarkMode 参数
 */
@Composable
fun MarkdownContent(
    markdown: String,
    fontSizeScale: Float = 1.0f,
    scrollState: ScrollState = rememberScrollState()
) {
    val clampedScale = fontSizeScale.coerceIn(0.8f, 1.4f)
    val processedMarkdown = remember(markdown) { PreprocessMarkdown(markdown) }
    val document = remember(markdown) { markdownParser.parse(processedMarkdown) }
    val colorScheme = LocalMarkdownColorScheme.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(scrollState)
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        RenderBlockNodes(
            node = document.firstChild,
            colorScheme = colorScheme,
            fontSizeScale = clampedScale
        )
    }
}

/**
 * 渲染块级节点序列
 *
 * 输入：
 * - node: 起始节点（遍历其后续兄弟）
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：按顺序渲染所有块级兄弟节点
 *
 * 流程：遍历 node 的兄弟链表，根据节点类型分派到对应渲染函数
 */
@Composable
private fun RenderBlockNodes(
    node: Node?,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    var current = node
    while (current != null) {
        when (current) {
            is Heading -> RenderHeading(current, colorScheme, fontSizeScale)
            is Paragraph -> RenderParagraph(current, colorScheme, fontSizeScale)
            is BulletList -> RenderBulletList(current, colorScheme, fontSizeScale)
            is OrderedList -> RenderOrderedList(current, colorScheme, fontSizeScale)
            is BlockQuote -> RenderBlockQuote(current, colorScheme, fontSizeScale)
            is FencedCodeBlock -> RenderFencedCodeBlock(current, colorScheme, fontSizeScale)
            is IndentedCodeBlock -> RenderIndentedCodeBlock(current, colorScheme, fontSizeScale)
            is ThematicBreak -> RenderThematicBreak(colorScheme)
            is TableHead -> RenderTableHead(current, colorScheme, fontSizeScale)
            is TableBody -> RenderTableBody(current, colorScheme, fontSizeScale)
            is HtmlBlock -> RenderHtmlBlock(current, colorScheme, fontSizeScale)
            is Image -> RenderImagePlaceholder(current, colorScheme, fontSizeScale)
            else -> {
                /* 未知块级节点，尝试递归渲染其子节点 */
                if (current.firstChild != null) {
                    RenderBlockNodes(current.firstChild, colorScheme, fontSizeScale)
                }
            }
        }
        current = current.next
    }
}

/**
 * 渲染标题 h1-h6
 *
 * 输入：
 * - heading: Heading 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：带左边框装饰的标题文本
 *
 * 流程：根据 level 选择字号和样式 -> 构建左边框装饰 -> 渲染行内内容
 */
@Composable
private fun RenderHeading(
    heading: Heading,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    val headingConfig = when (heading.level) {
        1 -> HeadingConfig(
            fontSize = 24.sp * fontSizeScale,
            borderColor = colorScheme.headingBorder1,
            borderWidth = 3.dp
        )
        2 -> HeadingConfig(
            fontSize = 20.sp * fontSizeScale,
            borderColor = colorScheme.headingBorder2,
            borderWidth = 2.dp
        )
        3 -> HeadingConfig(
            fontSize = 17.sp * fontSizeScale,
            borderColor = colorScheme.headingBorder3,
            borderWidth = 3.dp
        )
        4 -> HeadingConfig(
            fontSize = 15.sp * fontSizeScale,
            borderColor = colorScheme.headingBorder4,
            borderWidth = 1.dp
        )
        5 -> HeadingConfig(
            fontSize = 14.sp * fontSizeScale,
            borderColor = colorScheme.headingBorder5,
            borderWidth = 1.dp
        )
        else -> HeadingConfig(
            fontSize = 13.sp * fontSizeScale,
            borderColor = colorScheme.headingBorder6,
            borderWidth = 1.dp
        )
    }

    val inlineContent = BuildInlineAnnotatedString(heading.firstChild, colorScheme, fontSizeScale)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 16.dp, bottom = 8.dp)
            .drawBehind {
                drawLine(
                    color = headingConfig.borderColor,
                    start = Offset(0f, 0f),
                    end = Offset(0f, size.height),
                    strokeWidth = headingConfig.borderWidth.toPx()
                )
            }
            .padding(start = 12.dp)
    ) {
        Text(
            text = inlineContent,
            fontSize = headingConfig.fontSize,
            fontWeight = FontWeight.Bold,
            color = colorScheme.onBackground,
            lineHeight = headingConfig.fontSize * 1.4f
        )
    }
}

/**
 * 渲染段落
 *
 * 输入：
 * - paragraph: Paragraph 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：两端对齐的段落文本
 *
 * 流程：构建行内 AnnotatedString -> 渲染两端对齐文本
 */
@Composable
private fun RenderParagraph(
    paragraph: Paragraph,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    val inlineContent = BuildInlineAnnotatedString(paragraph.firstChild, colorScheme, fontSizeScale)
    val baseFontSize = 15.sp * fontSizeScale

    Text(
        text = inlineContent,
        fontSize = baseFontSize,
        color = colorScheme.onBackground,
        lineHeight = baseFontSize * 1.85f,
        textAlign = TextAlign.Justify,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    )
}

/**
 * 渲染无序列表
 *
 * 输入：
 * - bulletList: BulletList 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：带自定义圆点的无序列表
 *
 * 流程：遍历 ListItem 子节点 -> 渲染圆点 + 内容
 */
@Composable
private fun RenderBulletList(
    bulletList: BulletList,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    Column(modifier = Modifier.fillMaxWidth().padding(start = 8.dp, top = 4.dp, bottom = 4.dp)) {
        var item = bulletList.firstChild
        while (item != null) {
            if (item is ListItem) {
                RenderListItem(item, colorScheme, fontSizeScale, isOrdered = false, orderNumber = 0)
            }
            item = item.next
        }
    }
}

/**
 * 渲染有序列表
 *
 * 输入：
 * - orderedList: OrderedList 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：带数字编号的有序列表
 *
 * 流程：遍历 ListItem 子节点 -> 递增编号 -> 渲染编号 + 内容
 */
@Composable
private fun RenderOrderedList(
    orderedList: OrderedList,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    Column(modifier = Modifier.fillMaxWidth().padding(start = 8.dp, top = 4.dp, bottom = 4.dp)) {
        var item = orderedList.firstChild
        var index = orderedList.startNumber
        while (item != null) {
            if (item is ListItem) {
                RenderListItem(item, colorScheme, fontSizeScale, isOrdered = true, orderNumber = index)
                index++
            }
            item = item.next
        }
    }
}

/**
 * 渲染列表项
 *
 * 输入：
 * - listItem: ListItem 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 * - isOrdered: 是否有序列表
 * - orderNumber: 有序列表编号
 *
 * 输出：带前缀标记的列表项
 *
 * 流程：渲染圆点或编号 -> 渲染列表项内容（可能包含子列表）
 */
@Composable
private fun RenderListItem(
    listItem: ListItem,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float,
    isOrdered: Boolean,
    orderNumber: Int
) {
    val baseFontSize = 15.sp * fontSizeScale

    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
        verticalAlignment = Alignment.Top
    ) {
        /* 列表前缀标记 */
        if (isOrdered) {
            Text(
                text = "$orderNumber.",
                fontSize = baseFontSize,
                fontWeight = FontWeight.SemiBold,
                color = colorScheme.primary,
                modifier = Modifier.width(28.dp)
            )
        } else {
            Box(
                modifier = Modifier
                    .width(28.dp)
                    .padding(top = (baseFontSize.value * 1.2f).dp / 2),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .width(5.dp)
                        .height(5.dp)
                        .background(
                            color = colorScheme.primary.copy(alpha = 0.6f),
                            shape = RoundedCornerShape(50)
                        )
                )
            }
        }

        /* 列表项内容 */
        Column(modifier = Modifier.weight(1f)) {
            var child = listItem.firstChild
            while (child != null) {
                when (child) {
                    is Paragraph -> {
                        val inlineContent = BuildInlineAnnotatedString(
                            child.firstChild, colorScheme, fontSizeScale
                        )
                        Text(
                            text = inlineContent,
                            fontSize = baseFontSize,
                            color = colorScheme.onBackground,
                            lineHeight = baseFontSize * 1.85f
                        )
                    }
                    is BulletList -> RenderBulletList(child, colorScheme, fontSizeScale)
                    is OrderedList -> RenderOrderedList(child, colorScheme, fontSizeScale)
                    else -> {
                        if (child.firstChild != null) {
                            RenderBlockNodes(child.firstChild, colorScheme, fontSizeScale)
                        }
                    }
                }
                child = child.next
            }
        }
    }
}

/**
 * 渲染引用块
 *
 * 输入：
 * - blockQuote: BlockQuote 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：带左边框和背景色的引用块
 *
 * 流程：构建左边框 + 背景色容器 -> 递归渲染引用内子节点
 */
@Composable
private fun RenderBlockQuote(
    blockQuote: BlockQuote,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .drawBehind {
                drawLine(
                    color = colorScheme.blockquoteBorder,
                    start = Offset(0f, 0f),
                    end = Offset(0f, size.height),
                    strokeWidth = 3.dp.toPx()
                )
            }
            .background(
                color = colorScheme.blockquoteBg,
                shape = RoundedCornerShape(topEnd = 4.dp, bottomEnd = 4.dp)
            )
            .padding(start = 12.dp, end = 12.dp, top = 8.dp, bottom = 8.dp)
    ) {
        Column {
            RenderBlockNodes(blockQuote.firstChild, colorScheme, fontSizeScale)
        }
    }
}

/**
 * 渲染围栏代码块
 *
 * 输入：
 * - codeBlock: FencedCodeBlock 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：带语言标签、复制按钮、语法高亮、水平滚动的代码块
 *
 * 流程：提取语言和代码 -> 语法高亮 -> 渲染语言标签 + 复制按钮 + 代码内容
 *
 * v3.1.0 增强：当语言为 math 时，调用 MathFormulaBlock 渲染 LaTeX 公式
 */
@Composable
private fun RenderFencedCodeBlock(
    codeBlock: FencedCodeBlock,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    val context = LocalContext.current
    /* 从 CompositionLocal 获取当前语言文案，用于代码块顶部语言标签与复制按钮 */
    val strings = LocalStrings.current
    val codeFontSize = 13.sp * fontSizeScale
    val language = codeBlock.info.trim()
    val code = codeBlock.literal
    val isCopied = remember { mutableStateOf(false) }

    /* v3.1.0：math 语言走 LaTeX 公式渲染路径 */
    if (language.lowercase() == "math") {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 6.dp)
                .border(
                    width = 1.dp,
                    color = colorScheme.codeBorder,
                    shape = RoundedCornerShape(6.dp)
                )
                .background(
                    color = colorScheme.codeBg,
                    shape = RoundedCornerShape(6.dp)
                )
        ) {
            /* 顶部栏：LaTeX 标签 + 复制按钮 */
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colorScheme.codeHeaderBg)
                    .padding(horizontal = 12.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = strings.latexLabel,
                    fontSize = 11.sp * fontSizeScale,
                    fontFamily = FontFamily.Monospace,
                    color = colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f)
                )
                TextButton(
                    onClick = {
                        CopyToClipboard(context, code)
                        isCopied.value = true
                    },
                    contentPadding = ButtonDefaults.TextButtonContentPadding,
                    modifier = Modifier.height(28.dp)
                ) {
                    Text(
                        text = if (isCopied.value) strings.copied else strings.copy,
                        fontSize = 11.sp * fontSizeScale,
                        color = if (isCopied.value) colorScheme.primary else colorScheme.onSurfaceVariant
                    )
                }
            }
            /* 公式内容：调用 MathFormulaBlock 渲染 */
            MathFormulaBlock(
                formula = code.trim(),
                colorScheme = colorScheme,
                fontSizeScale = fontSizeScale
            )
        }
        return
    }

    /* 语法高亮处理 */
    val highlightedCode = remember(code, language) {
        ApplySyntaxHighlight(code, language, colorScheme)
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .border(
                width = 1.dp,
                color = colorScheme.codeBorder,
                shape = RoundedCornerShape(6.dp)
            )
            .background(
                color = colorScheme.codeBg,
                shape = RoundedCornerShape(6.dp)
            )
    ) {
        /* 顶部栏：语言标签 + 复制按钮（始终显示，保证代码块头部信息完整） */
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colorScheme.codeHeaderBg)
                .padding(horizontal = 12.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            /* 语言标签 */
                Text(
                    text = when {
                        language == "math" -> strings.latexLabel
                        language.isBlank() -> strings.codeLabel
                        else -> language
                    },
                fontSize = 11.sp * fontSizeScale,
                fontFamily = FontFamily.Monospace,
                color = colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f)
            )

            /* 复制按钮 */
            TextButton(
                onClick = {
                    CopyToClipboard(context, code)
                    isCopied.value = true
                },
                contentPadding = ButtonDefaults.TextButtonContentPadding,
                modifier = Modifier.height(28.dp)
            ) {
                Text(
                    text = if (isCopied.value) strings.copied else strings.copy,
                    fontSize = 11.sp * fontSizeScale,
                    color = if (isCopied.value) colorScheme.primary else colorScheme.onSurfaceVariant
                )
            }
        }

        /* 代码内容（水平可滚动） */
        val scrollState = rememberScrollState()
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(scrollState)
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Text(
                text = highlightedCode,
                fontSize = codeFontSize,
                fontFamily = FontFamily.Monospace,
                color = colorScheme.onBackground,
                lineHeight = codeFontSize * 1.6f
            )
        }
    }
}

/**
 * 渲染缩进代码块
 *
 * 输入：
 * - codeBlock: IndentedCodeBlock 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：等宽字体的代码块（无语言标签）
 *
 * 流程：提取代码文本 -> 渲染为等宽字体文本
 */
@Composable
private fun RenderIndentedCodeBlock(
    codeBlock: IndentedCodeBlock,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    val codeFontSize = 13.sp * fontSizeScale
    val code = codeBlock.literal

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .border(
                width = 1.dp,
                color = colorScheme.codeBorder,
                shape = RoundedCornerShape(6.dp)
            )
            .background(
                color = colorScheme.codeBg,
                shape = RoundedCornerShape(6.dp)
            )
            .horizontalScroll(rememberScrollState())
            .padding(12.dp)
    ) {
        Text(
            text = code,
            fontSize = codeFontSize,
            fontFamily = FontFamily.Monospace,
            color = colorScheme.onBackground,
            lineHeight = codeFontSize * 1.6f
        )
    }
}

/**
 * 渲染水平分割线
 *
 * 输入：
 * - colorScheme: 颜色方案
 *
 * 输出：水平分割线
 *
 * 流程：使用 HorizontalDivider 渲染
 */
@Composable
private fun RenderThematicBreak(colorScheme: MarkdownColorScheme) {
    HorizontalDivider(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp),
        thickness = 1.dp,
        color = colorScheme.outlineVariant
    )
}

/**
 * 渲染表格头部
 *
 * 输入：
 * - tableHead: TableHead 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：带背景色的表头行
 *
 * 流程：遍历 TableRow -> 遍历 TableCell -> 渲染表头单元格
 */
@Composable
private fun RenderTableHead(
    tableHead: TableHead,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    var row = tableHead.firstChild
    while (row != null) {
        if (row is TableRow) {
            RenderTableRow(
                tableRow = row,
                colorScheme = colorScheme,
                fontSizeScale = fontSizeScale,
                isHeader = true
            )
        }
        row = row.next
    }
}

/**
 * 渲染表格主体
 *
 * 输入：
 * - tableBody: TableBody 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：表格数据行
 *
 * 流程：遍历 TableRow -> 渲染数据单元格
 */
@Composable
private fun RenderTableBody(
    tableBody: TableBody,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    var row = tableBody.firstChild
    var rowIndex = 0
    while (row != null) {
        if (row is TableRow) {
            RenderTableRow(
                tableRow = row,
                colorScheme = colorScheme,
                fontSizeScale = fontSizeScale,
                isHeader = false,
                isEvenRow = rowIndex % 2 == 1
            )
            rowIndex++
        }
        row = row.next
    }
}

/**
 * 渲染表格行
 *
 * 输入：
 * - tableRow: TableRow 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 * - isHeader: 是否表头行
 * - isEvenRow: 是否偶数行（用于交替背景色）
 *
 * 输出：水平排列的表格单元格行
 *
 * 流程：遍历 TableCell -> 渲染每个单元格（使用 weight(1f) 均分宽度）
 *
 * 修复：
 * - 移除 width(IntrinsicSize.Min)，改用 weight(1f) 均分列宽
 * - 整个表格使用 horizontalScroll 支持横向滚动
 * - 表格外层包装确保列对齐
 */
@Composable
private fun RenderTableRow(
    tableRow: TableRow,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float,
    isHeader: Boolean,
    isEvenRow: Boolean = false
) {
    val cellFontSize = 13.sp * fontSizeScale
    val cellBgColor = when {
        isHeader -> colorScheme.tableHeaderBg
        isEvenRow -> colorScheme.surfaceVariant
        else -> colorScheme.surface
    }
    val cellTextColor = if (isHeader) colorScheme.tableHeaderFg else colorScheme.onBackground

    /* 收集当前行的所有单元格 */
    val cells = mutableListOf<TableCell>()
    var cell = tableRow.firstChild
    while (cell != null) {
        if (cell is TableCell) {
            cells.add(cell)
        }
        cell = cell.next
    }

    /* 每列使用 weight(1f) 均分宽度，确保列对齐 */
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(cellBgColor)
    ) {
        cells.forEach { tableCell ->
            val inlineContent = BuildInlineAnnotatedString(
                tableCell.firstChild, colorScheme, fontSizeScale
            )
            Box(
                modifier = Modifier
                    .weight(1f)
                    .border(1.dp, colorScheme.outlineVariant)
                    .padding(horizontal = 6.dp, vertical = 5.dp)
            ) {
                Text(
                    text = inlineContent,
                    fontSize = cellFontSize,
                    fontWeight = if (isHeader) FontWeight.SemiBold else FontWeight.Normal,
                    color = cellTextColor,
                    lineHeight = cellFontSize * 1.5f
                )
            }
        }
    }
}

/**
 * 渲染 HTML 块（降级为纯文本显示）
 *
 * 输入：
 * - htmlBlock: HtmlBlock 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：以等宽字体显示 HTML 源码
 *
 * 流程：提取 literal -> 渲染为等宽文本
 */
@Composable
private fun RenderHtmlBlock(
    htmlBlock: HtmlBlock,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    val literal = htmlBlock.literal
    if (literal.isNullOrBlank()) return

    Text(
        text = literal,
        fontSize = 13.sp * fontSizeScale,
        fontFamily = FontFamily.Monospace,
        color = colorScheme.onSurfaceVariant,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    )
}

/**
 * 渲染图片占位符
 *
 * 输入：
 * - image: Image 节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：图片 alt 文本占位符
 *
 * 流程：提取 alt 文本 -> 渲染占位框
 */
@Composable
private fun RenderImagePlaceholder(
    image: Image,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    val altText = image.title ?: image.destination.ifBlank { "image" }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .border(1.dp, colorScheme.outlineVariant, RoundedCornerShape(4.dp))
            .background(colorScheme.surfaceVariant, RoundedCornerShape(4.dp))
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "[$altText]",
            fontSize = 13.sp * fontSizeScale,
            color = colorScheme.onSurfaceVariant,
            fontStyle = FontStyle.Italic
        )
    }
}

/**
 * 构建行内节点的 AnnotatedString
 *
 * 输入：
 * - node: 起始行内节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：包含所有行内格式的 AnnotatedString
 *
 * 流程：遍历行内节点链表 -> 根据节点类型应用 SpanStyle -> 递归处理嵌套
 */
private fun BuildInlineAnnotatedString(
    node: Node?,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
): AnnotatedString {
    val builder = AnnotatedString.Builder()
    AppendInlineNodes(builder, node, colorScheme, fontSizeScale)
    return builder.toAnnotatedString()
}

/**
 * 递归追加行内节点到 AnnotatedString.Builder
 *
 * 输入：
 * - builder: AnnotatedString 构建器
 * - node: 当前行内节点
 * - colorScheme: 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：无（直接修改 builder）
 *
 * 流程：遍历兄弟链表 -> 根据节点类型 pushStyle/pop -> 递归处理子节点
 */
private fun AppendInlineNodes(
    builder: AnnotatedString.Builder,
    node: Node?,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    var current = node
    while (current != null) {
        when (current) {
            is Text -> {
                builder.append(current.literal)
            }
            is SoftLineBreak -> {
                builder.append(" ")
            }
            is Code -> {
                /* v3.1.0：检测行内数学公式 `$...$`，按 LaTeX 渲染 */
                val literal = current.literal
                val isInlineMath = literal.startsWith("$") && literal.endsWith("$") && literal.length >= 3
                if (isInlineMath) {
                    /* 提取公式内容（去掉首尾 $） */
                    val formula = literal.substring(1, literal.length - 1)
                    /* 用主色 + 斜体渲染数学公式 AnnotatedString */
                    val mathAnnotated = renderInlineMath(
                        formula = formula,
                        colorScheme = colorScheme,
                        baseFontSize = 15.sp * fontSizeScale
                    )
                    builder.append(mathAnnotated)
                } else {
                    /* 行内代码：背景色 + 等宽字体 */
                    builder.pushStyle(SpanStyle(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 13.sp * fontSizeScale,
                        background = colorScheme.inlineCodeBg,
                        color = colorScheme.onBackground
                    ))
                    builder.append(literal)
                    builder.pop()
                }
            }
            is Emphasis -> {
                /* 斜体 */
                builder.pushStyle(SpanStyle(fontStyle = FontStyle.Italic))
                AppendInlineNodes(builder, current.firstChild, colorScheme, fontSizeScale)
                builder.pop()
            }
            is StrongEmphasis -> {
                /* 粗体 */
                builder.pushStyle(SpanStyle(
                    fontWeight = FontWeight.Bold,
                    color = colorScheme.primary
                ))
                AppendInlineNodes(builder, current.firstChild, colorScheme, fontSizeScale)
                builder.pop()
            }
            is Strikethrough -> {
                /* 删除线 */
                builder.pushStyle(SpanStyle(
                    textDecoration = TextDecoration.LineThrough,
                    color = colorScheme.onSurfaceVariant
                ))
                AppendInlineNodes(builder, current.firstChild, colorScheme, fontSizeScale)
                builder.pop()
            }
            is Link -> {
                /* 链接：带下划线和主色 */
                builder.pushStyle(SpanStyle(
                    color = colorScheme.primary,
                    textDecoration = TextDecoration.Underline
                ))
                AppendInlineNodes(builder, current.firstChild, colorScheme, fontSizeScale)
                builder.pop()
            }
            is Image -> {
                /* 行内图片：显示 alt 文本占位 */
                val altText = current.title ?: current.destination.ifBlank { "img" }
                builder.pushStyle(SpanStyle(
                    color = colorScheme.onSurfaceVariant,
                    fontStyle = FontStyle.Italic
                ))
                builder.append("[$altText]")
                builder.pop()
            }
            else -> {
                /* 未知行内节点，尝试递归处理子节点 */
                if (current.firstChild != null) {
                    AppendInlineNodes(builder, current.firstChild, colorScheme, fontSizeScale)
                }
            }
        }
        current = current.next
    }
}

/**
 * 应用语法高亮（轻量级关键字匹配）
 *
 * 输入：
 * - code: 代码文本
 * - language: 编程语言标识
 * - colorScheme: 颜色方案
 *
 * 输出：带语法高亮 SpanStyle 的 AnnotatedString
 *
 * 流程：先转义代码文本 -> 按语言匹配关键字 -> 使用 token 替换法避免重叠 -> 还原 token 为高亮 span
 */
@VisibleForTesting
internal fun ApplySyntaxHighlight(
    code: String,
    language: String,
    colorScheme: MarkdownColorScheme
): AnnotatedString {
    if (code.isBlank()) return AnnotatedString(code)

    /* LaTeX 数学公式：不做语法高亮，直接返回纯文本 */
    if (language.lowercase() == "math") {
        return AnnotatedString(code)
    }

    val builder = AnnotatedString.Builder()
    val tokens = mutableListOf<TokenSpan>()
    val escapedCode = code

    /* 第一步：提取字符串和注释 token（优先级最高，避免内部被二次匹配） */
    val stringPattern = Regex("""(["'])(?:(?!\1|\\).|\\.)*\1""")
    val singleLineCommentPattern = Regex("""//[^\n]*""")
    val blockCommentPattern = Regex("""/\*[\s\S]*?\*/""")
    val hashCommentPattern = Regex("""#[^\n]*""")
    val sqlCommentPattern = Regex("""--[^\n]*""")

    /* 第二步：根据语言选择关键字集合 */
    val keywords = LanguageKeywords[language.lowercase()] ?: emptySet()

    /* 第三步：扫描所有 token 位置 */
    val processedRanges = mutableListOf<IntRange>()

    /* 字符串 token */
    stringPattern.findAll(escapedCode).forEach { match ->
        tokens.add(TokenSpan(match.range, colorScheme.hlString))
        processedRanges.add(match.range)
    }

    /* 注释 token（根据语言选择注释风格） */
    val commentPatterns = when {
        language.lowercase() in listOf("python", "ruby", "yaml") -> listOf(hashCommentPattern)
        language.lowercase() == "sql" -> listOf(sqlCommentPattern, blockCommentPattern)
        language.lowercase() in listOf("html", "xml") -> listOf(blockCommentPattern)
        else -> listOf(singleLineCommentPattern, blockCommentPattern)
    }
    commentPatterns.forEach { pattern ->
        pattern.findAll(escapedCode).forEach { match ->
            if (!processedRanges.any { it.overlaps(match.range) }) {
                tokens.add(TokenSpan(match.range, colorScheme.hlComment))
                processedRanges.add(match.range)
            }
        }
    }

    /* 关键字 token */
    if (keywords.isNotEmpty()) {
        val keywordPattern = Regex("""\b(${keywords.joinToString("|")})\b""")
        keywordPattern.findAll(escapedCode).forEach { match ->
            if (!processedRanges.any { it.overlaps(match.range) }) {
                tokens.add(TokenSpan(match.range, colorScheme.hlKeyword))
                processedRanges.add(match.range)
            }
        }
    }

    /* 数字 token */
    val numberPattern = Regex("""\b(\d+\.?\d*(?:e[+-]?\d+)?)\b""", RegexOption.IGNORE_CASE)
    numberPattern.findAll(escapedCode).forEach { match ->
        if (!processedRanges.any { it.overlaps(match.range) }) {
            tokens.add(TokenSpan(match.range, colorScheme.hlNumber))
        }
    }

    /* 第四步：按位置排序 token，构建 AnnotatedString */
    tokens.sortBy { it.range.first }

    var lastEnd = 0
    for (token in tokens) {
        /* 追加 token 之前的普通文本 */
        if (token.range.first > lastEnd) {
            builder.append(escapedCode.substring(lastEnd, token.range.first))
        }
        /* 追加带高亮的 token 文本 */
        builder.pushStyle(SpanStyle(color = token.color, fontWeight = FontWeight.Medium))
        builder.append(escapedCode.substring(token.range.first, token.range.last + 1))
        builder.pop()
        lastEnd = token.range.last + 1
    }

    /* 追加剩余普通文本 */
    if (lastEnd < escapedCode.length) {
        builder.append(escapedCode.substring(lastEnd))
    }

    return builder.toAnnotatedString()
}

/**
 * 复制文本到剪贴板
 *
 * 输入：
 * - context: Android Context
 * - text: 要复制的文本
 *
 * 输出：无（将文本写入系统剪贴板）
 *
 * 流程：获取 ClipboardManager -> 创建 ClipData -> 设置主剪贴板
 */
private fun CopyToClipboard(context: Context, text: String) {
    try {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("code", text)
        clipboard.setPrimaryClip(clip)
    } catch (e: Exception) {
        Log.w(TAG, "复制代码到剪贴板失败: ${e.message}", e)
    }
}

/**
 * 判断两个 IntRange 是否重叠
 *
 * 输入：另一个 IntRange
 * 输出：是否重叠
 */
private fun IntRange.overlaps(other: IntRange): Boolean {
    return this.first <= other.last && other.first <= this.last
}

/**
 * 语法高亮 Token 数据类
 *
 * 属性：
 * - range: 在源代码中的字符范围
 * - color: 高亮颜色
 */
private data class TokenSpan(
    val range: IntRange,
    val color: Color
)

/**
 * 标题渲染配置
 *
 * 属性：
 * - fontSize: 标题字号
 * - borderColor: 左边框颜色
 * - borderWidth: 左边框宽度
 */
private data class HeadingConfig(
    val fontSize: TextUnit,
    val borderColor: Color,
    val borderWidth: Dp
)

/**
 * 各语言关键字映射表
 *
 * 功能：为语法高亮提供各编程语言的关键字集合
 * 输入：语言名称（小写）
 * 输出：该语言的关键字集合
 */
private val LanguageKeywords: Map<String, Set<String>> = mapOf(
    "javascript" to setOf(
        "async", "await", "break", "case", "catch", "class", "const", "continue",
        "debugger", "default", "delete", "do", "else", "export", "extends",
        "finally", "for", "from", "function", "if", "import", "in", "instanceof",
        "let", "new", "of", "return", "static", "super", "switch", "this",
        "throw", "try", "typeof", "var", "void", "while", "with", "yield"
    ),
    "typescript" to setOf(
        "abstract", "any", "as", "async", "await", "boolean", "break", "case",
        "catch", "class", "const", "constructor", "continue", "debugger",
        "declare", "default", "delete", "do", "else", "enum", "export",
        "extends", "finally", "for", "from", "function", "if", "implements",
        "import", "in", "instanceof", "interface", "let", "module", "namespace",
        "new", "null", "number", "of", "package", "private", "protected",
        "public", "readonly", "return", "static", "string", "super", "switch",
        "this", "throw", "try", "type", "typeof", "undefined", "var", "void",
        "while", "with", "yield"
    ),
    "python" to setOf(
        "and", "as", "assert", "async", "await", "break", "class", "continue",
        "def", "del", "elif", "else", "except", "finally", "for", "from",
        "global", "if", "import", "in", "is", "lambda", "nonlocal", "not",
        "or", "pass", "raise", "return", "try", "while", "with", "yield",
        "True", "False", "None"
    ),
    "java" to setOf(
        "abstract", "assert", "boolean", "break", "byte", "case", "catch",
        "char", "class", "const", "continue", "default", "do", "double",
        "else", "enum", "extends", "final", "finally", "float", "for", "if",
        "implements", "import", "instanceof", "int", "interface", "long",
        "native", "new", "package", "private", "protected", "public",
        "return", "short", "static", "strictfp", "super", "switch",
        "synchronized", "this", "throw", "throws", "transient", "try",
        "void", "volatile", "while"
    ),
    "kotlin" to setOf(
        "abstract", "actual", "annotation", "as", "break", "by", "catch",
        "class", "companion", "const", "constructor", "continue", "crossinline",
        "data", "do", "else", "enum", "expect", "external", "false", "final",
        "finally", "for", "fun", "if", "in", "infix", "init", "inline",
        "inner", "interface", "internal", "is", "lateinit", "noinline", "null",
        "object", "open", "operator", "out", "override", "package", "private",
        "protected", "public", "reified", "return", "sealed", "set", "super",
        "suspend", "tailrec", "this", "throw", "true", "try", "typealias",
        "typeof", "val", "var", "vararg", "when", "where", "while"
    ),
    "go" to setOf(
        "break", "case", "chan", "const", "continue", "default", "defer",
        "else", "fallthrough", "for", "func", "go", "goto", "if", "import",
        "interface", "map", "package", "range", "return", "select", "struct",
        "switch", "type", "var", "true", "false", "nil"
    ),
    "c" to setOf(
        "auto", "break", "case", "char", "const", "continue", "default", "do",
        "double", "else", "enum", "extern", "float", "for", "goto", "if",
        "int", "long", "register", "return", "short", "signed", "sizeof",
        "static", "struct", "switch", "typedef", "union", "unsigned", "void",
        "volatile", "while", "NULL"
    ),
    "cpp" to setOf(
        "alignas", "alignof", "and", "asm", "auto", "bool", "break", "case",
        "catch", "char", "class", "const", "constexpr", "continue", "decltype",
        "default", "delete", "do", "double", "dynamic_cast", "else", "enum",
        "explicit", "export", "extern", "false", "float", "for", "friend",
        "goto", "if", "inline", "int", "long", "mutable", "namespace", "new",
        "noexcept", "nullptr", "operator", "private", "protected", "public",
        "register", "reinterpret_cast", "return", "short", "signed", "sizeof",
        "static", "static_assert", "static_cast", "struct", "switch",
        "template", "this", "throw", "true", "try", "typedef", "typeid",
        "typename", "union", "unsigned", "using", "virtual", "void",
        "volatile", "while"
    ),
    "sql" to setOf(
        "select", "from", "where", "insert", "into", "values", "update", "set",
        "delete", "create", "table", "alter", "drop", "index", "join", "inner",
        "left", "right", "outer", "on", "and", "or", "not", "null", "is", "in",
        "between", "like", "order", "by", "group", "having", "as", "distinct",
        "count", "sum", "avg", "min", "max", "limit", "offset", "union", "all",
        "exists", "case", "when", "then", "else", "end", "primary", "key",
        "foreign", "references"
    ),
    "rust" to setOf(
        "as", "async", "await", "break", "const", "continue", "crate", "dyn",
        "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in",
        "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
        "self", "Self", "static", "struct", "super", "trait", "true", "type",
        "unsafe", "use", "where", "while", "yield"
    ),
    "bash" to setOf(
        "if", "then", "else", "elif", "fi", "case", "esac", "for", "while",
        "until", "do", "done", "in", "function", "select", "time", "return",
        "exit", "break", "continue", "declare", "export", "local", "readonly",
        "unset", "source", "alias", "echo", "printf", "read"
    ),
    "shell" to setOf(
        "if", "then", "else", "elif", "fi", "case", "esac", "for", "while",
        "until", "do", "done", "in", "function", "select", "time", "return",
        "exit", "break", "continue", "declare", "export", "local", "readonly",
        "unset", "source", "alias", "echo", "printf", "read"
    ),
    "swift" to setOf(
        "associatedtype", "as", "async", "await", "break", "case", "catch",
        "class", "continue", "default", "defer", "deinit", "do", "else",
        "enum", "extension", "fallthrough", "false", "fileprivate", "final",
        "for", "func", "guard", "if", "import", "in", "init", "inout",
        "internal", "is", "lazy", "let", "mutating", "nil", "none",
        "nonmutating", "open", "operator", "optional", "override", "postfix",
        "precedence", "prefix", "private", "protocol", "public", "repeat",
        "required", "return", "self", "Self", "static", "struct", "subscript",
        "super", "switch", "throw", "throws", "true", "try", "typealias",
        "unowned", "var", "weak", "where", "while", "willSet"
    ),
    "php" to setOf(
        "abstract", "and", "array", "as", "break", "callable", "case", "catch",
        "class", "clone", "const", "continue", "declare", "default", "die",
        "do", "echo", "else", "elseif", "empty", "enddeclare", "endfor",
        "endforeach", "endif", "endswitch", "endwhile", "eval", "exit",
        "extends", "final", "finally", "fn", "for", "foreach", "function",
        "global", "goto", "if", "implements", "include", "include_once",
        "instanceof", "insteadof", "interface", "isset", "list", "match",
        "namespace", "new", "or", "print", "private", "protected", "public",
        "require", "require_once", "return", "static", "switch", "throw",
        "trait", "try", "unset", "use", "var", "while", "xor", "yield"
    ),
    "ruby" to setOf(
        "alias", "and", "begin", "break", "case", "class", "def", "defined",
        "do", "else", "elsif", "end", "ensure", "false", "for", "if", "in",
        "module", "next", "nil", "not", "or", "redo", "rescue", "retry",
        "return", "self", "super", "then", "true", "undef", "unless", "until",
        "when", "while", "yield"
    ),
    "dart" to setOf(
        "abstract", "as", "assert", "async", "await", "break", "case", "catch",
        "class", "const", "continue", "covariant", "default", "deferred", "do",
        "dynamic", "else", "enum", "export", "extends", "extension", "external",
        "factory", "false", "final", "finally", "for", "Function", "get",
        "hide", "if", "implements", "import", "in", "interface", "is", "late",
        "library", "mixin", "new", "null", "on", "operator", "part",
        "required", "rethrow", "return", "set", "show", "static", "super",
        "switch", "sync", "this", "throw", "true", "try", "typedef", "var",
        "void", "while", "with", "yield"
    ),
    "yaml" to setOf("true", "false", "null", "yes", "no"),
    "json" to setOf("true", "false", "null"),
    "css" to setOf(
        "align", "animation", "background", "border", "bottom", "box", "clear",
        "clip", "color", "content", "cursor", "direction", "display", "filter",
        "flex", "float", "font", "grid", "height", "justify", "left", "letter",
        "line", "list", "margin", "max", "min", "opacity", "order", "outline",
        "overflow", "padding", "perspective", "pointer", "position", "resize",
        "right", "scroll", "shadow", "table", "text", "top", "transform",
        "transition", "user", "vertical", "visibility", "white", "width",
        "word", "z-index"
    )
)
