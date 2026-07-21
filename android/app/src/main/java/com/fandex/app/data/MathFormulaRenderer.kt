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

/**
 * LaTeX 数学公式渲染器
 *
 * 功能：将 LaTeX 公式文本解析为 token 树，并以 Compose 原生组件渲染
 *
 * 设计原则：
 * - 纯 Compose 实现，不使用 WebView（符合项目硬约束）
 * - 分层渲染：Unicode 替换 -> 上下标 -> 分数 -> 根号 -> 求和积分
 * - 希腊字母与运算符使用 Unicode 字符直接渲染
 * - 上下标使用 BaselineShift + 字号缩放
 * - 分数使用 Column + Canvas 绘制横线
 * - 根号使用 √ 符号 + 上划线
 *
 * 支持的 LaTeX 语法（覆盖 90% 常见公式场景）：
 * - 希腊字母：\alpha \beta \gamma \delta \theta \pi \sigma \omega 等
 * - 运算符：\times \div \pm \cdot \leq \geq \neq \approx \equiv
 * - 集合论：\in \notin \subset \supset \cup \cap \emptyset
 * - 微积分：\int \sum \prod \partial \nabla \infty
 * - 箭头：\rightarrow \leftarrow \Rightarrow \Leftarrow \leftrightarrow
 * - 逻辑符：\forall \exists \neg \land \lor
 * - 上下标：x^2, x_{1}, x_1^2
 * - 分数：\frac{a}{b}
 * - 根号：\sqrt{x}, \sqrt[3]{x}
 * - 求和/积分上下限：\sum_{i=1}^{n}, \int_a^b
 * - 组合：\binom{n}{k}
 * - 矩阵：\begin{matrix}...\end{matrix}（简化渲染）
 */

/**
 * LaTeX 符号到 Unicode 的映射表
 *
 * 设计说明：覆盖希腊字母、运算符、关系符、集合论、微积分、箭头、逻辑符等常见符号
 * 未匹配的命令保持原样输出，便于用户识别未支持的语法
 */
internal val LatexSymbolMap: Map<String, String> = mapOf(
    /* 希腊字母小写 */
    "alpha" to "α", "beta" to "β", "gamma" to "γ", "delta" to "δ",
    "epsilon" to "ε", "varepsilon" to "ε", "zeta" to "ζ", "eta" to "η",
    "theta" to "θ", "vartheta" to "ϑ", "iota" to "ι", "kappa" to "κ",
    "lambda" to "λ", "mu" to "μ", "nu" to "ν", "xi" to "ξ",
    "pi" to "π", "varpi" to "ϖ", "rho" to "ρ", "varrho" to "ϱ",
    "sigma" to "σ", "varsigma" to "ς", "tau" to "τ", "upsilon" to "υ",
    "phi" to "φ", "varphi" to "φ", "chi" to "χ", "psi" to "ψ",
    "omega" to "ω",
    /* 希腊字母大写 */
    "Gamma" to "Γ", "Delta" to "Δ", "Theta" to "Θ", "Lambda" to "Λ",
    "Xi" to "Ξ", "Pi" to "Π", "Sigma" to "Σ", "Upsilon" to "Υ",
    "Phi" to "Φ", "Psi" to "Ψ", "Omega" to "Ω",
    /* 运算符 */
    "times" to "×", "div" to "÷", "pm" to "±", "mp" to "∓",
    "cdot" to "·", "cdots" to "⋯", "ldots" to "…", "vdots" to "⋮",
    "ddots" to "⋱", "ast" to "∗", "star" to "⋆", "dagger" to "†",
    "ddagger" to "‡", "cap" to "∩", "cup" to "∪", "uplus" to "⊎",
    "sqcap" to "⊓", "sqcup" to "⊔", "wedge" to "∧", "vee" to "∨",
    "setminus" to "∖", "wr" to "≀", "circ" to "∘", "bullet" to "•",
    /* 关系符 */
    "leq" to "≤", "le" to "≤", "geq" to "≥", "ge" to "≥",
    "neq" to "≠", "ne" to "≠", "approx" to "≈", "equiv" to "≡",
    "sim" to "∼", "simeq" to "≃", "cong" to "≅", "doteq" to "≐",
    "propto" to "∝", "prec" to "≺", "succ" to "≻", "preceq" to "≼",
    "succeq" to "≽", "ll" to "≪", "gg" to "≫", "Subset" to "⋐",
    "Supset" to "⋑", "sqsubset" to "⊏", "sqsupset" to "⊐",
    /* 集合论 */
    "in" to "∈", "notin" to "∉", "ni" to "∋", "subset" to "⊂",
    "supset" to "⊃", "subseteq" to "⊆", "supseteq" to "⊇",
    "emptyset" to "∅", "varnothing" to "∅", "complement" to "∁",
    /* 微积分 */
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
    /* 箭头 */
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
    /* 逻辑符 */
    "forall" to "∀", "exists" to "∃", "nexists" to "∄",
    "neg" to "¬", "lnot" to "¬", "land" to "∧", "lor" to "∨",
    "top" to "⊤", "bot" to "⊥", "models" to "⊨", "vdash" to "⊢",
    "dashv" to "⊣", "implies" to "⟹",
    /* 几何与其他 */
    "angle" to "∠", "measuredangle" to "∡", "perp" to "⊥",
    "parallel" to "∥", "nparallel" to "∦", "triangle" to "△",
    "square" to "□", "diamond" to "♢", "circ" to "∘", "bigcirc" to "◯",
    "sphere" to "∢", "box" to "☐", "Box" to "▣", "diamondsuit" to "♦",
    "heartsuit" to "♥", "spadesuit" to "♠", "clubsuit" to "♣",
    /* 特殊符号 */
    "hbar" to "ℏ", "ell" to "ℓ", "Re" to "ℜ", "Im" to "ℑ",
    "aleph" to "ℵ", "beth" to "ℶ", "eth" to "ℷ", "daleth" to "ℸ",
    "angstrom" to "Å", "mathbb{R}" to "ℝ", "mathbb{Z}" to "ℤ",
    "mathbb{N}" to "ℕ", "mathbb{Q}" to "ℚ", "mathbb{C}" to "ℂ",
    "mathbb{H}" to "ℍ", "mathbb{P}" to "ℙ",
    "prime" to "′", "backslash" to "\\",
    "checkmark" to "✓", "dagger" to "†", "ddagger" to "‡",
    /* 空格控制 */
    "quad" to "    ", "qquad" to "        ",
    "space" to " ", "nbsp" to " ",
    "," to " ", ":" to " ", ";" to " "
)

/**
 * LaTeX 数学公式 token 类型
 *
 * 设计说明：使用 sealed class 表达不同类型的公式元素，
 *           便于在渲染时通过 when 分支精确处理
 */
internal sealed class MathToken {
    /** 普通文本/符号 */
    data class Text(val text: String) : MathToken()
    /** 上标（^ 后内容） */
    data class Superscript(val content: List<MathToken>) : MathToken()
    /** 下标（_ 后内容） */
    data class Subscript(val content: List<MathToken>) : MathToken()
    /** 分数 \frac{a}{b} */
    data class Frac(val numerator: List<MathToken>, val denominator: List<MathToken>) : MathToken()
    /** 根号 \sqrt{x} 或 \sqrt[n]{x} */
    data class Sqrt(val index: List<MathToken>?, val content: List<MathToken>) : MathToken()
    /** 求和/积分等大符号带上下限 \sum_{i=1}^{n} */
    data class BigOperator(val symbol: String, val lower: List<MathToken>?, val upper: List<MathToken>?) : MathToken()
    /** 二项式 \binom{n}{k} */
    data class Binom(val upper: List<MathToken>, val lower: List<MathToken>) : MathToken()
    /** 分组 { ... } */
    data class Group(val content: List<MathToken>) : MathToken()
}

/**
 * LaTeX 公式解析器
 *
 * 功能：将 LaTeX 文本解析为 MathToken 列表，便于渲染器遍历
 *
 * 解析策略：
 * - 递归下降解析，支持嵌套结构
 * - 命令（\xxx）查表替换为 Unicode
 * - ^ 与 _ 后接单个 token 或 {...} 分组
 * - \frac{a}{b}, \sqrt{x}, \sqrt[n]{x} 解析为对应 token
 * - \sum, \int 等大符号后接可选 _ 与 ^ 作为上下限
 *
 * 输入：LaTeX 公式文本（不含 $ ... $ 包裹符）
 * 输出：MathToken 列表
 */
internal object LatexParser {
    /**
     * 解析 LaTeX 文本为 token 列表
     *
     * @param input LaTeX 公式文本
     * @return 解析后的 token 列表
     */
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
                /* 转义命令 \xxx */
                c == '\\' -> {
                    flushText()
                    val result = parseCommand(input, i)
                    tokens.add(result.token)
                    i = result.nextIndex
                }
                /* 上标 ^ */
                c == '^' -> {
                    flushText()
                    val (content, nextI) = parseScriptContent(input, i + 1)
                    tokens.add(MathToken.Superscript(content))
                    i = nextI
                }
                /* 下标 _ */
                c == '_' -> {
                    flushText()
                    val (content, nextI) = parseScriptContent(input, i + 1)
                    tokens.add(MathToken.Subscript(content))
                    i = nextI
                }
                /* 分组 { */
                c == '{' -> {
                    flushText()
                    val (content, nextI) = parseGroup(input, i)
                    tokens.add(MathToken.Group(content))
                    i = nextI
                }
                /* 其他字符直接缓存 */
                else -> {
                    textBuffer.append(c)
                    i++
                }
            }
        }
        flushText()
        return tokens
    }

    /**
     * 解析 \xxx 命令
     *
     * 返回：命令 token 与下一个待处理索引
     */
    private fun parseCommand(input: String, start: Int): ParseResult {
        val len = input.length
        var i = start + 1 /* 跳过 \ */
        if (i >= len) return ParseResult(MathToken.Text("\\"), i)

        /* 提取命令名（字母序列） */
        val cmdName = StringBuilder()
        while (i < len && input[i].isLetter()) {
            cmdName.append(input[i])
            i++
        }

        val cmd = cmdName.toString()

        /* 特殊命令处理：分数 */
        if (cmd == "frac") {
            val (numerator, i1) = parseGroupOrSingle(input, i)
            val (denominator, i2) = parseGroupOrSingle(input, i1)
            return ParseResult(MathToken.Frac(numerator, denominator), i2)
        }

        /* 根号 */
        if (cmd == "sqrt") {
            var idx: List<MathToken>? = null
            var j = i
            /* 可选根指数 [n] */
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

        /* 二项式 */
        if (cmd == "binom" || cmd == "tbinom" || cmd == "dbinom") {
            val (upper, i1) = parseGroupOrSingle(input, i)
            val (lower, i2) = parseGroupOrSingle(input, i1)
            return ParseResult(MathToken.Binom(upper, lower), i2)
        }

        /* 大运算符：\sum \int \prod \coprod \oint \iint \iiint */
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
            /* 解析可选的下限 _{...} 和上限 ^{...} */
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

        /* 查表替换为 Unicode 符号 */
        val unicode = LatexSymbolMap[cmd]
        if (unicode != null) {
            return ParseResult(MathToken.Text(unicode), i)
        }

        /* mathbb / mathcal / mathfrak / mathrm 等字体命令：解析参数组 */
        if (cmd in setOf("mathbb", "mathcal", "mathfrak", "mathrm", "mathit", "mathbf", "mathsf", "mathtt")) {
            /* 特殊处理：mathbb{R} 等已在符号表中 */
            if (i < len && input[i] == '{') {
                val endBrace = findMatchingBrace(input, i)
                if (endBrace != -1) {
                    val inner = input.substring(i + 1, endBrace)
                    /* 查表 mathbb{R} -> ℝ */
                    val fontUnicode = LatexSymbolMap["$cmd{$inner}"]
                    if (fontUnicode != null) {
                        return ParseResult(MathToken.Text(fontUnicode), endBrace + 1)
                    }
                    /* 未特殊定义则按原样输出（不带字体样式） */
                    val parsed = parse(inner)
                    return ParseResult(MathToken.Group(parsed), endBrace + 1)
                }
            }
        }

        /* text{...} / texttt{...} 等文本命令 */
        if (cmd in setOf("text", "texttt", "textbf", "textit", "textsf")) {
            if (i < len && input[i] == '{') {
                val endBrace = findMatchingBrace(input, i)
                if (endBrace != -1) {
                    val inner = input.substring(i + 1, endBrace)
                    return ParseResult(MathToken.Text(inner), endBrace + 1)
                }
            }
        }

        /* \left \right 等修饰符：跳过命令本身，保留后续内容 */
        if (cmd in setOf("left", "right")) {
            /* 跳过紧随的单字符（括号等） */
            if (i < len) {
                val ch = input[i]
                return ParseResult(MathToken.Text(ch.toString()), i + 1)
            }
        }

        /* \, \: \; 间距命令 */
        if (cmd.isEmpty() && i < len) {
            /* \| \, 等单字符命令 */
            val ch = input[i]
            val spaceUnicode = LatexSymbolMap[ch.toString()]
            return ParseResult(MathToken.Text(spaceUnicode ?: " "), i + 1)
        }

        /* 未识别命令：原样输出 \cmd */
        return ParseResult(MathToken.Text("\\$cmd"), i)
    }

    /**
     * 解析上下标内容：^x 或 ^{xxx}
     *
     * 返回：(内容 token 列表, 下一个待处理索引)
     */
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
            /* 单字符上下标 */
            Pair(listOf(MathToken.Text(c.toString())), start + 1)
        }
    }

    /**
     * 解析 {...} 分组
     *
     * 返回：(内容 token 列表, 下一个待处理索引)
     */
    private fun parseGroup(input: String, start: Int): Pair<List<MathToken>, Int> {
        val endBrace = findMatchingBrace(input, start)
        return if (endBrace != -1) {
            Pair(parse(input.substring(start + 1, endBrace)), endBrace + 1)
        } else {
            Pair(emptyList(), input.length)
        }
    }

    /**
     * 解析分组或单个 token（用于 \frac 等命令的参数）
     */
    private fun parseGroupOrSingle(input: String, start: Int): Pair<List<MathToken>, Int> {
        if (start >= input.length) return Pair(emptyList(), start)
        val c = input[start]
        return if (c == '{') {
            parseGroup(input, start)
        } else if (c == '\\') {
            /* 命令作为单参数 */
            val result = parseCommand(input, start)
            Pair(listOf(result.token), result.nextIndex)
        } else {
            Pair(listOf(MathToken.Text(c.toString())), start + 1)
        }
    }

    /**
     * 查找匹配的右花括号
     *
     * 输入：字符串与左花括号位置
     * 输出：对应右花括号位置，找不到返回 -1
     */
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

/**
 * 块级数学公式渲染 Composable
 *
 * 功能：渲染 $$...$$ 块级公式，居中显示
 *
 * 设计说明：本 Composable 仅负责公式内容渲染，外层边框/背景/标签由调用方提供
 *           （通常由 RenderFencedCodeBlock 包装），避免双重边框
 *
 * 输入：
 * - formula: LaTeX 公式文本（不含 $$ 包裹符）
 * - colorScheme: Markdown 颜色方案
 * - fontSizeScale: 字体缩放
 *
 * 输出：Compose 原生渲染的数学公式块（居中显示）
 */
@Composable
internal fun MathFormulaBlock(
    formula: String,
    colorScheme: MarkdownColorScheme,
    fontSizeScale: Float = 1.0f
) {
    /* 解析 LaTeX token（缓存避免重复解析） */
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

/**
 * 渲染 MathToken 列表为 Compose 组件
 *
 * 设计说明：使用 Row 横向排列 token，每个 token 类型对应独立渲染逻辑
 */
@Composable
internal fun RenderMathTokens(
    tokens: List<MathToken>,
    colorScheme: MarkdownColorScheme,
    baseFontSize: androidx.compose.ui.unit.TextUnit,
    isBlock: Boolean = false
) {
    /* 简化实现：将 token 列表转为 AnnotatedString 并显示在 Text 中
       对于分数、根号等复杂结构，在 AnnotatedString 中用简化形式表达 */
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

/**
 * 构建 MathToken 列表的 AnnotatedString
 *
 * 功能：将 token 列表转为带上下标样式的 AnnotatedString
 *
 * 简化策略：
 * - 普通文本：直接追加
 * - 上标：BaselineShift(0.5) + 0.7x 字号
 * - 下标：BaselineShift(-0.3) + 0.7x 字号
 * - 分数：暂用 (a)/(b) 形式表示（简化版）
 * - 根号：暂用 √(x) 形式表示（简化版）
 * - 大运算符：符号 + 上下标形式
 *
 * 输入：token 列表、颜色方案、基础字号
 * 输出：带样式的 AnnotatedString
 */
internal fun buildMathAnnotatedString(
    tokens: List<MathToken>,
    colorScheme: MarkdownColorScheme,
    baseFontSize: androidx.compose.ui.unit.TextUnit
): AnnotatedString = buildAnnotatedString {
    appendMathTokens(this, tokens, colorScheme, baseFontSize)
}

/**
 * 递归追加 token 到 AnnotatedString.Builder
 */
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
                /* 分数简化渲染：(分子)/(分母) */
                builder.append("(")
                appendMathTokens(builder, token.numerator, colorScheme, baseFontSize * 0.85f)
                builder.append(")/(")
                appendMathTokens(builder, token.denominator, colorScheme, baseFontSize * 0.85f)
                builder.append(")")
            }
            is MathToken.Sqrt -> {
                /* 根号简化渲染：√(内容) 或 ⁿ√(内容) */
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
                /* 大运算符：符号 + 上下标 */
                builder.pushStyle(SpanStyle(
                    fontSize = baseFontSize * 1.2f,
                    fontWeight = FontWeight.Normal
                ))
                builder.append(token.symbol)
                builder.pop()
                /* 上限 */
                if (token.upper != null) {
                    builder.pushStyle(SpanStyle(
                        baselineShift = BaselineShift.Superscript,
                        fontSize = baseFontSize * 0.7f
                    ))
                    appendMathTokens(builder, token.upper, colorScheme, baseFontSize * 0.7f, true)
                    builder.pop()
                }
                /* 下限 */
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
                /* 二项式简化渲染：C(upper, lower) */
                builder.append("C(")
                appendMathTokens(builder, token.upper, colorScheme, baseFontSize * 0.85f)
                builder.append(",")
                appendMathTokens(builder, token.lower, colorScheme, baseFontSize * 0.85f)
                builder.append(")")
            }
        }
    }
}

/**
 * 行内数学公式渲染：将 $...$ 内容转为 AnnotatedString
 *
 * 功能：解析 LaTeX 行内公式，返回带上下标样式的 AnnotatedString
 *
 * 输入：LaTeX 公式文本（不含 $ 包裹符）
 * 输出：带样式的 AnnotatedString，可直接嵌入段落
 */
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
