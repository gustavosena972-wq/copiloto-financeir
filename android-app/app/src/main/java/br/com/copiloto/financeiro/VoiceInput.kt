package br.com.copiloto.financeiro

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import org.json.JSONObject

internal object VoiceInputPolicy {
    fun validRequest(id: String) = id.matches(Regex("[A-Za-z0-9_-]{1,80}"))
    fun draft(text: String?) = text.orEmpty().trim().take(4000)
    fun errorStatus(code: Int) = when (code) {
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "permission_denied"
        SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "empty"
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "busy"
        SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "network"
        else -> "unavailable"
    }
}

/** One user-initiated dictation; permission is requested only on the face button. */
internal class VoiceInput(private val activity: Activity, private val report: (String, JSONObject) -> Unit) {
    private val permissionCode = 8421
    private var pending: String? = null
    private var language = "pt-BR"
    private var recognizer: SpeechRecognizer? = null
    private val timer = Handler(Looper.getMainLooper())
    private val timeout = Runnable { finish("empty") }

    fun start(id: String, locale: String) {
        if (!VoiceInputPolicy.validRequest(id)) return
        if (pending != null) { result(id, "busy"); return }
        pending = id
        language = locale
        if (activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            activity.requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), permissionCode)
        } else listen()
    }

    fun handlePermissionResult(code: Int): Boolean {
        if (code != permissionCode) return false
        if (pending == null) return true
        if (activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) listen()
        else finish("permission_denied")
        return true
    }

    private fun listen() {
        if (!SpeechRecognizer.isRecognitionAvailable(activity)) { finish("unavailable"); return }
        try {
            val engine = SpeechRecognizer.createSpeechRecognizer(activity)
            recognizer = engine
            engine.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) { pending?.let { result(it, "listening") } }
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}
                override fun onError(error: Int) { finish(VoiceInputPolicy.errorStatus(error)) }
                override fun onResults(results: Bundle?) {
                    val text = VoiceInputPolicy.draft(results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull())
                    finish(if (text.isBlank()) "empty" else "recognized", text)
                }
                override fun onPartialResults(partialResults: Bundle?) {}
                override fun onEvent(eventType: Int, params: Bundle?) {}
            })
            engine.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            })
            timer.postDelayed(timeout, 30_000)
        } catch (_: SecurityException) { finish("permission_denied") }
        catch (_: Exception) { finish("unavailable") }
    }

    private fun finish(status: String, text: String = "") {
        val id = pending ?: return
        pending = null
        timer.removeCallbacks(timeout)
        val engine = recognizer
        recognizer = null
        engine?.cancel()
        engine?.destroy()
        result(id, status, text)
    }

    private fun result(id: String, status: String, text: String = "") {
        report("copiloto:voice-input", JSONObject().put("requestId", id).put("status", status).put("text", text))
    }

    fun handleResult(code: Int, status: Int, data: Intent?): Boolean = false
    fun close() {
        pending = null
        timer.removeCallbacks(timeout)
        val engine = recognizer
        recognizer = null
        engine?.cancel()
        engine?.destroy()
    }
    fun cancel() { finish("cancelled") }
    fun pause() { if (recognizer != null) cancel() }
}
