package com.fandex.app.data

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class DataStoreManagerTest {

    private val context: Context
        get() = ApplicationProvider.getApplicationContext()

    @Before
    fun setUp() = runTest {
        DataStoreManager.saveDynamicBackground(context, true)
        DataStoreManager.saveAutoCheckUpdate(context, true)
        DataStoreManager.saveIgnoredUpdateVersion(context, "")
        DataStoreManager.saveLastUpdateCheckTime(context, 0L)
    }

    @Test
    fun `dynamicBackground 默认值与读写一致`() = runTest {
        val initialValue = DataStoreManager.getDynamicBackground(context).first()
        assertTrue("默认值应为 true", initialValue)

        DataStoreManager.saveDynamicBackground(context, false)
        val afterDisable = DataStoreManager.getDynamicBackground(context).first()
        assertFalse("关闭动态背景后应读取 false", afterDisable)

        DataStoreManager.saveDynamicBackground(context, true)
        val afterReEnable = DataStoreManager.getDynamicBackground(context).first()
        assertTrue("重新开启动态背景后应读取 true", afterReEnable)
    }

    @Test
    fun `autoCheckUpdate 默认值与读写一致`() = runTest {
        val initialValue = DataStoreManager.getAutoCheckUpdate(context).first()
        assertTrue("默认值应为 true", initialValue)

        DataStoreManager.saveAutoCheckUpdate(context, false)
        val afterDisable = DataStoreManager.getAutoCheckUpdate(context).first()
        assertFalse("关闭自动检查更新后应读取 false", afterDisable)

        DataStoreManager.saveAutoCheckUpdate(context, true)
        val afterReEnable = DataStoreManager.getAutoCheckUpdate(context).first()
        assertTrue("重新开启自动检查更新后应读取 true", afterReEnable)
    }

    @Test
    fun `ignoredUpdateVersion 默认值与读写一致`() = runTest {
        val initialValue = DataStoreManager.getIgnoredUpdateVersion(context).first()
        assertEquals("默认值应为空字符串", "", initialValue)

        DataStoreManager.saveIgnoredUpdateVersion(context, "3.1.0")
        val afterIgnore = DataStoreManager.getIgnoredUpdateVersion(context).first()
        assertEquals("3.1.0", afterIgnore)

        DataStoreManager.saveIgnoredUpdateVersion(context, "v3.2.0-beta")
        val complexVersion = DataStoreManager.getIgnoredUpdateVersion(context).first()
        assertEquals("v3.2.0-beta", complexVersion)

        DataStoreManager.saveIgnoredUpdateVersion(context, "")
        val afterClear = DataStoreManager.getIgnoredUpdateVersion(context).first()
        assertEquals("清空后应读取空字符串", "", afterClear)
    }

    @Test
    fun `lastUpdateCheckTime 默认值与读写一致`() = runTest {
        val initialValue = DataStoreManager.getLastUpdateCheckTime(context).first()
        assertEquals("默认值应为 0L", 0L, initialValue)

        val timestamp1 = 1721400000000L
        DataStoreManager.saveLastUpdateCheckTime(context, timestamp1)
        val afterWrite = DataStoreManager.getLastUpdateCheckTime(context).first()
        assertEquals(timestamp1, afterWrite)

        val timestamp2 = 1721403600000L
        DataStoreManager.saveLastUpdateCheckTime(context, timestamp2)
        val afterUpdate = DataStoreManager.getLastUpdateCheckTime(context).first()
        assertEquals(timestamp2, afterUpdate)
    }

    @Test
    fun `偏好设置写入后立即读取数据保留`() = runTest {
        DataStoreManager.saveDynamicBackground(context, false)
        DataStoreManager.saveAutoCheckUpdate(context, false)
        DataStoreManager.saveIgnoredUpdateVersion(context, "9.9.9")
        DataStoreManager.saveLastUpdateCheckTime(context, 1234567890L)

        assertEquals(false, DataStoreManager.getDynamicBackground(context).first())
        assertEquals(false, DataStoreManager.getAutoCheckUpdate(context).first())
        assertEquals("9.9.9", DataStoreManager.getIgnoredUpdateVersion(context).first())
        assertEquals(1234567890L, DataStoreManager.getLastUpdateCheckTime(context).first())
    }

    @Test
    fun `多个偏好字段互不干扰`() = runTest {
        DataStoreManager.saveDynamicBackground(context, false)
        DataStoreManager.saveAutoCheckUpdate(context, true)
        DataStoreManager.saveIgnoredUpdateVersion(context, "1.2.3")
        DataStoreManager.saveLastUpdateCheckTime(context, 999999L)

        DataStoreManager.saveDynamicBackground(context, true)

        assertEquals(true, DataStoreManager.getDynamicBackground(context).first())
        assertEquals(true, DataStoreManager.getAutoCheckUpdate(context).first())
        assertEquals("1.2.3", DataStoreManager.getIgnoredUpdateVersion(context).first())
        assertEquals(999999L, DataStoreManager.getLastUpdateCheckTime(context).first())
    }
}
