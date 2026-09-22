package com.fandex.app.ui.markdown

import org.commonmark.ext.gfm.strikethrough.Strikethrough
import org.commonmark.ext.gfm.tables.TableBlock
import org.commonmark.ext.gfm.tables.TableBody
import org.commonmark.ext.gfm.tables.TableCell
import org.commonmark.ext.gfm.tables.TableHead
import org.commonmark.ext.gfm.tables.TableRow
import org.commonmark.ext.task.list.items.TaskListItemMarker
import org.commonmark.node.AbstractVisitor
import org.commonmark.node.BlockQuote
import org.commonmark.node.BulletList
import org.commonmark.node.Code
import org.commonmark.node.CustomBlock
import org.commonmark.node.CustomNode
import org.commonmark.node.Emphasis
import org.commonmark.node.FencedCodeBlock
import org.commonmark.node.HardLineBreak
import org.commonmark.node.Heading
import org.commonmark.node.Image
import org.commonmark.node.IndentedCodeBlock
import org.commonmark.node.Link
import org.commonmark.node.ListBlock
import org.commonmark.node.ListItem
import org.commonmark.node.OrderedList
import org.commonmark.node.Paragraph
import org.commonmark.node.SoftLineBreak
import org.commonmark.node.StrongEmphasis
import org.commonmark.node.Text
import org.commonmark.node.ThematicBreak

sealed class MarkdownBlock {
    data class Heading(val level: Int, val text: String) : MarkdownBlock()

    data class Paragraph(val segments: List<TextSegment>) : MarkdownBlock()

    data class CodeBlock(val language: String, val code: String) : MarkdownBlock()

    data class ListBlock(
        val ordered: Boolean,
        val startNum: Int,
        val items: List<ListItemNode>
    ) : MarkdownBlock()

    data class BlockQuote(val paragraphs: List<List<TextSegment>>) : MarkdownBlock()

    data class Admonition(
        val type: String,
        val title: String,
        val paragraphs: List<List<TextSegment>>
    ) : MarkdownBlock()

    data class Table(val headers: List<String>, val rows: List<List<String>>) : MarkdownBlock()

    data class MathBlock(val latex: String) : MarkdownBlock()

    object ThematicBreak : MarkdownBlock()
}

data class ListItemNode(
    val segments: List<TextSegment>,
    val checked: Boolean? = null,
    val children: List<ListItemNode> = emptyList()
)

sealed class TextSegment {
    data class Plain(val text: String) : TextSegment()
    data class Bold(val text: String) : TextSegment()
    data class Italic(val text: String) : TextSegment()
    data class Strikethrough(val text: String) : TextSegment()
    data class InlineCode(val text: String) : TextSegment()
    data class Link(val text: String, val url: String) : TextSegment()

    data class Image(val url: String, val alt: String) : TextSegment()

    object SoftBreak : TextSegment()
    object HardBreak : TextSegment()
}

enum class AdmonitionType(val label: String) {
    NOTE("注意"),
    TIP("技巧"),
    WARNING("警告"),
    DANGER("危险"),
    INFO("信息"),
    CAUTION("当心"),
    IMPORTANT("重要"),
    EXAMPLE("示例"),
    SUCCESS("成功"),
    QUOTE("引用"),
    QUESTION("问题"),
    FAILURE("失败"),
    BUG("缺陷"),
    ABSTRACT("摘要"),
    TODO("待办");

    companion object {
        fun fromMarker(marker: String): AdmonitionType? {
            return entries.find { it.name.equals(marker, ignoreCase = true) }
        }
    }
}

class MarkdownComposeVisitor : AbstractVisitor() {

    private val blocks = mutableListOf<MarkdownBlock>()

    private var currentTextSegments = mutableListOf<TextSegment>()

    private val quoteParagraphs = mutableListOf<List<TextSegment>>()

    fun extractBlocks(document: org.commonmark.node.Node): List<MarkdownBlock> {
        blocks.clear()
        quoteParagraphs.clear()
        currentTextSegments = mutableListOf()
        document.accept(this)
        return blocks.toList()
    }

    override fun visit(heading: Heading) {
        flushParagraph()
        blocks.add(MarkdownBlock.Heading(heading.level, inlineText(heading)))
    }

    override fun visit(fencedCodeBlock: FencedCodeBlock) {
        flushParagraph()
        blocks.add(
            MarkdownBlock.CodeBlock(
                language = fencedCodeBlock.info.toString().trim(),
                code = fencedCodeBlock.literal.trimEnd('\n')
            )
        )
    }

    override fun visit(indentedCodeBlock: IndentedCodeBlock) {
        flushParagraph()
        blocks.add(MarkdownBlock.CodeBlock(language = "", code = indentedCodeBlock.literal.trimEnd('\n')))
    }

    override fun visit(bulletList: BulletList) {
        flushParagraph()
        blocks.add(collectList(bulletList, ordered = false, startNum = 1))
    }

    override fun visit(orderedList: OrderedList) {
        flushParagraph()
        blocks.add(collectList(orderedList, ordered = true, startNum = orderedList.markerStartNumber))
    }

    override fun visit(blockQuote: BlockQuote) {
        flushParagraph()
        val marker = detectAdmonitionMarker(blockQuote)
        if (marker != null) {
            val (type, markerLength) = marker
            collectQuoteParagraphs(blockQuote, skipMarker = markerLength)
            blocks.add(MarkdownBlock.Admonition(type.name, type.label, quoteParagraphs.toList()))
        } else {
            collectQuoteParagraphs(blockQuote)
            blocks.add(MarkdownBlock.BlockQuote(quoteParagraphs.toList()))
        }
        quoteParagraphs.clear()
    }

    override fun visit(thematicBreak: ThematicBreak) {
        flushParagraph()
        blocks.add(MarkdownBlock.ThematicBreak)
    }

    override fun visit(customBlock: CustomBlock) {
        when (customBlock) {
            is TableBlock -> {
                flushParagraph()
                collectTable(customBlock)?.let { blocks.add(it) }
            }
            else -> visitChildren(customBlock)
        }
    }

    override fun visit(text: Text) {
        currentTextSegments.add(TextSegment.Plain(text.literal))
    }

    override fun visit(emphasis: Emphasis) {
        currentTextSegments.add(TextSegment.Italic(inlineText(emphasis)))
    }

    override fun visit(strongEmphasis: StrongEmphasis) {
        currentTextSegments.add(TextSegment.Bold(inlineText(strongEmphasis)))
    }

    override fun visit(code: Code) {
        currentTextSegments.add(TextSegment.InlineCode(code.literal))
    }

    override fun visit(link: Link) {
        currentTextSegments.add(TextSegment.Link(inlineText(link), link.destination))
    }

    override fun visit(image: Image) {
        currentTextSegments.add(TextSegment.Image(image.destination, inlineText(image)))
    }

    override fun visit(softLineBreak: SoftLineBreak) {
        currentTextSegments.add(TextSegment.SoftBreak)
    }

    override fun visit(hardLineBreak: HardLineBreak) {
        currentTextSegments.add(TextSegment.HardBreak)
    }

    override fun visit(customNode: CustomNode) {
        when (customNode) {
            is Strikethrough -> {
                currentTextSegments.add(TextSegment.Strikethrough(inlineText(customNode)))
            }
            is TaskListItemMarker -> Unit
            else -> visitChildren(customNode)
        }
    }

    override fun visit(htmlInline: org.commonmark.node.HtmlInline) {
        val tag = htmlInline.literal.lowercase()
        if (tag.startsWith("<br")) {
            currentTextSegments.add(TextSegment.HardBreak)
        }
    }

    override fun visit(htmlBlock: org.commonmark.node.HtmlBlock) = Unit

    private fun collectList(listBlock: ListBlock, ordered: Boolean, startNum: Int): MarkdownBlock.ListBlock {
        val items = mutableListOf<ListItemNode>()
        var child = listBlock.firstChild
        while (child != null) {
            if (child is ListItem) {
                items.add(collectListItem(child))
            }
            child = child.next
        }
        return MarkdownBlock.ListBlock(ordered, startNum, items)
    }

    private fun collectListItem(item: ListItem): ListItemNode {
        val segments = mutableListOf<TextSegment>()
        var checked: Boolean? = null
        val children = mutableListOf<ListItemNode>()

        var child = item.firstChild
        while (child != null) {
            when (child) {
                is Paragraph -> {
                    val first = child.firstChild
                    if (first is TaskListItemMarker) {
                        checked = first.isChecked
                        val marker = first
                        currentTextSegments = mutableListOf()
                        var node = marker.next
                        while (node != null) {
                            node.accept(this)
                            node = node.next
                        }
                        segments.addAll(currentTextSegments)
                        restoreSegmentBuffer()
                    } else {
                        segments.addAll(inlineSegments(child))
                    }
                }
                is BulletList -> {
                    children.add(collectListItemChildren(child, ordered = false))
                }
                is OrderedList -> {
                    children.add(collectListItemChildren(child, ordered = true))
                }
            }
            child = child.next
        }
        return ListItemNode(segments, checked, children)
    }

    private fun collectListItemChildren(listBlock: ListBlock, ordered: Boolean): ListItemNode {
        val subItems = mutableListOf<ListItemNode>()
        var child = listBlock.firstChild
        while (child != null) {
            if (child is ListItem) {
                subItems.add(collectListItem(child))
            }
            child = child.next
        }
        return ListItemNode(segments = emptyList(), checked = null, children = subItems)
    }

    private fun collectQuoteParagraphs(quote: BlockQuote, skipMarker: Int = 0) {
        quoteParagraphs.clear()
        var child = quote.firstChild
        while (child != null) {
            if (child is Paragraph) {
                val paragraphSegments = inlineSegments(child)
                val cleaned = if (skipMarker > 0 && paragraphSegments.isNotEmpty()) {
                    val first = paragraphSegments.first()
                    val rest = when (first) {
                        is TextSegment.Plain -> first.text.drop(skipMarker)
                        else -> null
                    }
                    if (rest != null) {
                        (listOf(TextSegment.Plain(rest)) + paragraphSegments.drop(1))
                            .filterNot { it is TextSegment.Plain && it.text.isEmpty() }
                    } else {
                        paragraphSegments
                    }
                } else {
                    paragraphSegments
                }
                if (cleaned.any { it !is TextSegment.SoftBreak }) {
                    quoteParagraphs.add(cleaned)
                }
            }
            child = child.next
        }
    }

    private fun collectTable(tableBlock: TableBlock): MarkdownBlock.Table? {
        val headers = mutableListOf<String>()
        val rows = mutableListOf<List<String>>()

        var child = tableBlock.firstChild
        while (child != null) {
            when (child) {
                is TableHead -> {
                    var row = child.firstChild
                    while (row != null) {
                        if (row is TableRow) {
                            var cell = row.firstChild
                            while (cell != null) {
                                if (cell is TableCell) {
                                    headers.add(inlineText(cell).trim())
                                }
                                cell = cell.next
                            }
                        }
                        row = row.next
                    }
                }
                is TableBody -> {
                    var row = child.firstChild
                    while (row != null) {
                        if (row is TableRow) {
                            val rowData = mutableListOf<String>()
                            var cell = row.firstChild
                            while (cell != null) {
                                if (cell is TableCell) {
                                    rowData.add(inlineText(cell).trim())
                                }
                                cell = cell.next
                            }
                            if (rowData.isNotEmpty()) rows.add(rowData)
                        }
                        row = row.next
                    }
                }
            }
            child = child.next
        }
        return if (headers.isNotEmpty()) MarkdownBlock.Table(headers, rows) else null
    }

    private fun inlineSegments(parent: org.commonmark.node.Node): List<TextSegment> {
        val outer = currentTextSegments
        currentTextSegments = mutableListOf()
        visitChildren(parent)
        val result = currentTextSegments.toList()
        currentTextSegments = outer
        return result
    }

    private fun inlineText(node: org.commonmark.node.Node): String {
        return inlineSegments(node).mapNotNull { segment ->
            when (segment) {
                is TextSegment.Plain -> segment.text
                is TextSegment.Bold -> segment.text
                is TextSegment.Italic -> segment.text
                is TextSegment.Strikethrough -> segment.text
                is TextSegment.InlineCode -> segment.text
                is TextSegment.Link -> segment.text
                is TextSegment.Image -> segment.alt
                is TextSegment.SoftBreak -> " "
                is TextSegment.HardBreak -> " "
            }
        }.joinToString("").trim()
    }

    private fun restoreSegmentBuffer() {
        currentTextSegments = mutableListOf()
    }

    private fun flushParagraph() {
        if (currentTextSegments.isNotEmpty()) {
            blocks.add(MarkdownBlock.Paragraph(currentTextSegments.toList()))
            currentTextSegments = mutableListOf()
        }
    }

    private fun detectAdmonitionMarker(quote: BlockQuote): Pair<AdmonitionType, Int>? {
        val firstParagraph = quote.firstChild as? Paragraph ?: return null
        val firstText = firstParagraph.firstChild as? Text ?: return null
        val match = Regex("""^\[!(\w+)\]\s*""", RegexOption.IGNORE_CASE).find(firstText.literal)
            ?: return null
        val type = AdmonitionType.fromMarker(match.groupValues[1]) ?: return null
        return type to match.value.length
    }
}
