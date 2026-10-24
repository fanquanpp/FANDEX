import 'package:markdown/markdown.dart' as md;

// Markdown 块模型 — commonmark AST 到 GEOCON 渲染模型的转换。

sealed class MdInline {
  const MdInline();
}

class MintPlain extends MdInline {
  final String text;
  final bool bold;
  final bool italic;
  final bool strike;
  const MintPlain(this.text, {this.bold = false, this.italic = false, this.strike = false});
}

class MintCode extends MdInline {
  final String text;
  const MintCode(this.text);
}

class MintLink extends MdInline {
  final String text;
  final String href;
  const MintLink(this.text, this.href);
}

class MintMath extends MdInline {
  final String expr;
  const MintMath(this.expr);
}

class MintImg extends MdInline {
  final String alt;
  const MintImg(this.alt);
}

sealed class MdBlock {
  const MdBlock();
}

class BHeading extends MdBlock {
  final int level;
  final List<MdInline> inlines;
  const BHeading(this.level, this.inlines);
}

class BParagraph extends MdBlock {
  final List<MdInline> inlines;
  const BParagraph(this.inlines);
}

class BCode extends MdBlock {
  final String lang;
  final String code;
  const BCode(this.lang, this.code);
}

class BMath extends MdBlock {
  final String expr;
  const BMath(this.expr);
}

class MdListItem {
  final List<MdBlock> blocks;
  final bool? taskChecked;
  const MdListItem(this.blocks, this.taskChecked);
}

class BList extends MdBlock {
  final bool ordered;
  final List<MdListItem> items;
  const BList(this.ordered, this.items);
}

class BQuote extends MdBlock {
  final String? admonition;
  final List<MdBlock> blocks;
  const BQuote(this.admonition, this.blocks);
}

class BTable extends MdBlock {
  final List<String> header;
  final List<List<String>> rows;
  const BTable(this.header, this.rows);
}

class BDivider extends MdBlock {
  const BDivider();
}

class BImage extends MdBlock {
  final String alt;
  const BImage(this.alt);
}

class MarkdownResult {
  final List<MdBlock> blocks;
  final List<(int, String)> headings;

  const MarkdownResult({required this.blocks, required this.headings});
}

final _inlineMathRe = RegExp(r'\$([^$\n]+)\$');

MarkdownResult parseMarkdown(String body) {
  final doc = md.Document(extensionSet: md.ExtensionSet.gitHubFlavored);
  final nodes = doc.parse(body);
  final blocks = <MdBlock>[];
  final headings = <(int, String)>[];

  for (final node in nodes) {
    final block = _walkBlock(node, headings);
    if (block != null) blocks.add(block);
  }
  return MarkdownResult(blocks: blocks, headings: headings);
}

MdBlock? _walkBlock(md.Node node, List<(int, String)> headings) {
  if (node is! md.Element) return null;
  switch (node.tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      final level = int.parse(node.tag.substring(1));
      final inlines = _walkInlines(node.children);
      if (level <= 4) headings.add((level, inlinePlain(inlines)));
      return BHeading(level, inlines);
    case 'p':
      final rawText = inlinePlain(_walkInlines(node.children));
      final trimmed = rawText.trim();
      if (trimmed.startsWith(r'$$') && trimmed.endsWith(r'$$') && trimmed.length > 4) {
        return BMath(trimmed.substring(2, trimmed.length - 2).trim());
      }
      final inlines = _splitInlineMath(_walkInlines(node.children));
      return BParagraph(inlines);
    case 'pre':
      final codeEl = _findCodeElement(node);
      if (codeEl == null) return null;
      final langClass = (codeEl.attributes['class'] ?? '').replaceFirst('language-', '').trim();
      final code = _textOf(codeEl.children);
      final lang = langClass.isEmpty ? 'text' : langClass;
      return BCode(lang, code.endsWith('\n') ? code.substring(0, code.length - 1) : code);
    case 'ul':
    case 'ol':
      return _walkList(node);
    case 'blockquote':
      return _walkQuote(node, headings);
    case 'table':
      return _walkTable(node);
    case 'hr':
      return const BDivider();
    default:
      // 内联块降级为段落。
      final inlines = _walkInlines(node.children);
      if (inlines.isEmpty) return null;
      return BParagraph(inlines);
  }
}

md.Element? _findCodeElement(md.Element pre) {
  for (final child in pre.children ?? const <md.Node>[]) {
    if (child is md.Element && child.tag == 'code') return child;
  }
  return null;
}

BList _walkList(md.Element node) {
  final items = <MdListItem>[];
  for (final child in node.children ?? const <md.Node>[]) {
    if (child is md.Element && child.tag == 'li') {
      bool? taskChecked;
      final children = child.children ?? const <md.Node>[];
      final contentNodes = <md.Node>[];

      for (final c in children) {
        if (c is md.Element && c.tag == 'input') {
          taskChecked = c.attributes['checked'] != null;
          continue;
        }
        // 任务勾选可能包在 p 里。
        if (c is md.Element && c.tag == 'p') {
          final pChildren = c.children ?? const <md.Node>[];
          var consumedInput = false;
          final kept = <md.Node>[];
          for (final pc in pChildren) {
            if (pc is md.Element && pc.tag == 'input') {
              taskChecked = pc.attributes['checked'] != null;
              consumedInput = true;
              continue;
            }
            kept.add(pc);
          }
          if (consumedInput) {
            contentNodes.addAll(kept);
            continue;
          }
        }
        contentNodes.add(c);
      }

      final blocks = <MdBlock>[];
      if (contentNodes.isNotEmpty && contentNodes.every((n) => n is md.Text || (n is md.Element && _isInlineTag(n.tag)))) {
        final inlines = _splitInlineMath(_walkInlines(contentNodes));
        if (inlines.isNotEmpty) blocks.add(BParagraph(inlines));
      } else {
        for (final c in contentNodes) {
          final b = _walkBlock(c, const []);
          if (b != null) blocks.add(b);
        }
      }
      items.add(MdListItem(blocks, taskChecked));
    }
  }
  return BList(node.tag == 'ol', items);
}

bool _isInlineTag(String tag) {
  const inlineTags = {'strong', 'em', 'del', 'code', 'a', 'img', 'br', 'input'};
  return inlineTags.contains(tag);
}

BQuote _walkQuote(md.Element node, List<(int, String)> headings) {
  final blocks = <MdBlock>[];
  String? admonition;

  final children = node.children ?? const <md.Node>[];
  for (var i = 0; i < children.length; i++) {
    final c = children[i];
    if (i == 0 && c is md.Element && c.tag == 'p') {
      final raw = _textOf(c.children).trim();
      final match = RegExp(r'^\[!(\w+)\]\s*(.*)$').firstMatch(raw);
      if (match != null) {
        admonition = match.group(1)!.toUpperCase();
        final rest = match.group(2) ?? '';
        final restInlines = _splitInlineMath(_walkInlines(c.children).skip(1).toList());
        if (rest.isNotEmpty && blocks.isEmpty) {
          blocks.add(BParagraph(restInlines));
        }
        continue;
      }
    }
    final b = _walkBlock(c, headings);
    if (b != null) blocks.add(b);
  }
  return BQuote(admonition, blocks);
}

BTable _walkTable(md.Element node) {
  final header = <String>[];
  final rows = <List<String>>[];

  for (final child in node.children ?? const <md.Node>[]) {
    if (child is! md.Element) continue;
    if (child.tag == 'thead') {
      for (final tr in child.children ?? const <md.Node>[]) {
        if (tr is md.Element && tr.tag == 'tr') {
          for (final th in tr.children ?? const <md.Node>[]) {
            if (th is md.Element) header.add(_textOf(th.children));
          }
        }
      }
    } else if (child.tag == 'tbody') {
      for (final tr in child.children ?? const <md.Node>[]) {
        if (tr is md.Element && tr.tag == 'tr') {
          final row = <String>[];
          for (final td in tr.children ?? const <md.Node>[]) {
            if (td is md.Element) row.add(_textOf(td.children));
          }
          rows.add(row);
        }
      }
    }
  }
  return BTable(header, rows);
}

List<MdInline> _walkInlines(List<md.Node>? nodes) {
  final out = <MdInline>[];
  for (final node in nodes ?? const <md.Node>[]) {
    if (node is md.Text) {
      final text = node.text;
      if (text.isNotEmpty) out.add(MintPlain(text));
    } else if (node is md.UnparsedContent) {
      if (node.textContent.isNotEmpty) out.add(MintPlain(node.textContent));
    } else if (node is md.Element) {
      switch (node.tag) {
        case 'strong':
          for (final i in _walkInlines(node.children)) {
            if (i is MintPlain) out.add(MintPlain(i.text, bold: true, italic: i.italic, strike: i.strike));
          }
          break;
        case 'em':
          for (final i in _walkInlines(node.children)) {
            if (i is MintPlain) out.add(MintPlain(i.text, bold: i.bold, italic: true, strike: i.strike));
          }
          break;
        case 'del':
          for (final i in _walkInlines(node.children)) {
            if (i is MintPlain) out.add(MintPlain(i.text, bold: i.bold, italic: i.italic, strike: true));
          }
          break;
        case 'code':
          out.add(MintCode(_textOf(node.children)));
          break;
        case 'a':
          out.add(MintLink(_textOf(node.children), node.attributes['href'] ?? ''));
          break;
        case 'img':
          out.add(MintImg(node.attributes['alt'] ?? ''));
          break;
        case 'br':
          out.add(const MintPlain('\n'));
          break;
        case 'input':
          out.add(const MintPlain('[ ] '));
          break;
        default:
          out.addAll(_walkInlines(node.children));
      }
    }
  }
  return out;
}

// 把纯文本里的行内公式拆成 MintMath。
List<MdInline> _splitInlineMath(List<MdInline> inlines) {
  final out = <MdInline>[];
  for (final inline in inlines) {
    if (inline is! MintPlain) {
      out.add(inline);
      continue;
    }
    final text = inline.text;
    final matches = _inlineMathRe.allMatches(text).toList();
    if (matches.isEmpty) {
      out.add(inline);
      continue;
    }
    var cursor = 0;
    for (final m in matches) {
      if (m.start > cursor) {
        out.add(_copyPlain(inline, text.substring(cursor, m.start)));
      }
      out.add(MintMath(m.group(1)!.trim()));
      cursor = m.end;
    }
    if (cursor < text.length) {
      out.add(_copyPlain(inline, text.substring(cursor)));
    }
  }
  return out;
}

MintPlain _copyPlain(MintPlain source, String text) {
  if (text.isEmpty) return source;
  return MintPlain(text, bold: source.bold, italic: source.italic, strike: source.strike);
}

String inlinePlain(List<MdInline> inlines) {
  final buf = StringBuffer();
  for (final i in inlines) {
    if (i is MintPlain) buf.write(i.text);
    if (i is MintCode) buf.write(i.text);
    if (i is MintLink) buf.write(i.text);
    if (i is MintMath) buf.write(i.expr);
    if (i is MintImg) buf.write(i.alt);
  }
  return buf.toString();
}

String _textOf(List<md.Node>? nodes) {
  final buf = StringBuffer();
  for (final node in nodes ?? const <md.Node>[]) {
    if (node is md.Text) buf.write(node.text);
    if (node is md.UnparsedContent) buf.write(node.textContent);
    if (node is md.Element) buf.write(_textOf(node.children));
  }
  return buf.toString();
}
