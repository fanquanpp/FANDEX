package com.fandex.app.ui.markdown

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle

object SyntaxHighlighter {

    data class Palette(
        val text: Int,
        val keyword: Int,
        val string: Int,
        val number: Int,
        val comment: Int,
        val annotation: Int,
        val function: Int,
        val tag: Int
    )

    private data class Span(val start: Int, val end: Int, val style: SpanStyle)

    private class LangConfig(
        val lineComments: List<String> = emptyList(),
        val blockComment: Pair<String, String>? = null,
        val stringDelims: Set<Char> = setOf('"', '\''),
        val tripleQuotes: Boolean = false,
        val keywords: Set<String> = emptySet(),
        val decoratorAt: Boolean = false,
        val preprocessorHash: Boolean = false,
        val dollarVar: Boolean = false
    )

    private val configs: Map<String, LangConfig> = buildMap {
        val cKeywords = setOf(
            "auto", "break", "case", "char", "const", "continue", "default", "do", "double",
            "else", "enum", "extern", "float", "for", "goto", "if", "inline", "int", "long",
            "register", "restrict", "return", "short", "signed", "sizeof", "static", "struct",
            "switch", "typedef", "union", "unsigned", "void", "volatile", "while", "bool",
            "true", "false", "NULL", "nullptr", "class", "new", "delete", "this", "virtual",
            "override", "template", "typename", "namespace", "using", "public", "private",
            "protected", "operator", "try", "catch", "throw", "noexcept", "constexpr", "auto"
        )
        put("c", LangConfig(
            lineComments = listOf("//"), blockComment = "/*" to "*/",
            keywords = cKeywords, preprocessorHash = true
        ))
        put("cpp", LangConfig(
            lineComments = listOf("//"), blockComment = "/*" to "*/",
            keywords = cKeywords + setOf("using", "namespace", "template"), preprocessorHash = true
        ))
        put("java", LangConfig(
            lineComments = listOf("//"), blockComment = "/*" to "*/",
            keywords = setOf(
                "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
                "class", "const", "continue", "default", "do", "double", "else", "enum",
                "extends", "final", "finally", "float", "for", "goto", "if", "implements",
                "import", "instanceof", "int", "interface", "long", "native", "new", "package",
                "private", "protected", "public", "return", "short", "static", "strictfp",
                "super", "switch", "synchronized", "this", "throw", "throws", "transient",
                "try", "void", "volatile", "while", "var", "record", "sealed", "yield",
                "true", "false", "null"
            ), decoratorAt = true
        ))
        put("kotlin", LangConfig(
            lineComments = listOf("//"), blockComment = "/*" to "*/",
            keywords = setOf(
                "as", "break", "by", "catch", "class", "companion", "const", "constructor",
                "continue", "crossinline", "data", "do", "dynamic", "else", "enum", "expect",
                "external", "false", "final", "finally", "for", "fun", "get", "if", "import",
                "in", "infix", "init", "inline", "inner", "interface", "internal", "is",
                "lateinit", "lazy", "noinline", "null", "object", "open", "operator",
                "out", "override", "package", "private", "protected", "public", "reified",
                "return", "sealed", "set", "super", "suspend", "this", "throw", "true",
                "try", "typealias", "val", "var", "vararg", "when", "where", "while"
            ), decoratorAt = true
        ))
        put("csharp", LangConfig(
            lineComments = listOf("//"), blockComment = "/*" to "*/",
            keywords = setOf(
                "abstract", "as", "async", "await", "base", "bool", "break", "byte", "case",
                "catch", "char", "checked", "class", "const", "continue", "decimal", "default",
                "delegate", "do", "double", "else", "enum", "event", "explicit", "extern",
                "false", "finally", "fixed", "float", "for", "foreach", "get", "goto", "if",
                "implicit", "in", "int", "interface", "internal", "is", "lock", "long",
                "namespace", "new", "null", "object", "operator", "out", "override", "params",
                "private", "protected", "public", "readonly", "ref", "return", "sealed",
                "set", "short", "sizeof", "static", "string", "struct", "switch", "this",
                "throw", "true", "try", "typeof", "uint", "ulong", "unchecked", "unsafe",
                "ushort", "using", "var", "virtual", "void", "volatile", "while", "record"
            ), decoratorAt = true
        ))
        put("go", LangConfig(
            lineComments = listOf("//"), blockComment = "/*" to "*/",
            keywords = setOf(
                "break", "case", "chan", "const", "continue", "default", "defer", "else",
                "fallthrough", "for", "func", "go", "goto", "if", "import", "interface",
                "map", "package", "range", "return", "select", "struct", "switch", "type",
                "var", "nil", "true", "false", "string", "int", "int8", "int16", "int32",
                "int64", "uint", "uint8", "uint16", "uint32", "uint64", "float32", "float64",
                "bool", "byte", "rune", "error", "append", "len", "cap", "make", "new"
            )
        ))
        put("rust", LangConfig(
            lineComments = listOf("//"), blockComment = "/*" to "*/",
            keywords = setOf(
                "as", "async", "await", "break", "const", "continue", "crate", "dyn", "else",
                "enum", "extern", "false", "fn", "for", "if", "impl", "in", "let", "loop",
                "match", "mod", "move", "mut", "pub", "ref", "return", "self", "Self",
                "static", "struct", "super", "trait", "true", "type", "unsafe", "use",
                "where", "while", "Some", "None", "Ok", "Err"
            ), decoratorAt = true
        ))
        put("typescript", LangConfig(
            lineComments = listOf("//"), blockComment = "/*" to "*/",
            keywords = setOf(
                "abstract", "any", "as", "async", "await", "boolean", "break", "case", "catch",
                "class", "const", "continue", "debugger", "declare", "default", "delete", "do",
                "else", "enum", "export", "extends", "false", "finally", "for", "from",
                "function", "get", "if", "implements", "import", "in", "infer", "instanceof",
                "interface", "is", "keyof", "let", "namespace", "never", "new", "null",
                "number", "object", "of", "private", "protected", "public", "readonly",
                "return", "satisfies", "set", "static", "string", "super", "switch", "symbol",
                "this", "throw", "true", "try", "type", "typeof", "undefined", "unknown",
                "var", "void", "while", "yield", "bigint"
            ), decoratorAt = true
        ))
        put("javascript", LangConfig(
            lineComments = listOf("//"), blockComment = "/*" to "*/",
            keywords = setOf(
                "async", "await", "break", "case", "catch", "class", "const", "continue",
                "debugger", "default", "delete", "do", "else", "export", "extends", "false",
                "finally", "for", "function", "if", "import", "in", "instanceof", "let",
                "new", "null", "of", "return", "static", "super", "switch", "this", "throw",
                "true", "try", "typeof", "undefined", "var", "void", "while", "yield",
                "get", "set"
            ), decoratorAt = true
        ))
        put("lua", LangConfig(
            lineComments = listOf("--"),
            keywords = setOf(
                "and", "break", "do", "else", "elseif", "end", "false", "for", "function",
                "goto", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then",
                "true", "until", "while", "self"
            )
        ))
        put("python", LangConfig(
            lineComments = listOf("#"), tripleQuotes = true,
            keywords = setOf(
                "and", "as", "assert", "async", "await", "break", "class", "continue", "def",
                "del", "elif", "else", "except", "False", "finally", "for", "from", "global",
                "if", "import", "in", "is", "lambda", "None", "nonlocal", "not", "or",
                "pass", "raise", "return", "True", "try", "while", "with", "yield", "self",
                "match", "case"
            ), decoratorAt = true
        ))
        put("sql", LangConfig(
            lineComments = listOf("--"), blockComment = "/*" to "*/",
            stringDelims = setOf('\''),
            keywords = setOf(
                "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
                "DELETE", "CREATE", "TABLE", "DROP", "ALTER", "INDEX", "VIEW", "JOIN",
                "LEFT", "RIGHT", "INNER", "OUTER", "FULL", "CROSS", "ON", "GROUP", "BY",
                "ORDER", "HAVING", "LIMIT", "OFFSET", "AS", "AND", "OR", "NOT", "NULL",
                "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "DISTINCT", "UNION", "ALL",
                "EXISTS", "BETWEEN", "LIKE", "IN", "IS", "CASE", "WHEN", "THEN", "ELSE",
                "END", "COUNT", "SUM", "AVG", "MIN", "MAX", "DESC", "ASC", "EXPLAIN",
                "ANALYZE", "WITH", "RECURSIVE", "CONFLICT", "DEFAULT", "UNIQUE", "CHECK",
                "BEGIN", "COMMIT", "ROLLBACK", "TRANSACTION", "GRANT", "REVOKE", "TRUNCATE"
            )
        ))
        put("bash", LangConfig(
            lineComments = listOf("#"), stringDelims = setOf('"', '\''), dollarVar = true,
            keywords = setOf(
                "if", "then", "else", "elif", "fi", "for", "while", "until", "do", "done",
                "case", "esac", "function", "return", "exit", "echo", "export", "local",
                "read", "cd", "source", "alias", "set", "unset", "shift", "trap", "eval",
                "exec", "in"
            )
        ))
        put("yaml", LangConfig(
            lineComments = listOf("#"), stringDelims = setOf('"', '\''),
            keywords = setOf("true", "false", "null", "yes", "no", "on", "off")
        ))
        put("json", LangConfig(
            lineComments = listOf("//"), blockComment = "/*" to "*/",
            keywords = setOf("true", "false", "null")
        ))
    }

    private fun configKey(language: String): String {
        val lang = language.trim().lowercase()
        return when (lang) {
            "c++", "cc", "cxx", "hpp" -> "cpp"
            "kt", "kts" -> "kotlin"
            "cs" -> "csharp"
            "golang" -> "go"
            "rs" -> "rust"
            "ts", "tsx", "jsx", "mjs", "cjs" -> "typescript"
            "js" -> "javascript"
            "py" -> "python"
            "sh", "shell", "zsh", "console", "shell-session" -> "bash"
            "yml" -> "yaml"
            "mysql", "postgresql", "postgres", "sqlite", "psql" -> "sql"
            else -> lang
        }
    }

    fun highlight(code: String, language: String, palette: Palette): AnnotatedString {
        val key = configKey(language)
        val spans = when (key) {
            "html", "xml", "svg", "vue" -> tokenizeHtml(code, palette)
            "css", "scss", "less" -> tokenizeCss(code, palette)
            "markdown", "md" -> tokenizeMarkdown(code, palette)
            "mermaid", "text", "txt", "plain" -> emptyList()
            else -> {
                val cfg = configs[key] ?: return buildAnnotatedString { append(code) }
                tokenizeGeneric(code, cfg, palette)
            }
        }

        return buildAnnotatedString {
            append(code)
            spans.forEach { span ->
                addStyle(span.style, span.start, span.end)
            }
        }
    }

    private fun tokenizeGeneric(code: String, cfg: LangConfig, p: Palette): List<Span> {
        val spans = mutableListOf<Span>()
        val keywordStyle = SpanStyle(color = color(p.keyword))
        val stringStyle = SpanStyle(color = color(p.string))
        val numberStyle = SpanStyle(color = color(p.number))
        val commentStyle = SpanStyle(color = color(p.comment), fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
        val annotationStyle = SpanStyle(color = color(p.annotation))
        val functionStyle = SpanStyle(color = color(p.function))

        val n = code.length
        var i = 0
        outer@ while (i < n) {
            val ch = code[i]

            for (start in cfg.lineComments) {
                if (code.startsWith(start, i)) {
                    val end = code.indexOf('\n', i).let { if (it < 0) n else it }
                    spans.add(Span(i, end, commentStyle))
                    i = end
                    continue@outer
                }
            }

            val block = cfg.blockComment
            if (block != null && code.startsWith(block.first, i)) {
                val end = code.indexOf(block.second, i + block.first.length)
                val stop = if (end < 0) n else end + block.second.length
                spans.add(Span(i, stop, commentStyle))
                i = stop
                continue@outer
            }

            if (cfg.tripleQuotes && (code.startsWith("\"\"\"", i) || code.startsWith("'''", i))) {
                val delim = code.substring(i, i + 3)
                val end = code.indexOf(delim, i + 3)
                val stop = if (end < 0) n else end + 3
                spans.add(Span(i, stop, stringStyle))
                i = stop
                continue@outer
            }

            if (ch in cfg.stringDelims) {
                var j = i + 1
                while (j < n) {
                    when {
                        code[j] == '\\' -> j += 2
                        code[j] == ch -> { j++; break }
                        code[j] == '\n' && cfg.tripleQuotes.not() -> break
                        else -> j++
                    }
                }
                val stop = minOf(j, n)
                spans.add(Span(i, stop, stringStyle))
                i = stop
                continue@outer
            }

            if (ch.isDigit() || (ch == '.' && i + 1 < n && code[i + 1].isDigit())) {
                var j = i + 1
                while (j < n && (code[j].isLetterOrDigit() || code[j] == '.' || code[j] == '_')) j++
                spans.add(Span(i, j, numberStyle))
                i = j
                continue@outer
            }

            if (ch.isLetter() || ch == '_' || ch == '$') {
                var j = i + 1
                while (j < n && (code[j].isLetterOrDigit() || code[j] == '_')) j++
                val word = code.substring(i, j)
                when {
                    word in cfg.keywords -> spans.add(Span(i, j, keywordStyle))
                    nextNonSpace(code, j) == '(' -> spans.add(Span(i, j, functionStyle))
                    word[0].isUpperCase() -> spans.add(Span(i, j, annotationStyle))
                }
                i = j
                continue@outer
            }

            if (cfg.decoratorAt && ch == '@' && i + 1 < n && code[i + 1].isLetter()) {
                var j = i + 1
                while (j < n && (code[j].isLetterOrDigit() || code[j] == '_' || code[j] == '.')) j++
                spans.add(Span(i, j, annotationStyle))
                i = j
                continue@outer
            }

            if (cfg.preprocessorHash && ch == '#' && atLineStart(code, i)) {
                var j = i + 1
                while (j < n && code[j].isLetter()) j++
                spans.add(Span(i, j, annotationStyle))
                i = j
                continue@outer
            }

            if (cfg.dollarVar && ch == '$' && i + 1 < n && (code[i + 1].isLetterOrDigit() || code[i + 1] == '{')) {
                var j = i + 1
                if (code[j] == '{') {
                    val end = code.indexOf('}', j)
                    j = if (end < 0) n else end + 1
                } else {
                    while (j < n && (code[j].isLetterOrDigit() || code[j] == '_')) j++
                }
                spans.add(Span(i, j, annotationStyle))
                i = j
                continue@outer
            }

            i++
        }
        return spans
    }

    private fun tokenizeHtml(code: String, p: Palette): List<Span> {
        val spans = mutableListOf<Span>()
        val tagStyle = SpanStyle(color = color(p.tag))
        val attrStyle = SpanStyle(color = color(p.annotation))
        val stringStyle = SpanStyle(color = color(p.string))
        val commentStyle = SpanStyle(color = color(p.comment), fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)

        val n = code.length
        var i = 0
        while (i < n) {
            if (code.startsWith("<!--", i)) {
                val end = code.indexOf("-->", i)
                val stop = if (end < 0) n else end + 3
                spans.add(Span(i, stop, commentStyle))
                i = stop
                continue
            }
            if (code[i] == '<') {
                val tagEnd = code.indexOf('>', i)
                val stop = if (tagEnd < 0) n else tagEnd + 1
                var j = i + 1
                if (j < n && code[j] == '/') j++
                val nameStart = j
                while (j < n && code[j].isLetterOrDigit()) j++
                if (j > nameStart) spans.add(Span(nameStart, j, tagStyle))
                var k = j
                while (k < stop) {
                    if (code[k] == '=' ) {
                        var s = k - 1
                        while (s > j && !code[s].isWhitespace()) s--
                        spans.add(Span(s + 1, k, attrStyle))
                        var v = k + 1
                        if (v < stop && (code[v] == '"' || code[v] == '\'')) {
                            val quote = code[v]
                            val end = code.indexOf(quote, v + 1)
                            val valueEnd = if (end < 0) stop else end + 1
                            spans.add(Span(v, valueEnd, stringStyle))
                            k = valueEnd
                            continue
                        }
                    }
                    k++
                }
                i = stop
                continue
            }
            i++
        }
        return spans
    }

    private fun tokenizeCss(code: String, p: Palette): List<Span> {
        val spans = mutableListOf<Span>()
        val keywordStyle = SpanStyle(color = color(p.keyword))
        val stringStyle = SpanStyle(color = color(p.string))
        val numberStyle = SpanStyle(color = color(p.number))
        val propertyStyle = SpanStyle(color = color(p.annotation))
        val commentStyle = SpanStyle(color = color(p.comment), fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)

        val n = code.length
        var i = 0
        var inBlock = false
        while (i < n) {
            if (code.startsWith("/*", i)) {
                val end = code.indexOf("*/", i + 2)
                val stop = if (end < 0) n else end + 2
                spans.add(Span(i, stop, commentStyle))
                i = stop
                continue
            }
            val ch = code[i]
            when {
                ch == '{' -> { inBlock = true; i++ }
                ch == '}' -> { inBlock = false; i++ }
                ch == '@' -> {
                    var j = i + 1
                    while (j < n && code[j].isLetterOrDigit()) j++
                    spans.add(Span(i, j, keywordStyle))
                    i = j
                }
                ch == '"' || ch == '\'' -> {
                    val end = code.indexOf(ch, i + 1)
                    val stop = if (end < 0) n else end + 1
                    spans.add(Span(i, stop, stringStyle))
                    i = stop
                }
                ch.isDigit() -> {
                    var j = i + 1
                    while (j < n && (code[j].isLetterOrDigit() || code[j] == '.' || code[j] == '%')) j++
                    spans.add(Span(i, j, numberStyle))
                    i = j
                }
                ch == '#' && i + 1 < n && code[i + 1].isLetterOrDigit() -> {
                    var j = i + 1
                    while (j < n && code[j].isLetterOrDigit()) j++
                    spans.add(Span(i, j, numberStyle))
                    i = j
                }
                ch.isLetter() && inBlock -> {
                    var j = i + 1
                    while (j < n && (code[j].isLetterOrDigit() || code[j] == '-')) j++
                    if (nextNonSpace(code, j) == ':') spans.add(Span(i, j, propertyStyle))
                    i = j
                }
                else -> i++
            }
        }
        return spans
    }

    private fun tokenizeMarkdown(code: String, p: Palette): List<Span> {
        val spans = mutableListOf<Span>()
        val headingStyle = SpanStyle(color = color(p.keyword))
        val codeStyle = SpanStyle(color = color(p.string))

        var offset = 0
        for (line in code.split('\n')) {
            val trimmed = line.trimStart()
            when {
                trimmed.startsWith("#") -> spans.add(Span(offset, offset + line.length, headingStyle))
                trimmed.startsWith("```") -> spans.add(Span(offset, offset + line.length, codeStyle))
            }
            offset += line.length + 1
        }
        return spans
    }

    private fun nextNonSpace(code: String, from: Int): Char {
        var i = from
        while (i < code.length && code[i].isWhitespace()) i++
        return if (i < code.length) code[i] else ' '
    }

    private fun atLineStart(code: String, index: Int): Boolean {
        var i = index - 1
        while (i >= 0 && (code[i] == ' ' || code[i] == '\t')) i--
        return i < 0 || code[i] == '\n'
    }

    private fun color(argb: Int) = androidx.compose.ui.graphics.Color(argb)
}
