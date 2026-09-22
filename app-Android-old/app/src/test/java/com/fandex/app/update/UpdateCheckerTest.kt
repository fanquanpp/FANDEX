package com.fandex.app.update

import android.content.Context
import com.google.gson.Gson
import kotlinx.coroutines.test.runTest
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.mock

class UpdateCheckerTest {

    private lateinit var mockWebServer: MockWebServer

    private val mockContext: Context = mock()

    private val gson = Gson()

    @Before
    fun setUp() {
        mockWebServer = MockWebServer()
        mockWebServer.start()
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    private fun createChecker(): UpdateChecker {
        val serverUrl = mockWebServer.url("/")

        val redirectInterceptor = Interceptor { chain ->
            val originalRequest = chain.request()
            val originalUrl = originalRequest.url
            val newUrl = originalUrl.newBuilder()
                .scheme(serverUrl.scheme)
                .host(serverUrl.host)
                .port(serverUrl.port)
                .build()
            val newRequest = originalRequest.newBuilder()
                .url(newUrl)
                .build()
            chain.proceed(newRequest)
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(redirectInterceptor)
            .build()

        return UpdateChecker(mockContext, client, gson)
    }

    private fun buildReleaseJson(
        tagName: String = "v3.1.0",
        apkFileName: String = "FANDEX-v3.1.0.apk"
    ): String {
        return """
        {
          "tag_name": "$tagName",
          "name": "FANDEX $tagName",
          "body": "## 新功能\n- 测试更新",
          "published_at": "2026-07-19T10:00:00Z",
          "html_url": "https://github.com/fanquanpp/FANDEX-App/releases/tag/$tagName",
          "assets": [
            {
              "name": "$apkFileName",
              "size": 10485760,
              "browser_download_url": "https://objects.githubusercontent.com/$apkFileName",
              "content_type": "application/vnd.android.package-archive"
            }
          ]
        }
        """.trimIndent()
    }

    @Test
    fun `checkLatestRelease 正常响应返回 UpdateInfo`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(buildReleaseJson("v3.1.0"))
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue("正常响应应返回 success", result.isSuccess)
        val info = result.getOrThrow()
        assertEquals("3.1.0", info.latestVersion)
        assertEquals("https://objects.githubusercontent.com/FANDEX-v3.1.0.apk", info.downloadUrl)
        assertEquals(10485760L, info.downloadSize)
        assertTrue("releaseNotes 应包含 '新功能'", info.releaseNotes.contains("新功能"))
        assertEquals("2026-07-19T10:00:00Z", info.publishedAt)
        assertEquals(30100, info.latestVersionCode)
    }

    @Test
    fun `checkLatestRelease HTTP 404 返回 failure`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(404)
                .setBody("Not Found")
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue("HTTP 404 应返回 failure", result.isFailure)
        val exception = result.exceptionOrNull()
        assertNotNull(exception)
        assertTrue("异常消息应包含 HTTP 404", exception!!.message!!.contains("HTTP 404"))
    }

    @Test
    fun `checkLatestRelease JSON 格式错误返回 failure`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody("""{ "tag_name": "broken", "assets": [ }""")
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue("JSON 格式错误应返回 failure", result.isFailure)
        val exception = result.exceptionOrNull()
        assertNotNull(exception)
        assertTrue(
            "异常消息应提示响应格式异常",
            exception!!.message!!.contains("响应格式异常")
        )
    }

    @Test
    fun `checkLatestRelease 响应体为空返回 failure`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody("")
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue("空响应应返回 failure", result.isFailure)
        val exception = result.exceptionOrNull()
        assertNotNull(exception)
        assertEquals("服务器响应为空", exception!!.message)
    }

    @Test
    fun `checkLatestRelease 无 APK 文件返回 failure`() = runTest {
        val json = """
        {
          "tag_name": "v3.1.0",
          "name": "FANDEX v3.1.0",
          "body": "test",
          "published_at": "2026-07-19T10:00:00Z",
          "html_url": "https://github.com/fanquanpp/FANDEX-App/releases/tag/v3.1.0",
          "assets": [
            {
              "name": "README.txt",
              "size": 100,
              "browser_download_url": "https://example.com/README.txt",
              "content_type": "text/plain"
            }
          ]
        }
        """.trimIndent()

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(json)
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue("无 APK 应返回 failure", result.isFailure)
        val exception = result.exceptionOrNull()
        assertNotNull(exception)
        assertTrue(
            "异常消息应包含 '未找到可下载的 APK 文件'",
            exception!!.message!!.contains("未找到可下载的 APK 文件")
        )
    }

    @Test
    fun `checkLatestRelease 返回旧版本时 isUpdateAvailable 为 false`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(buildReleaseJson(tagName = "v2.5.0", apkFileName = "FANDEX-v2.5.0.apk"))
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue(result.isSuccess)
        val info = result.getOrThrow()
        assertEquals("2.5.0", info.latestVersion)
        assertFalse("旧版本不应触发更新提示", info.isUpdateAvailable)
    }

    @Test
    fun `checkLatestRelease 返回新版本时 isUpdateAvailable 为 true`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    buildReleaseJson(
                        tagName = "v99.99.99",
                        apkFileName = "FANDEX-v99.99.99.apk"
                    )
                )
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue(result.isSuccess)
        val info = result.getOrThrow()
        assertEquals("99.99.99", info.latestVersion)
        assertTrue("新版本应触发更新提示", info.isUpdateAvailable)
    }

    @Test
    fun `checkLatestRelease 无 v 前缀的 tagName 也能正确解析`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(buildReleaseJson(tagName = "99.99.99", apkFileName = "FANDEX-v99.99.99.apk"))
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue(result.isSuccess)
        val info = result.getOrThrow()
        assertEquals("99.99.99", info.latestVersion)
        assertTrue(info.isUpdateAvailable)
    }

    @Test
    fun `checkLatestRelease 网络异常返回 failure`() = runTest {
        mockWebServer.shutdown()

        val serverUrl = mockWebServer.url("/")
        val redirectInterceptor = Interceptor { chain ->
            val originalRequest = chain.request()
            val newUrl = originalRequest.url.newBuilder()
                .host(serverUrl.host)
                .port(serverUrl.port)
                .scheme(serverUrl.scheme)
                .build()
            val newRequest = originalRequest.newBuilder().url(newUrl).build()
            chain.proceed(newRequest)
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(redirectInterceptor)
            .connectTimeout(1, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(1, java.util.concurrent.TimeUnit.SECONDS)
            .build()

        val checker = UpdateChecker(mockContext, client, gson)
        val result = checker.checkLatestRelease()

        assertTrue("网络异常应返回 failure", result.isFailure)
        val exception = result.exceptionOrNull()
        assertNotNull(exception)
        assertNotNull(exception!!.message)
    }
}
