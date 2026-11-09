package br.com.copiloto.financeiro

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.util.Base64
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.Toast
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.util.concurrent.Executors

internal object SpreadsheetFilePolicy {
    const val MAX_BYTES = 8 * 1024 * 1024
    val mimeTypes = setOf(
        "text/csv", "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/json"
    )
    fun validExport(mime: String, bytes: Int, requestId: String) =
        mime in mimeTypes && bytes in 1..MAX_BYTES && requestId.matches(Regex("[A-Za-z0-9_-]{1,80}"))
    fun filename(name: String, mime: String): String {
        val extension = when (mime) {
            "text/csv" -> ".csv"
            "application/json" -> ".json"
            "application/vnd.ms-excel" -> ".xls"
            else -> ".xlsx"
        }
        val stem = name.substringBeforeLast('.', name).replace(Regex("[^A-Za-z0-9 _.-]"), "_")
            .trim(' ', '.').take(90).ifEmpty { "copiloto-financeiro" }
        return stem + extension
    }
    fun permitsResultScheme(scheme: String?) = scheme == "content"
}

/** Uses the system document picker; no broad storage permission or file:// access. */
internal class SpreadsheetFiles(private val activity: Activity, private val webView: WebView) {
    private data class Export(val id: String, val bytes: ByteArray)
    private var importCallback: ValueCallback<Array<Uri>>? = null
    private var export: Export? = null
    private val writer = Executors.newSingleThreadExecutor()
    private var writing = false
    @Volatile private var closed = false
    private val importRequest = 8401
    private val exportRequest = 8402

    val chromeClient = object : WebChromeClient() {
        override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
            if (!isTrustedAppAssetUrl(view.url.orEmpty())) return false
            importCallback?.onReceiveValue(null)
            importCallback = callback
            val picker = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
                putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("text/csv", "text/plain", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
            }
            try { activity.startActivityForResult(picker, importRequest) }
            catch (_: ActivityNotFoundException) {
                importCallback?.onReceiveValue(null); importCallback = null
                Toast.makeText(activity, "Não há um seletor de arquivos disponível.", Toast.LENGTH_LONG).show()
            }
            return true
        }
    }

    fun register() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return
        WebViewCompat.addWebMessageListener(webView, "CopilotoFiles", setOf("https://appassets.androidplatform.net")) { _, message, origin, mainFrame, _ ->
            if (!mainFrame || origin.toString() != "https://appassets.androidplatform.net" || !isTrustedAppAssetUrl(webView.url.orEmpty())) return@addWebMessageListener
            val raw = message.data ?: return@addWebMessageListener
            if (raw.length > 12_000_000) return@addWebMessageListener
            try {
                val body = JSONObject(raw)
                val id = body.optString("id")
                if (body.optString("action") != "export") return@addWebMessageListener
                if (export != null || writing) { notify(id, "busy"); return@addWebMessageListener }
                val mime = body.optString("mime")
                val bytes = Base64.decode(body.optString("data"), Base64.DEFAULT)
                if (!SpreadsheetFilePolicy.validExport(mime, bytes.size, id)) { notify(id, "error"); return@addWebMessageListener }
                val name = SpreadsheetFilePolicy.filename(body.optString("filename"), mime)
                export = Export(id, bytes)
                val picker = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE); type = mime
                    putExtra(Intent.EXTRA_TITLE, name)
                }
                activity.startActivityForResult(picker, exportRequest)
            } catch (_: Exception) {
                val pending = export; export = null
                if (pending != null) notify(pending.id, "error")
            }
        }
    }

    fun handleResult(requestCode: Int, resultCode: Int, data: Intent?): Boolean {
        if (requestCode == importRequest) {
            val callback = importCallback; importCallback = null
            val uri = data?.data?.takeIf { resultCode == Activity.RESULT_OK && SpreadsheetFilePolicy.permitsResultScheme(it.scheme) }
            if (isTrustedAppAssetUrl(webView.url.orEmpty())) callback?.onReceiveValue(uri?.let { arrayOf(it) })
            else callback?.onReceiveValue(null)
            return true
        }
        if (requestCode != exportRequest) return false
        val pending = export; export = null
        if (pending == null) return true
        val uri = data?.data?.takeIf { SpreadsheetFilePolicy.permitsResultScheme(it.scheme) }
        if (resultCode != Activity.RESULT_OK || uri == null) { notify(pending.id, "cancelled"); return true }
        writing = true
        writer.execute {
            val status = try {
                val stream = activity.contentResolver.openOutputStream(uri, "w") ?: error("No document output")
                stream.use { it.write(pending.bytes); it.flush() }
                "saved"
            } catch (_: Exception) { "error" }
            activity.runOnUiThread { writing = false; if (!closed) notify(pending.id, status) }
        }
        return true
    }

    private fun notify(id: String, status: String) {
        val detail = JSONObject().put("id", id).put("status", status).toString()
        webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('copiloto:file-export',{detail:$detail}));", null)
    }

    fun close() {
        closed = true; writer.shutdownNow()
        importCallback?.onReceiveValue(null); importCallback = null; export = null
    }
}
