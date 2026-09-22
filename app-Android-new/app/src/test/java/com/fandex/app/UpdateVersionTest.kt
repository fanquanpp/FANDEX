package com.fandex.app

import com.fandex.app.update.UpdateChecker
import org.junit.Assert.assertEquals
import org.junit.Test

class UpdateVersionTest {

    @Test
    fun computesStandardVersionCodes() {
        assertEquals(30000, UpdateChecker.computeVersionCode("3.0.0"))
        assertEquals(30105, UpdateChecker.computeVersionCode("3.1.5"))
        assertEquals(40201, UpdateChecker.computeVersionCode("4.2.1"))
    }

    @Test
    fun computesMultiDigitSegments() {
        assertEquals(30110, UpdateChecker.computeVersionCode("3.1.10"))
        assertEquals(100203, UpdateChecker.computeVersionCode("10.2.3"))
        assert(UpdateChecker.computeVersionCode("3.1.99") < UpdateChecker.computeVersionCode("3.2.0"))
    }

    @Test
    fun invalidSegmentsFallBackToZero() {
        assertEquals(30000, UpdateChecker.computeVersionCode("3.0"))
        assertEquals(30000, UpdateChecker.computeVersionCode("3"))
        assertEquals(0, UpdateChecker.computeVersionCode(""))
        assertEquals(30000, UpdateChecker.computeVersionCode("3.a.0"))
    }

    @Test
    fun newerVersionHasLargerCode() {
        val current = UpdateChecker.computeVersionCode("4.2.1")
        assert(UpdateChecker.computeVersionCode("4.2.2") > current)
        assert(UpdateChecker.computeVersionCode("5.0.0") > current)
        assertEquals(current, UpdateChecker.computeVersionCode("4.2.1"))
    }

    @Test
    fun parsesTagNamePrefixes() {
        assertEquals("3.0.0", UpdateChecker.parseVersionName("v3.0.0"))
        assertEquals("3.0.0", UpdateChecker.parseVersionName("V3.0.0"))
        assertEquals("3.0.0", UpdateChecker.parseVersionName("3.0.0"))
        assertEquals("3.0.0", UpdateChecker.parseVersionName(" v3.0.0 "))
    }

    @Test
    fun endToEndTagComparison() {
        val current = UpdateChecker.computeVersionCode("4.2.1")
        val latest = UpdateChecker.computeVersionCode(UpdateChecker.parseVersionName("v4.3.0"))
        assert(latest > current)
    }
}
