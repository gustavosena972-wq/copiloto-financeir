package br.com.copiloto.financeiro

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import org.json.JSONObject

internal object VoiceInputPolicy {
    fun validRequest(id: String) = id.matches(Regex("[A-Za-z0-9_-]{1,80}"))
    fun draft(text: String?) = text.orEmpty().trim().take(4000)
}

/** User-initiated system dictation. No microphone runs in the background. */
internal class VoiceInput(private val activity: Activity, private val report: (String, JSONObject) -> Unit) {
    private val requestCode = 8420
    private var pending: String? = null

    fun start(id: String, language: String) {
        if (!VoiceInputPolicy.validRequest(id)) return
        if (pending != null) { result(id, "busy"); return }
        pending = id
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Dite sua mensagem para o Tamanduá")
        }
        try { activity.startActivityForResult(intent, requestCode) }
        catch (_: Exception) { pending = null; result(id, "unavailable") }
    }

    fun handleResult(code: Int, status: Int, data: Intent?): Boolean {
        if (code != requestCode) return false
        val id = pending ?: return true
        pending = null
        if (status != Activity.RESULT_OK) { result(id, "cancelled"); return true }
        val text = VoiceInputPolicy.draft(data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull())
        result(id, if (text.isBlank()) "empty" else "recognized", text)
        return true
    }

    private fun result(id: String, status: String, text: String = "") {
        report("copiloto:voice-input", JSONObject().put("requestId", id).put("status", status).put("text", text))
    }

    fun close() { pending = null }
}
