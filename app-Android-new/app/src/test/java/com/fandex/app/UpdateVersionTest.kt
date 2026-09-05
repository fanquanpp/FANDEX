package com.fandex.app

import com.fandex.app.update.UpdateChecker
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * 更新版本比较逻辑单元测试
 *
 * 覆盖 computeVersionCode 的语义化版本解析、位数进位、
 * 非法输入兜底，以及 parseVersionName 的前缀剥离
 */
class UpdateVersionTest {

    /** 标准三段语义化版本 -> 版本码 */
    @Test
    fun computesStandardVersionCodes() {
        assertEquals(30000, UpdateChecker.computeVersionCode("3.0.0"))
        assertEquals(30105, UpdateChecker.computeVersionCode("3.1.5"))
        assertEquals(40201, UpdateChecker.computeVersionCode("4.2.1"))
    }

    /** 多位数段：minor / patch 超过 9 时仍按百位进位正确比较 */
    @Test
    fun computesMultiDigitSegments() {
        assertEquals(30110, UpdateChecker.computeVersionCode("3.1.10"))
        assertEquals(100203, UpdateChecker.computeVersionCode("10.2.3"))
        // 进位边界：3.1.99 < 3.2.0
        assert(UpdateChecker.computeVersionCode("3.1.99") < UpdateChecker.computeVersionCode("3.2.0"))
    }

    /** 非法输入兜底：非数字段按 0 处理，不抛异常 */
    @Test
    fun invalidSegmentsFallBackToZero() {
        assertEquals(30000, UpdateChecker.computeVersionCode("3.0"))
        assertEquals(30000, UpdateChecker.computeVersionCode("3"))
        assertEquals(0, UpdateChecker.computeVersionCode(""))
        assertEquals(30000, UpdateChecker.computeVersionCode("3.a.0"))
    }

    /** 版本比较：新版本码大于当前版本码即视为有更新 */
    @Test
    fun newerVersionHasLargerCode() {
        val current = UpdateChecker.computeVersionCode("4.2.1")
        assert(UpdateChecker.computeVersionCode("4.2.2") > current)
        assert(UpdateChecker.computeVersionCode("5.0.0") > current)
        // 同版本：不应提示更新
        assertEquals(current, UpdateChecker.computeVersionCode("4.2.1"))
    }

    /** tagName 解析：剥离 v / V 前缀与空白 */
    @Test
    fun parsesTagNamePrefixes() {
        assertEquals("3.0.0", UpdateChecker.parseVersionName("v3.0.0"))
        assertEquals("3.0.0", UpdateChecker.parseVersionName("V3.0.0"))
        assertEquals("3.0.0", UpdateChecker.parseVersionName("3.0.0"))
        assertEquals("3.0.0", UpdateChecker.parseVersionName(" v3.0.0 "))
    }

    /** 端到端比较：tagName -> 版本码 -> 与当前版本比较 */
    @Test
    fun endToEndTagComparison() {
        val current = UpdateChecker.computeVersionCode("4.2.1")
        val latest = UpdateChecker.computeVersionCode(UpdateChecker.parseVersionName("v4.3.0"))
        assert(latest > current)
    }
}
