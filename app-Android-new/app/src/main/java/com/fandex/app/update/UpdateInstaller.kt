package com.fandex.app.update

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.content.FileProvider
import java.io.File

class UpdateInstaller(private val context: Context) {

    companion object {
        private const val TAG = "UpdateInstaller"
    }

    fun install(apkFile: File): Boolean {
        try {
            if (!apkFile.exists() || !apkFile.isFile) {
                return false
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val granted = context.checkSelfPermission(android.Manifest.permission.REQUEST_INSTALL_PACKAGES) ==
                    PackageManager.PERMISSION_GRANTED
                if (!granted) {
                    return false
                }
            }

            val authority = "${context.packageName}.fileprovider"
            val uri: Uri = FileProvider.getUriForFile(context, authority, apkFile)

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            if (intent.resolveActivity(context.packageManager) == null) {
                return false
            }

            context.startActivity(intent)
            return true
        } catch (e: Exception) {
            Log.e(TAG, "调起 APK 安装界面失败: ${e.message}", e)
            return false
        }
    }
}
