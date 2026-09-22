package com.fandex.app.data

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fandex.app.ui.theme.MarkdownColorScheme

internal val LatexSymbolMap: Map<String, String> = mapOf(
    "vert" to "|", "Vert" to "‖", "lvert" to "|", "rvert" to "|",
    "lVert" to "‖", "rVert" to "‖", "mid" to "|", "lmid" to "|",
    "alpha" to "α", "beta" to "β", "gamma" to "γ", "delta" to "δ",
    "epsilon" to "ε", "varepsilon" to "ε", "zeta" to "ζ", "eta" to "η",
    "theta" to "θ", "vartheta" to "ϑ", "iota" to "ι", "kappa" to "κ",
    "lambda" to "λ", "mu" to "μ", "nu" to "ν", "xi" to "ξ",
    "pi" to "π", "varpi" to "ϖ", "rho" to "ρ", "varrho" to "ϱ",
    "sigma" to "σ", "varsigma" to "ς", "tau" to "τ", "upsilon" to "υ",
    "phi" to "φ", "varphi" to "φ", "chi" to "χ", "psi" to "ψ",
    "omega" to "ω",
    "Gamma" to "Γ", "Delta" to "Δ", "Theta" to "Θ", "Lambda" to "Λ",
    "Xi" to "Ξ", "Pi" to "Π", "Sigma" to "Σ", "Upsilon" to "Υ",
    "Phi" to "Φ", "Psi" to "Ψ", "Omega" to "Ω",
    "times" to "×", "div" to "÷", "pm" to "±", "mp" to "∓",
    "cdot" to "·", "cdots" to "⋯", "ldots" to "…", "vdots" to "⋮",
    "ddots" to "⋱", "ast" to "∗", "star" to "⋆", "dagger" to "†",
    "ddagger" to "‡", "cap" to "∩", "cup" to "∪", "uplus" to "⊎",
    "sqcap" to "⊓", "sqcup" to "⊔", "wedge" to "∧", "vee" to "∨",
    "setminus" to "∖", "wr" to "≀", "circ" to "∘", "bullet" to "•",
    "leq" to "≤", "le" to "≤", "geq" to "≥", "ge" to "≥",
    "neq" to "≠", "ne" to "≠", "approx" to "≈", "equiv" to "≡",
    "sim" to "∼", "simeq" to "≃", "cong" to "≅", "doteq" to "≐",
    "propto" to "∝", "prec" to "≺", "succ" to "≻", "preceq" to "≼",
    "succeq" to "≽", "ll" to "≪", "gg" to "≫", "Subset" to "⋐",
    "Supset" to "⋑", "sqsubset" to "⊏", "sqsupset" to "⊐",
    "in" to "∈", "notin" to "∉", "ni" to "∋", "subset" to "⊂",
    "supset" to "⊃", "subseteq" to "⊆", "supseteq" to "⊇",
    "emptyset" to "∅", "varnothing" to "∅", "complement" to "∁",
    "int" to "∫", "iint" to "∬", "iiint" to "∭", "oint" to "∮",
    "sum" to "∑", "prod" to "∏", "coprod" to "∐",
    "partial" to "∂", "nabla" to "∇", "infty" to "∞",
    "lim" to "lim", "log" to "log", "ln" to "ln", "exp" to "exp",
    "sin" to "sin", "cos" to "cos", "tan" to "tan",
    "cot" to "cot", "sec" to "sec", "csc" to "csc",
    "arcsin" to "arcsin", "arccos" to "arccos", "arctan" to "arctan",
    "sinh" to "sinh", "cosh" to "cosh", "tanh" to "tanh",
    "max" to "max", "min" to "min", "sup" to "sup", "inf" to "inf",
    "det" to "det", "dim" to "dim", "ker" to "ker", "deg" to "deg",
    "gcd" to "gcd", "hom" to "hom", "arg" to "arg",
    "rightarrow" to "→", "to" to "→", "leftarrow" to "←",
    "gets" to "←", "leftrightarrow" to "↔", "Rightarrow" to "⇒",
    "Leftarrow" to "⇐", "Leftrightarrow" to "⇔", "iff" to "⇔",
    "mapsto" to "↦", "hookrightarrow" to "↪", "hookleftarrow" to "↩",
    "uparrow" to "↑", "downarrow" to "↓", "updownarrow" to "↕",
    "Uparrow" to "⇑", "Downarrow" to "⇓", "Updownarrow" to "⇕",
    "nearrow" to "↗", "searrow" to "↘", "nwarrow" to "↖", "swarrow" to "↙",
    "rightharpoonup" to "⇀", "rightharpoondown" to "⇁",
    "leftharpoonup" to "↼", "leftharpoondown" to "↽",
    "rightleftharpoons" to "⇌", "leadsto" to "⇝",
    "forall" to "∀", "exists" to "∃", "nexists" to "∄",
    "neg" to "¬", "lnot" to "¬", "land" to "∧", "lor" to "∨",
    "top" to "⊤", "bot" to "⊥", "models" to "⊨", "vdash" to "⊢",
    "dashv" to "⊣", "implies" to "⟹",
    "angle" to "∠", "measuredangle" to "∡", "perp" to "⊥",
    "parallel" to "∥", "nparallel" to "∦", "triangle" to "△",
    "square" to "□", "diamond" to "♢", "circ" to "∘", "bigcirc" to "◯",
    "sphere" to "∢", "box" to "☐", "Box" to "▣", "diamondsuit" to "♦",
    "heartsuit" to "♥", "spadesuit" to "♠", "clubsuit" to "♣",
    "hbar" to "ℏ", "ell" to "ℓ", "Re" to "ℜ", "Im" to "ℑ",
    "aleph" to "ℵ", "beth" to "ℶ", "eth" to "ℷ", "daleth" to "ℸ",
    "angstrom" to "Å", "mathbb{R}" to "ℝ", "mathbb{Z}" to "ℤ",
    "mathbb{N}" to "ℕ", "mathbb{Q}" to "ℚ", "mathbb{C}" to "ℂ",
    "mathbb{H}" to "ℍ", "mathbb{P}" to "ℙ",
    "prime" to "′", "backslash" to "\\",
    "checkmark" to "✓", "dagger" to "†", "ddagger" to "‡",
    "quad" to "    ", "qquad" to "        ",
    "space" to " ", "nbsp" to " ",
    "," to " ", ":" to " ", ";" to " "
)

internal sealed class MathToken {
    data class Text(val text: String) : MathToken()
    data class Superscript(val content: List<MathToken>) : MathToken()
    data class Subscript(val content: List<MathToken>) : MathToken()
    data class Frac(val numerator: List<MathToken>, val denominator: List<MathToken>) : MathToken()
    data class Sqrt(val index: List<MathToken>?, val content: List<MathToken>) : MathToken()
    data class BigOperator(val symbol: String, val lower: List<MathToken>?, val upper: List<MathToken>?) : MathToken()
    data class Binom(val upper: List<MathToken>, val lower: List<MathToken>) : MathToken()
    data class Group(val content: List<MathToken>) : MathToken()
}

internal object LatexParser {
    fun parse(input: String): List<MathToken> {
        val tokens = mutableListOf<MathToken>()
        val textBuffer = StringBuilder()
        var i = 0
        val len = input.length

        fun flushText() {
            if (textBuffer.isNotEmpty()) {
                tokens.add(MathToken.Text(textBuffer.toString()))
                textBuffer.clear()
            }
        }

        while (i < len) {
            val c = input[i]
            when {
                c == '\\' -> {
                    flushText()
                    val result = parseCommand(input, i)
                    tokens.add(result.token)
                    i = result.nextIndex
                }
                c == '^' -> {
                    flushText()
                    val (content, nextI) = parseScriptContent(input, i + 1)
                    tokens.add(MathToken.Superscript(content))
                    i = nextI
                }
                c == '_' -> {
                    flushText()
                    val (content, nextI) = parseScriptContent(input, i + 1)
                    tokens.add(MathToken.Subscript(content))
                    i = nextI
                }
                c == '{' -> {
                    flushText()
                    val (content, nextI) = parseGroup(input, i)
                    tokens.add(MathToken.Group(content))
                    i = nextI
                }
                else -> {
                    textBuffer.append(c)
                    i++
                }
            }
        }
        flushText()
        return tokens
    }

    private fun parseCommand(input: String, start: Int): ParseResult {
        val len = input.length
        var i = start + 1
        if (i >= len) return ParseResult(MathToken.Text("\\"), i)

        val cmdName = StringBuilder()
        while (i < len && input[i].isLetter()) {
            cmdName.append(input[i])
            i++
        }

        val cmd = cmdName.toString()

        if (cmd == "frac") {
            val (numerator, i1) = parseGroupOrSingle(input, i)
            val (denominator, i2) = parseGroupOrSingle(input, i1)
            return ParseResult(MathToken.Frac(numerator, denominator), i2)
        }

        if (cmd == "sqrt") {
            var idx: List<MathToken>? = null
            var j = i
            if (j < len && input[j] == '[') {
                val endBracket = input.indexOf(']', j + 1)
                if (endBracket != -1) {
                    idx = parse(input.substring(j + 1, endBracket))
                    j = endBracket + 1
                }
            }
            val (content, nextI) = parseGroupOrSingle(input, j)
            return ParseResult(MathToken.Sqrt(idx, content), nextI)
        }

        if (cmd == "binom" || cmd == "tbinom" || cmd == "dbinom") {
            val (upper, i1) = parseGroupOrSingle(input, i)
            val (lower, i2) = parseGroupOrSingle(input, i1)
            return ParseResult(MathToken.Binom(upper, lower), i2)
        }

        if (cmd in setOf("sum", "int", "iint", "iiint", "oint", "prod", "coprod", "bigcap", "bigcup", "bigvee", "bigwedge", "bigoplus", "bigotimes")) {
            val symbol = LatexSymbolMap[cmd] ?: when (cmd) {
                "sum" -> "∑"
                "int" -> "∫"
                "iint" -> "∬"
                "iiint" -> "∭"
                "oint" -> "∮"
                "prod" -> "∏"
                "coprod" -> "∐"
                "bigcap" -> "⋂"
                "bigcup" -> "⋃"
                "bigvee" -> "⋁"
                "bigwedge" -> "⋀"
                "bigoplus" -> "⨁"
                "bigotimes" -> "⨂"
                else -> "\\$cmd"
            }
            var lower: List<MathToken>? = null
            var upper: List<MathToken>? = null
            var j = i
            while (j < len && (input[j] == '_' || input[j] == '^')) {
                val (content, nextJ) = parseScriptContent(input, j + 1)
                if (input[j] == '_') lower = content else upper = content
                j = nextJ
            }
            return ParseResult(MathToken.BigOperator(symbol, lower, upper), j)
        }

        val unicode = LatexSymbolMap[cmd]
        if (unicode != null) {
            return ParseResult(MathToken.Text(unicode), i)
        }

        if (cmd in setOf("mathbb", "mathcal", "mathfrak", "mathrm", "mathit", "mathbf", "mathsf", "mathtt")) {
            if (i < len && input[i] == '{') {
                val endBrace = findMatchingBrace(input, i)
                if (endBrace != -1) {
                    val inner = input.substring(i + 1, endBrace)
                    val fontUnicode = LatexSymbolMap["$cmd{$inner}"]
                    if (fontUnicode != null) {
                        return ParseResult(MathToken.Text(fontUnicode), endBrace + 1)
                    }
                    val parsed = parse(inner)
                    return ParseResult(MathToken.Group(parsed), endBrace + 1)
                }
            }
        }

        if (cmd in setOf("text", "texttt", "textbf", "textit", "textsf")) {
            if (i < len && input[i] == '{') {
                val endBrace = findMatchingBrace(input, i)
                if (endBrace != -1) {
                    val inner = input.substring(i + 1, endBrace)
                    return ParseResult(MathToken.Text(inner), endBrace + 1)
                }
            }
        }

        if (cmd in setOf("left", "right")) {
            if (i < len) {
                val ch = input[i]
                return ParseResult(MathToken.Text(ch.toString()), i + 1)
            }
        }

        if (cmd.isEmpty() && i < len) {
            val ch = input[i]
            val spaceUnicode = LatexSymbolMap[ch.toString()]
            return ParseResult(MathToken.Text(spaceUnicode ?: " "), i + 1)
        }

        return ParseResult(MathToken.Text("\\$cmd"), i)
    }

    private fun parseScriptContent(input: String, start: Int): Pair<List<MathToken>, Int> {
        if (start >= input.length) return Pair(emptyList(), start)
        val c = input[start]
        return if (c == '{') {
            val endBrace = findMatchingBrace(input, start)
            if (endBrace != -1) {
                Pair(parse(input.substring(start + 1, endBrace)), endBrace + 1)
            } else {
                Pair(listOf(MathToken.Text(input.substring(start + 1))), input.length)
            }
        } else {
            Pair(listOf(MathToken.Text(c.toString())), start + 1)
        }
    }

    private fun parseGroup(input: String, start: Int): Pair<List<MathToken>, Int> {
        val endBrace = findMatchingBrace(input, start)
        return if (endBrace != -1) {
            Pair(parse(input.substring(start + 1, endBrace)), endBrace + 1)
        } else {
            Pair(emptyList(), input.length)
        }
    }

    private fun parseGroupOrSingle(input: String, start: Int): Pair<List<MathToken>, Int> {
        if (start >= input.length) return Pair(emptyList(), start)
        val c = input[start]
        return if (c == '{') {
            parseGroup(input, start)
        } else if (c == '\\') {
            val result = parseCommand(input, start)
            Pair(listOf(result.token), result.nextIndex)
        } else {
            Pair(listOf(MathToken.Text(c.toString())), start + 1)
        }
    }

    private fun findMatchingBrace(input: String, start: Int): Int {
        var depth = 0
        for (i in start until input.length) {
            when (input[i]) {
                '{' -> depth++
                '}' -> {
                    depth--
                    if (depth == 0) return i
                }
            }
        }
        return -1
    }

    private data class ParseResult(val token: MathToken, val nextIndex: Int)
}

@Composable
internal fun MathFormulaBlock(
    formula: String,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float = 1.0f
) {
    val tokens = remember(formula) { LatexParser.parse(formula.trim()) }
    val baseFontSize = 16.sp * fontSizeScale

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        RenderMathTokens(
            tokens = tokens,
            colorScheme = colorScheme,
            baseFontSize = baseFontSize,
            isBlock = true
        )
    }
}

@Composable
internal fun RenderMathTokens(
    tokens: List<MathToken>,
    colorScheme: MarkdownColorScheme,
    baseFontSize: androidx.compose.ui.unit.TextUnit,
    isBlock: Boolean = false
) {
    val annotatedString = remember(tokens, colorScheme) {
        buildMathAnnotatedString(tokens, colorScheme, baseFontSize)
    }

    Text(
        text = annotatedString,
        fontSize = baseFontSize,
        color = colorScheme.onBackground,
        lineHeight = baseFontSize * 1.8f,
        fontFamily = FontFamily.Default,
        fontStyle = FontStyle.Italic
    )
}

internal fun buildMathAnnotatedString(
    tokens: List<MathToken>,
    colorScheme: MarkdownColorScheme,
    baseFontSize: androidx.compose.ui.unit.TextUnit
): AnnotatedString = buildAnnotatedString {
    appendMathTokens(this, tokens, colorScheme, baseFontSize)
}

private fun appendMathTokens(
    builder: AnnotatedString.Builder,
    tokens: List<MathToken>,
    colorScheme: MarkdownColorScheme,
    baseFontSize: androidx.compose.ui.unit.TextUnit,
    isScript: Boolean = false
) {
    for (token in tokens) {
        when (token) {
            is MathToken.Text -> {
                builder.append(token.text)
            }
            is MathToken.Group -> {
                appendMathTokens(builder, token.content, colorScheme, baseFontSize, isScript)
            }
            is MathToken.Superscript -> {
                builder.pushStyle(SpanStyle(
                    baselineShift = BaselineShift.Superscript,
                    fontSize = baseFontSize * 0.7f,
                    color = colorScheme.onBackground
                ))
                appendMathTokens(builder, token.content, colorScheme, baseFontSize * 0.7f, true)
                builder.pop()
            }
            is MathToken.Subscript -> {
                builder.pushStyle(SpanStyle(
                    baselineShift = BaselineShift.Subscript,
                    fontSize = baseFontSize * 0.7f,
                    color = colorScheme.onBackground
                ))
                appendMathTokens(builder, token.content, colorScheme, baseFontSize * 0.7f, true)
                builder.pop()
            }
            is MathToken.Frac -> {
                builder.append("(")
                appendMathTokens(builder, token.numerator, colorScheme, baseFontSize * 0.85f)
                builder.append(")/(")
                appendMathTokens(builder, token.denominator, colorScheme, baseFontSize * 0.85f)
                builder.append(")")
            }
            is MathToken.Sqrt -> {
                if (token.index != null) {
                    builder.pushStyle(SpanStyle(
                        baselineShift = BaselineShift.Superscript,
                        fontSize = baseFontSize * 0.7f
                    ))
                    appendMathTokens(builder, token.index, colorScheme, baseFontSize * 0.7f, true)
                    builder.pop()
                }
                builder.append("√(")
                appendMathTokens(builder, token.content, colorScheme, baseFontSize)
                builder.append(")")
            }
            is MathToken.BigOperator -> {
                builder.pushStyle(SpanStyle(
                    fontSize = baseFontSize * 1.2f,
                    fontWeight = FontWeight.Normal
                ))
                builder.append(token.symbol)
                builder.pop()
                if (token.upper != null) {
                    builder.pushStyle(SpanStyle(
                        baselineShift = BaselineShift.Superscript,
                        fontSize = baseFontSize * 0.7f
                    ))
                    appendMathTokens(builder, token.upper, colorScheme, baseFontSize * 0.7f, true)
                    builder.pop()
                }
                if (token.lower != null) {
                    builder.pushStyle(SpanStyle(
                        baselineShift = BaselineShift.Subscript,
                        fontSize = baseFontSize * 0.7f
                    ))
                    appendMathTokens(builder, token.lower, colorScheme, baseFontSize * 0.7f, true)
                    builder.pop()
                }
            }
            is MathToken.Binom -> {
                builder.append("C(")
                appendMathTokens(builder, token.upper, colorScheme, baseFontSize * 0.85f)
                builder.append(",")
                appendMathTokens(builder, token.lower, colorScheme, baseFontSize * 0.85f)
                builder.append(")")
            }
        }
    }
}

internal fun renderInlineMath(
    formula: String,
    colorScheme: MarkdownColorScheme,
    baseFontSize: androidx.compose.ui.unit.TextUnit
): AnnotatedString {
    val tokens = LatexParser.parse(formula.trim())
    return buildAnnotatedString {
        pushStyle(SpanStyle(fontStyle = FontStyle.Italic, color = colorScheme.primary))
        appendMathTokens(this, tokens, colorScheme, baseFontSize)
        pop()
    }
}
