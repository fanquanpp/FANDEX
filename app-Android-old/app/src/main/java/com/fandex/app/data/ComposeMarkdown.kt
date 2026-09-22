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

private const val TAG = "ComposeMarkdown"

private val markdownParser: Parser = Parser.builder()
    .extensions(listOf(TablesExtension.create(), StrikethroughExtension.create()))
    .build()

@VisibleForTesting
internal fun PreprocessMarkdown(markdown: String): String {
    var result = Regex("""\$\$\s*([\s\S]*?)\s*\$\$""").replace(markdown) { match ->
        val formula = match.groupValues[1].trim()
        "```math\n${formula}\n```"
    }

    val blockFormulaPattern = Regex("""```math[\s\S]*?```""")
    val inlineMathPattern = Regex("""(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)""")
    result = result.lineSequence().joinToString("\n") { line ->
        if (line.trimStart().startsWith("|")) {
            blockFormulaPattern.replace(line) { it.value }.let { processedLine ->
                inlineMathPattern.replace(processedLine) { match ->
                    val formula = match.groupValues[1].replace("|", "\\vert ")
                    "`$${formula}$`"
                }
            }
        } else {
            blockFormulaPattern.replace(line) { it.value }.let { processedLine ->
                inlineMathPattern.replace(processedLine) { match ->
                    val formula = match.groupValues[1]
                    "`$${formula}$`"
                }
            }
        }
    }

    result = result.replace(Regex("""^\[TOC\]\s*$""", RegexOption.MULTILINE), "")
    result = result.replace(Regex("""^\[\[toc\]\]\s*$""", RegexOption.MULTILINE), "")
    result = result.replace(Regex("""^\{:toc\}\s*$""", RegexOption.MULTILINE), "")

    return result
}

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
                if (current.firstChild != null) {
                    RenderBlockNodes(current.firstChild, colorScheme, fontSizeScale)
                }
            }
        }
        current = current.next
    }
}

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

@Composable
private fun RenderFencedCodeBlock(
    codeBlock: FencedCodeBlock,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
) {
    val context = LocalContext.current
    val strings = LocalStrings.current
    val codeFontSize = 13.sp * fontSizeScale
    val language = codeBlock.info.trim()
    val code = codeBlock.literal
    val isCopied = remember { mutableStateOf(false) }

    if (language.lowercase() == "mermaid") {
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
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colorScheme.codeHeaderBg)
                    .padding(horizontal = 12.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = strings.mermaidLabel,
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
            MermaidDiagramView(code = code.trim(), colorScheme = colorScheme)
        }
        return
    }

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
            MathWebViewBlock(
                formula = code.trim(),
                colorScheme = colorScheme,
                isBlock = true
            )
        }
        return
    }

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
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colorScheme.codeHeaderBg)
                .padding(horizontal = 12.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
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

    val cells = mutableListOf<TableCell>()
    var cell = tableRow.firstChild
    while (cell != null) {
        if (cell is TableCell) {
            cells.add(cell)
        }
        cell = cell.next
    }

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

private fun BuildInlineAnnotatedString(
    node: Node?,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float
): AnnotatedString {
    val builder = AnnotatedString.Builder()
    AppendInlineNodes(builder, node, colorScheme, fontSizeScale)
    return builder.toAnnotatedString()
}

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
                val literal = current.literal
                val isInlineMath = literal.startsWith("$") && literal.endsWith("$") && literal.length >= 3
                if (isInlineMath) {
                    val formula = literal.substring(1, literal.length - 1)
                    val mathAnnotated = renderInlineMath(
                        formula = formula,
                        colorScheme = colorScheme,
                        baseFontSize = 15.sp * fontSizeScale
                    )
                    builder.append(mathAnnotated)
                } else {
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
                builder.pushStyle(SpanStyle(fontStyle = FontStyle.Italic))
                AppendInlineNodes(builder, current.firstChild, colorScheme, fontSizeScale)
                builder.pop()
            }
            is StrongEmphasis -> {
                builder.pushStyle(SpanStyle(
                    fontWeight = FontWeight.Bold,
                    color = colorScheme.primary
                ))
                AppendInlineNodes(builder, current.firstChild, colorScheme, fontSizeScale)
                builder.pop()
            }
            is Strikethrough -> {
                builder.pushStyle(SpanStyle(
                    textDecoration = TextDecoration.LineThrough,
                    color = colorScheme.onSurfaceVariant
                ))
                AppendInlineNodes(builder, current.firstChild, colorScheme, fontSizeScale)
                builder.pop()
            }
            is Link -> {
                builder.pushStyle(SpanStyle(
                    color = colorScheme.primary,
                    textDecoration = TextDecoration.Underline
                ))
                AppendInlineNodes(builder, current.firstChild, colorScheme, fontSizeScale)
                builder.pop()
            }
            is Image -> {
                val altText = current.title ?: current.destination.ifBlank { "img" }
                builder.pushStyle(SpanStyle(
                    color = colorScheme.onSurfaceVariant,
                    fontStyle = FontStyle.Italic
                ))
                builder.append("[$altText]")
                builder.pop()
            }
            else -> {
                if (current.firstChild != null) {
                    AppendInlineNodes(builder, current.firstChild, colorScheme, fontSizeScale)
                }
            }
        }
        current = current.next
    }
}

@VisibleForTesting
internal fun ApplySyntaxHighlight(
    code: String,
    language: String,
    colorScheme: MarkdownColorScheme
): AnnotatedString {
    if (code.isBlank()) return AnnotatedString(code)

    if (language.lowercase() == "math") {
        return AnnotatedString(code)
    }

    val builder = AnnotatedString.Builder()
    val tokens = mutableListOf<TokenSpan>()
    val escapedCode = code

    val stringPattern = Regex("""(["'])(?:(?!\1|\\).|\\.)*\1""")
    val singleLineCommentPattern = Regex("""//[^\n]*""")
    val blockCommentPattern = Regex("""/\*[\s\S]*?\*/""")
    val hashCommentPattern = Regex("""#[^\n]*""")
    val sqlCommentPattern = Regex("""--[^\n]*""")

    val keywords = LanguageKeywords[language.lowercase()] ?: emptySet()

    val processedRanges = mutableListOf<IntRange>()

    stringPattern.findAll(escapedCode).forEach { match ->
        tokens.add(TokenSpan(match.range, colorScheme.hlString))
        processedRanges.add(match.range)
    }

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

    if (keywords.isNotEmpty()) {
        val keywordPattern = Regex("""\b(${keywords.joinToString("|")})\b""")
        keywordPattern.findAll(escapedCode).forEach { match ->
            if (!processedRanges.any { it.overlaps(match.range) }) {
                tokens.add(TokenSpan(match.range, colorScheme.hlKeyword))
                processedRanges.add(match.range)
            }
        }
    }

    val numberPattern = Regex("""\b(\d+\.?\d*(?:e[+-]?\d+)?)\b""", RegexOption.IGNORE_CASE)
    numberPattern.findAll(escapedCode).forEach { match ->
        if (!processedRanges.any { it.overlaps(match.range) }) {
            tokens.add(TokenSpan(match.range, colorScheme.hlNumber))
        }
    }

    tokens.sortBy { it.range.first }

    var lastEnd = 0
    for (token in tokens) {
        if (token.range.first > lastEnd) {
            builder.append(escapedCode.substring(lastEnd, token.range.first))
        }
        builder.pushStyle(SpanStyle(color = token.color, fontWeight = FontWeight.Medium))
        builder.append(escapedCode.substring(token.range.first, token.range.last + 1))
        builder.pop()
        lastEnd = token.range.last + 1
    }

    if (lastEnd < escapedCode.length) {
        builder.append(escapedCode.substring(lastEnd))
    }

    return builder.toAnnotatedString()
}

private fun CopyToClipboard(context: Context, text: String) {
    try {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("code", text)
        clipboard.setPrimaryClip(clip)
    } catch (e: Exception) {
        Log.w(TAG, "复制代码到剪贴板失败: ${e.message}", e)
    }
}

private fun IntRange.overlaps(other: IntRange): Boolean {
    return this.first <= other.last && other.first <= this.last
}

private data class TokenSpan(
    val range: IntRange,
    val color: Color
)

private data class HeadingConfig(
    val fontSize: TextUnit,
    val borderColor: Color,
    val borderWidth: Dp
)

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
