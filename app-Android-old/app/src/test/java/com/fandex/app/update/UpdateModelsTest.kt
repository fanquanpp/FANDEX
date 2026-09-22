package com.fandex.app.update

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class UpdateModelsTest {

    @Test
    fun `GitHubRelease 默认值正确`() {
        val release = GitHubRelease()
        assertEquals("", release.tagName)
        assertEquals("", release.name)
        assertEquals("", release.body)
        assertEquals("", release.publishedAt)
        assertEquals("", release.htmlUrl)
        assertTrue("assets 默认应为空列表", release.assets.isEmpty())
    }

    @Test
    fun `GitHubAsset 默认值正确`() {
        val asset = GitHubAsset()
        assertEquals("", asset.name)
        assertEquals(0L, asset.size)
        assertEquals("", asset.downloadUrl)
        assertEquals("", asset.contentType)
    }

    @Test
    fun `GitHubRelease 字段赋值正确`() {
        val asset = GitHubAsset(
            name = "FANDEX-v3.0.0.apk",
            size = 10485760L,
            downloadUrl = "https://objects.githubusercontent.com/FANDEX-v3.0.0.apk",
            contentType = "application/vnd.android.package-archive"
        )
        val release = GitHubRelease(
            tagName = "v3.0.0",
            name = "FANDEX v3.0.0",
            body = "## 更新内容",
            publishedAt = "2026-07-19T10:00:00Z",
            htmlUrl = "https://github.com/fanquanpp/FANDEX-App/releases/tag/v3.0.0",
            assets = listOf(asset)
        )

        assertEquals("v3.0.0", release.tagName)
        assertEquals("FANDEX v3.0.0", release.name)
        assertEquals("## 更新内容", release.body)
        assertEquals("2026-07-19T10:00:00Z", release.publishedAt)
        assertEquals(1, release.assets.size)
        assertEquals("FANDEX-v3.0.0.apk", release.assets[0].name)
        assertEquals(10485760L, release.assets[0].size)
    }

    @Test
    fun `UpdateInfo 字段赋值正确`() {
        val info = UpdateInfo(
            latestVersion = "3.1.0",
            latestVersionCode = 30100,
            downloadUrl = "https://example.com/apk",
            downloadSize = 1024L,
            releaseNotes = "release notes",
            publishedAt = "2026-07-19T10:00:00Z",
            htmlUrl = "https://github.com/release",
            isUpdateAvailable = true
        )

        assertEquals("3.1.0", info.latestVersion)
        assertEquals(30100, info.latestVersionCode)
        assertTrue(info.isUpdateAvailable)
    }

    @Test
    fun `DownloadState 状态机子类正确实例化`() {
        val idle: DownloadState = DownloadState.Idle
        val downloading: DownloadState = DownloadState.Downloading(
            progress = 50,
            downloadedBytes = 1024L,
            totalBytes = 2048L
        )
        val completed: DownloadState = DownloadState.Completed(File("/tmp/test.apk"))
        val failed: DownloadState = DownloadState.Failed("网络错误")

        assertTrue("Idle 应为 DownloadState 子类", idle is DownloadState)
        assertTrue("Downloading 应为 DownloadState 子类", downloading is DownloadState)
        assertTrue("Completed 应为 DownloadState 子类", completed is DownloadState)
        assertTrue("Failed 应为 DownloadState 子类", failed is DownloadState)

        val downloadingState = downloading as DownloadState.Downloading
        assertEquals(50, downloadingState.progress)
        assertEquals(1024L, downloadingState.downloadedBytes)
        assertEquals(2048L, downloadingState.totalBytes)

        val completedState = completed as DownloadState.Completed
        assertEquals(File("/tmp/test.apk"), completedState.file)

        val failedState = failed as DownloadState.Failed
        assertEquals("网络错误", failedState.message)
    }

    @Test
    fun `DownloadState when 分支穷举`() {
        fun describe(state: DownloadState): String = when (state) {
            is DownloadState.Idle -> "idle"
            is DownloadState.Downloading -> "downloading-${state.progress}"
            is DownloadState.Completed -> "completed-${state.file.name}"
            is DownloadState.Failed -> "failed-${state.message}"
        }

        assertEquals("idle", describe(DownloadState.Idle))
        assertEquals("downloading-75", describe(DownloadState.Downloading(75, 100L, 200L)))
        assertEquals("completed-test.apk", describe(DownloadState.Completed(File("test.apk"))))
        assertEquals("failed-timeout", describe(DownloadState.Failed("timeout")))
    }

    @Test
    fun `CheckState 状态机子类正确实例化`() {
        val idle: CheckState = CheckState.Idle
        val checking: CheckState = CheckState.Checking
        val upToDate: CheckState = CheckState.UpToDate
        val available: CheckState = CheckState.Available(
            UpdateInfo(
                latestVersion = "3.1.0",
                latestVersionCode = 30100,
                downloadUrl = "url",
                downloadSize = 100L,
                releaseNotes = "notes",
                publishedAt = "2026-07-19",
                htmlUrl = "html",
                isUpdateAvailable = true
            )
        )
        val failed: CheckState = CheckState.Failed("error")

        assertTrue(idle is CheckState)
        assertTrue(checking is CheckState)
        assertTrue(upToDate is CheckState)
        assertTrue(available is CheckState)
        assertTrue(failed is CheckState)

        val availableState = available as CheckState.Available
        assertEquals("3.1.0", availableState.updateInfo.latestVersion)
        assertTrue(availableState.updateInfo.isUpdateAvailable)

        val failedState = failed as CheckState.Failed
        assertEquals("error", failedState.message)
    }

    @Test
    fun `CheckState when 分支穷举`() {
        fun describe(state: CheckState): String = when (state) {
            is CheckState.Idle -> "idle"
            is CheckState.Checking -> "checking"
            is CheckState.UpToDate -> "uptodate"
            is CheckState.Available -> "available-${state.updateInfo.latestVersion}"
            is CheckState.Failed -> "failed-${state.message}"
        }

        assertEquals("idle", describe(CheckState.Idle))
        assertEquals("checking", describe(CheckState.Checking))
        assertEquals("uptodate", describe(CheckState.UpToDate))
        assertEquals(
            "available-3.1.0",
            describe(
                CheckState.Available(
                    UpdateInfo(
                        latestVersion = "3.1.0",
                        latestVersionCode = 30100,
                        downloadUrl = "",
                        downloadSize = 0L,
                        releaseNotes = "",
                        publishedAt = "",
                        htmlUrl = "",
                        isUpdateAvailable = true
                    )
                )
            )
        )
        assertEquals("failed-timeout", describe(CheckState.Failed("timeout")))
    }

    @Test
    fun `DownloadState Idle 与 CheckState Idle Checking UpToDate 为单例`() {
        assertSame(DownloadState.Idle, DownloadState.Idle)
        assertSame(CheckState.Idle, CheckState.Idle)
        assertSame(CheckState.Checking, CheckState.Checking)
        assertSame(CheckState.UpToDate, CheckState.UpToDate)
    }

    private fun assertSame(expected: Any?, actual: Any?) {
        assertTrue("期望两个引用相等: $expected vs $actual", expected === actual)
    }

    @Test
    fun `computeVersionCode 版本号计算逻辑`() {
        val checker = createCheckerForReflection()
        val computeVersionCode = UpdateChecker::class.java
            .getDeclaredMethod("computeVersionCode", String::class.java)
            .apply { isAccessible = true }

        assertEquals(30000, computeVersionCode.invoke(checker, "3.0.0"))
        assertEquals(30100, computeVersionCode.invoke(checker, "3.1.0"))
        assertEquals(30105, computeVersionCode.invoke(checker, "3.1.5"))
        assertEquals(30110, computeVersionCode.invoke(checker, "3.1.10"))
        assertEquals(100203, computeVersionCode.invoke(checker, "10.2.3"))
        assertEquals(30100, computeVersionCode.invoke(checker, "3.1"))
        assertEquals(30000, computeVersionCode.invoke(checker, "3"))
        assertEquals(30000, computeVersionCode.invoke(checker, "3.x.0"))
        assertEquals(0, computeVersionCode.invoke(checker, ""))
    }

    @Test
    fun `parseVersionName 版本名解析逻辑`() {
        val checker = createCheckerForReflection()
        val parseVersionName = UpdateChecker::class.java
            .getDeclaredMethod("parseVersionName", String::class.java)
            .apply { isAccessible = true }

        assertEquals("3.0.0", parseVersionName.invoke(checker, "v3.0.0"))
        assertEquals("3.0.0", parseVersionName.invoke(checker, "V3.0.0"))
        assertEquals("3.0.0", parseVersionName.invoke(checker, "3.0.0"))
        assertEquals("v3.0.0", parseVersionName.invoke(checker, " v3.0.0 "))
    }

    private fun createCheckerForReflection(): UpdateChecker {
        val mockContext = org.mockito.kotlin.mock<android.content.Context>()
        val client = okhttp3.OkHttpClient.Builder().build()
        val gson = com.google.gson.Gson()
        return UpdateChecker(mockContext, client, gson)
    }

    @Test
    fun `版本码大小关系正确`() {
        val checker = createCheckerForReflection()
        val computeVersionCode = UpdateChecker::class.java
            .getDeclaredMethod("computeVersionCode", String::class.java)
            .apply { isAccessible = true }

        val v300 = computeVersionCode.invoke(checker, "3.0.0") as Int
        val v301 = computeVersionCode.invoke(checker, "3.0.1") as Int
        val v310 = computeVersionCode.invoke(checker, "3.1.0") as Int
        val v299 = computeVersionCode.invoke(checker, "2.9.9") as Int

        assertTrue("3.1.0 应大于 3.0.0", v310 > v300)
        assertTrue("3.0.1 应大于 3.0.0", v301 > v300)
        assertEquals("3.0.0 应等于自身", v300, computeVersionCode.invoke(checker, "3.0.0"))
        assertTrue("2.9.9 应小于 3.0.0", v299 < v300)
        assertNotEquals("3.0.0 与 3.0.1 应不相等", v300, v301)
    }
}
