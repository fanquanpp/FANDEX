package com.fandex.app.ui.markdown

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.InlineTextContent
import androidx.compose.foundation.text.appendInlineContent
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.CheckBoxOutlineBlank
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.InsertDriveFile
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.Placeholder
import androidx.compose.ui.text.PlaceholderVerticalAlign
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fandex.app.ui.theme.CodeTextStyle
import com.fandex.app.ui.theme.FandexExtendedColors
import com.fandex.app.ui.theme.InlineCodeStyle
import com.fandex.app.ui.theme.LocalExtendedColors
import org.commonmark.ext.gfm.strikethrough.StrikethroughExtension
import org.commonmark.ext.gfm.tables.TablesExtension
import org.commonmark.ext.task.list.items.TaskListItemsExtension
import org.commonmark.parser.Parser

private const val URL_TAG = "URL"

private const val MATH_TAG = "math-"

class MarkdownRenderer {

    private val parser: Parser = Parser.builder()
        .extensions(
            listOf(
                TablesExtension.create(),
                StrikethroughExtension.create(),
                TaskListItemsExtension.create()
            )
        )
        .build()

    fun parse(markdown: String): List<MarkdownBlock> {
        val blocks = mutableListOf<MarkdownBlock>()
        for (segment in splitMathSegments(markdown)) {
            if (segment.isMath) {
                blocks.add(MarkdownBlock.MathBlock(segment.text.trim()))
            } else {
                val document = parser.parse(segment.text)
                blocks.addAll(MarkdownComposeVisitor().extractBlocks(document))
            }
        }
        return blocks
    }

    @Composable
    fun Render(markdown: String, accentColor: Color? = null) {
        val blocks = remember(markdown) { parse(markdown) }
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            blocks.forEach { block ->
                Block(block, accentColor)
            }
        }
    }

    @Composable
    fun Block(block: MarkdownBlock, accentColor: Color? = null) {
        when (block) {
            is MarkdownBlock.Heading -> HeadingBlock(block)
            is MarkdownBlock.Paragraph -> ParagraphBlock(block, accentColor)
            is MarkdownBlock.CodeBlock -> CodeBlockView(block)
            is MarkdownBlock.MathBlock -> MathBlockView(block.latex)
            is MarkdownBlock.ListBlock -> ListBlockView(block, accentColor, depth = 0)
            is MarkdownBlock.BlockQuote -> BlockQuoteView(block, accentColor)
            is MarkdownBlock.Admonition -> AdmonitionView(block, accentColor)
            is MarkdownBlock.Table -> TableView(block)
            MarkdownBlock.ThematicBreak -> ThematicBreakView()
        }
    }
}

@Composable
private fun HeadingBlock(block: MarkdownBlock.Heading) {
    val style = when (block.level) {
        1 -> MaterialTheme.typography.headlineLarge
        2 -> MaterialTheme.typography.headlineMedium
        3 -> MaterialTheme.typography.headlineSmall
        4 -> MaterialTheme.typography.titleLarge
        else -> MaterialTheme.typography.titleMedium
    }
    Text(
        text = block.text,
        style = style,
        color = MaterialTheme.colorScheme.onSurface,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = if (block.level <= 2) 16.dp else 8.dp, bottom = 2.dp)
    )
}

@Composable
private fun ParagraphBlock(block: MarkdownBlock.Paragraph, accentColor: Color?) {
    val images = block.segments.filterIsInstance<TextSegment.Image>()
    if (images.size == 1 && block.segments.size == 1) {
        ImagePlaceholder(images.first())
        return
    }

    val uriHandler = LocalUriHandler.current
    val extendedColors = LocalExtendedColors.current
    val primaryColor = MaterialTheme.colorScheme.primary
    val markdown = rememberAnnotatedMarkdown(block.segments, extendedColors, primaryColor, accentColor)
    val layoutResult = remember { mutableStateOf<TextLayoutResult?>(null) }

    Text(
        text = markdown.annotated,
        inlineContent = markdown.inlineContent,
        style = MaterialTheme.typography.bodyLarge,
        color = MaterialTheme.colorScheme.onSurface,
        onTextLayout = { layoutResult.value = it },
        modifier = Modifier
            .fillMaxWidth()
            .pointerInput(markdown) {
                detectTapGestures { position ->
                    layoutResult.value?.let { layout ->
                        val offset = layout.getOffsetForPosition(position)
                        markdown.annotated.getStringAnnotations(URL_TAG, offset, offset)
                            .firstOrNull()
                            ?.let { annotation ->
                                runCatching { uriHandler.openUri(annotation.item) }
                            }
                    }
                }
            }
    )
    images.forEach { image ->
        ImagePlaceholder(image)
    }
}

@Composable
private fun CodeBlockView(block: MarkdownBlock.CodeBlock) {
    if (block.language.lowercase().trim() == "mermaid") {
        MermaidDiagram(code = block.code)
        return
    }
    val extendedColors = LocalExtendedColors.current
    val clipboard = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }
    val scrollState = rememberScrollState()
    val highlighted = rememberHighlightedCode(block.code, block.language)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(extendedColors.codeBg)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 12.dp, end = 4.dp, top = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = block.language.ifEmpty { "text" },
                style = MaterialTheme.typography.labelSmall,
                color = extendedColors.fgTertiary
            )
            Spacer(modifier = Modifier.weight(1f))
            IconButton(onClick = {
                clipboard.setText(AnnotatedString(block.code))
                copied = true
            }) {
                Icon(
                    imageVector = if (copied) Icons.Filled.CheckCircle else Icons.Outlined.ContentCopy,
                    contentDescription = if (copied) "已复制" else "复制代码",
                    tint = if (copied) extendedColors.success else extendedColors.fgTertiary,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        Text(
            text = highlighted,
            style = CodeTextStyle,
            color = extendedColors.codeText,
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 12.dp, end = 12.dp, bottom = 12.dp)
                .horizontalScroll(scrollState)
        )
    }
}

@Composable
private fun ListBlockView(block: MarkdownBlock.ListBlock, accentColor: Color?, depth: Int) {
    val extendedColors = LocalExtendedColors.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = if (depth > 0) 16.dp else 0.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        block.items.forEachIndexed { index, item ->
            Row(verticalAlignment = Alignment.Top) {
                when {
                    item.checked != null -> {
                        Icon(
                            imageVector = if (item.checked) Icons.Filled.CheckBox else Icons.Filled.CheckBoxOutlineBlank,
                            contentDescription = null,
                            tint = if (item.checked) MaterialTheme.colorScheme.primary else extendedColors.fgTertiary,
                            modifier = Modifier
                                .size(18.dp)
                                .padding(top = 2.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    block.ordered -> {
                        Text(
                            text = "${block.startNum + index}. ",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    else -> {
                        Text(
                            text = "- ",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    MarkdownText(
                        segments = item.segments,
                        accentColor = accentColor,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    item.children.forEach { child ->
                        Row(verticalAlignment = Alignment.Top) {
                            Text(
                                text = "  - ",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.primary
                            )
                            MarkdownText(
                                segments = child.segments,
                                accentColor = accentColor,
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BlockQuoteView(block: MarkdownBlock.BlockQuote, accentColor: Color?) {
    val extendedColors = LocalExtendedColors.current

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(0.dp, 8.dp, 8.dp, 0.dp))
            .background(extendedColors.bgSecondary)
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .fillMaxHeight()
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.5f))
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            block.paragraphs.forEach { paragraph ->
                MarkdownText(
                    segments = paragraph,
                    accentColor = accentColor,
                    style = MaterialTheme.typography.bodyMedium,
                    color = extendedColors.fgSecondary
                )
            }
        }
    }
}

@Composable
private fun AdmonitionView(block: MarkdownBlock.Admonition, accentColor: Color?) {
    val extendedColors = LocalExtendedColors.current
    val accent = when (block.type) {
        "TIP", "SUCCESS" -> extendedColors.success
        "WARNING", "CAUTION" -> extendedColors.warning
        "DANGER", "FAILURE", "BUG" -> MaterialTheme.colorScheme.error
        "NOTE", "INFO" -> extendedColors.info
        else -> MaterialTheme.colorScheme.primary
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(0.dp, 8.dp, 8.dp, 0.dp))
            .background(accent.copy(alpha = 0.08f))
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .fillMaxHeight()
                .background(accent)
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = block.title,
                style = MaterialTheme.typography.labelLarge,
                color = accent,
                fontWeight = FontWeight.SemiBold
            )
            block.paragraphs.forEach { paragraph ->
                MarkdownText(
                    segments = paragraph,
                    accentColor = accentColor,
                    style = MaterialTheme.typography.bodyMedium,
                    color = extendedColors.fgSecondary
                )
            }
        }
    }
}

@Composable
private fun ImagePlaceholder(image: TextSegment.Image) {
    val extendedColors = LocalExtendedColors.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(extendedColors.bgSecondary)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Filled.InsertDriveFile,
                contentDescription = null,
                tint = extendedColors.fgTertiary,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (image.alt.isNotEmpty()) image.alt else "图片",
                style = MaterialTheme.typography.labelLarge,
                color = extendedColors.fgSecondary
            )
        }
        if (image.url.isNotEmpty()) {
            Text(
                text = image.url,
                style = MaterialTheme.typography.labelSmall,
                color = extendedColors.fgTertiary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun TableView(block: MarkdownBlock.Table) {
    val extendedColors = LocalExtendedColors.current
    val scrollState = rememberScrollState()
    val screenWidthDp = LocalConfiguration.current.screenWidthDp.dp

    val columnCount = block.headers.size
    val columnChars = remember(block) {
        List(columnCount) { c ->
            val headerLen = block.headers.getOrNull(c)?.length ?: 0
            val bodyLen = block.rows.maxOfOrNull { row -> row.getOrNull(c)?.length ?: 0 } ?: 0
            maxOf(headerLen, bodyLen).coerceAtMost(40).coerceAtLeast(4)
        }
    }
    val totalChars = columnChars.sum().coerceAtLeast(1)
    val baseWidth = minOf(screenWidthDp, 390.dp) - 16.dp
    val columnWidths = columnChars.map { len ->
        maxOf(baseWidth * len / totalChars, 88.dp)
    }
    val tableWidth = columnWidths.reduce { acc, width -> acc + width }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(extendedColors.bgSecondary)
            .horizontalScroll(scrollState)
    ) {
        Row {
            block.headers.forEachIndexed { c, header ->
                Text(
                    text = header,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .width(columnWidths[c])
                        .padding(8.dp)
                )
            }
        }
        Box(
            modifier = Modifier
                .width(tableWidth)
                .height(1.dp)
                .background(extendedColors.borderSubtle)
        )
        block.rows.forEachIndexed { rowIndex, row ->
            Row {
                row.forEachIndexed { c, cell ->
                    Text(
                        text = cell,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier
                            .width(columnWidths.getOrElse(c) { 88.dp })
                            .padding(8.dp)
                    )
                }
            }
            if (rowIndex < block.rows.size - 1) {
                Box(
                    modifier = Modifier
                        .width(tableWidth)
                        .height(1.dp)
                        .background(extendedColors.borderSubtle.copy(alpha = 0.5f))
                )
            }
        }
    }
}

@Composable
private fun ThematicBreakView() {
    val extendedColors = LocalExtendedColors.current
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .height(1.dp)
            .background(extendedColors.borderSubtle)
    )
}

private data class AnnotatedMarkdown(
    val annotated: AnnotatedString,
    val inlineContent: Map<String, InlineTextContent>
)

@Composable
private fun MarkdownText(
    segments: List<TextSegment>,
    accentColor: Color?,
    style: androidx.compose.ui.text.TextStyle,
    color: Color
) {
    val extendedColors = LocalExtendedColors.current
    val primaryColor = MaterialTheme.colorScheme.primary
    val markdown = rememberAnnotatedMarkdown(segments, extendedColors, primaryColor, accentColor)
    Text(
        text = markdown.annotated,
        inlineContent = markdown.inlineContent,
        style = style,
        color = color
    )
}

@Composable
private fun rememberAnnotatedMarkdown(
    segments: List<TextSegment>,
    extendedColors: FandexExtendedColors,
    primaryColor: Color,
    accentColor: Color?
): AnnotatedMarkdown {
    val density = LocalDensity.current
    val onSurface = MaterialTheme.colorScheme.onSurface
    val mathKeys = remember(segments) { extractInlineMath(segments) }
    val textSizePx = inlineMathTextSizePx(density)
    val bitmaps = remember(mathKeys, onSurface, textSizePx) {
        mathKeys.associateWith { latex -> renderMathBitmap(latex, onSurface.toArgb(), textSizePx) }
    }
    val mathIds = remember(mathKeys) { mathKeys.mapIndexed { i, _ -> "$MATH_TAG$i" } }
    val mathContents = remember(bitmaps, mathIds) {
        mutableMapOf<String, InlineTextContent>().apply {
            mathKeys.forEachIndexed { i, latex ->
                val bitmap = bitmaps[latex] ?: return@forEachIndexed
                val (wSp, hSp) = inlineMathPlaceholder(bitmap.width, bitmap.height)
                put(
                    mathIds[i],
                    InlineTextContent(Placeholder(wSp.sp, hSp.sp, PlaceholderVerticalAlign.TextCenter)) {
                        androidx.compose.foundation.Image(
                            bitmap = bitmap,
                            contentDescription = null,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                )
            }
        }.toMap()
    }
    return remember(segments, extendedColors, primaryColor, accentColor, mathIds, mathContents) {
        buildAnnotatedMarkdown(segments, extendedColors, primaryColor, accentColor, mathIds, mathContents)
    }
}

private fun buildAnnotatedMarkdown(
    segments: List<TextSegment>,
    extendedColors: FandexExtendedColors,
    primaryColor: Color,
    accentColor: Color?,
    mathIds: List<String>,
    mathContents: Map<String, InlineTextContent>
): AnnotatedMarkdown {
    val codeBgColor = extendedColors.codeBg
    val boldColor = accentColor ?: Color.Unspecified
    var mathIndex = 0

    val annotated = buildAnnotatedString {
        segments.forEach { segment ->
            when (segment) {
                is TextSegment.Plain -> {
                    var rest = segment.text
                    while (rest.isNotEmpty()) {
                        val match = INLINE_MATH_RE.find(rest)
                        if (match == null) {
                            append(rest)
                            break
                        }
                        append(rest.substring(0, match.range.first))
                        val latex = match.groupValues[1]
                        val id = mathIds.getOrNull(mathIndex)
                        if (id != null && mathContents.containsKey(id)) {
                            appendInlineContent(id, "［公式］")
                        } else {
                            withStyle(
                                SpanStyle(fontFamily = FontFamily.Monospace, color = primaryColor)
                            ) { append(latex) }
                        }
                        mathIndex++
                        rest = rest.substring(match.range.last + 1)
                    }
                }
                is TextSegment.Bold -> withStyle(
                    SpanStyle(fontWeight = FontWeight.Bold, color = boldColor)
                ) {
                    append(segment.text)
                }
                is TextSegment.Italic -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
                    append(segment.text)
                }
                is TextSegment.Strikethrough -> withStyle(
                    SpanStyle(textDecoration = TextDecoration.LineThrough)
                ) {
                    append(segment.text)
                }
                is TextSegment.InlineCode -> withStyle(
                    SpanStyle(
                        fontFamily = InlineCodeStyle.fontFamily,
                        background = codeBgColor,
                        color = extendedColors.codeText
                    )
                ) {
                    append(segment.text)
                }
                is TextSegment.Link -> {
                    pushStringAnnotation(tag = URL_TAG, annotation = segment.url)
                    withStyle(
                        SpanStyle(color = primaryColor, textDecoration = TextDecoration.Underline)
                    ) {
                        append(segment.text)
                    }
                    pop()
                }
                is TextSegment.Image -> withStyle(
                    SpanStyle(color = extendedColors.fgTertiary, fontStyle = FontStyle.Italic)
                ) {
                    append(if (segment.alt.isNotEmpty()) "[图] ${segment.alt}" else "[图片]")
                }
                is TextSegment.SoftBreak -> append(" ")
                is TextSegment.HardBreak -> append("\n")
            }
        }
    }
    return AnnotatedMarkdown(annotated, mathContents)
}

private val INLINE_MATH_RE = Regex("\\$([^\\$\n\\s][^$\n]*[^$\n\\s]|[^$\n\\s])\\$")

private fun extractInlineMath(segments: List<TextSegment>): List<String> {
    val keys = mutableListOf<String>()
    segments.forEach { segment ->
        if (segment is TextSegment.Plain) {
            INLINE_MATH_RE.findAll(segment.text).forEach { keys.add(it.groupValues[1]) }
        }
    }
    return keys.distinct()
}

private data class ParsedSegment(val isMath: Boolean, val text: String)

private fun splitMathSegments(markdown: String): List<ParsedSegment> {
    val segments = mutableListOf<ParsedSegment>()
    val lines = markdown.split('\n')
    val buf = StringBuilder()
    var inFence = false
    var fenceMark = "```"

    fun flush() {
        if (buf.isNotBlank()) segments.add(ParsedSegment(false, buf.toString()))
        buf.clear()
    }

    var i = 0
    while (i < lines.size) {
        val line = lines[i]
        val trimmed = line.trimStart()
        if (!inFence && (trimmed.startsWith("```") || trimmed.startsWith("~~~"))) {
            inFence = true
            fenceMark = trimmed.take(3)
            buf.append(line).append('\n')
            i++
            continue
        }
        if (inFence) {
            buf.append(line).append('\n')
            if (trimmed.startsWith(fenceMark)) inFence = false
            i++
            continue
        }
        if (trimmed.startsWith("$$")) {
            val rest = trimmed.removePrefix("$$")
            val inlineClose = rest.indexOf("$$")
            if (inlineClose >= 0) {
                flush()
                segments.add(ParsedSegment(true, rest.take(inlineClose)))
                buf.append(rest.substring(inlineClose + 2)).append('\n')
                i++
                continue
            }
            val mathLines = mutableListOf<String>()
            if (rest.isNotBlank()) mathLines.add(rest)
            var j = i + 1
            var closed = false
            while (j < lines.size) {
                val closeIdx = lines[j].indexOf("$$")
                if (closeIdx >= 0) {
                    val before = lines[j].take(closeIdx)
                    if (before.isNotBlank()) mathLines.add(before)
                    closed = true
                    break
                }
                mathLines.add(lines[j])
                j++
            }
            if (closed) {
                flush()
                segments.add(ParsedSegment(true, mathLines.joinToString("\n").trim()))
                i = j + 1
                continue
            }
            buf.append(line).append('\n')
            i++
            continue
        }
        buf.append(line).append('\n')
        i++
    }
    flush()
    return segments
}

data class TocEntry(
    val level: Int,
    val title: String,
    val blockIndex: Int
)

fun extractToc(blocks: List<MarkdownBlock>): List<TocEntry> {
    return blocks.mapIndexed { index, block ->
        if (block is MarkdownBlock.Heading && block.level in 2..4) {
            TocEntry(block.level, block.text, index)
        } else null
    }.filterNotNull()
}
