package br.com.copiloto.financeiro

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.webkit.WebView
import androidx.core.app.NotificationCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

internal object ReminderPolicy {
    const val WINDOW = 8 * 24 * 60 * 60 * 1000L
    fun scope(raw: String): String? = raw.takeIf { it.length in 3..300 }?.let {
        MessageDigest.getInstance("SHA-256").digest(it.toByteArray(Charsets.UTF_8)).joinToString("") { byte -> "%02x".format(byte) }
    }
    fun nineOClock(day: String): Long? {
        if (!day.matches(Regex("[0-9]{4}-[0-9]{2}-[0-9]{2}"))) return null
        return runCatching { SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.ROOT).apply {
            isLenient = false; timeZone = TimeZone.getTimeZone("America/Sao_Paulo")
        }.parse("$day 09:00")?.time }.getOrNull()
    }
    fun canDeliver(active: String?, requested: String?, enabled: Boolean, now: Long, at: Long, expires: Long) =
        enabled && !active.isNullOrBlank() && active == requested && now >= at && now <= expires && expires - at in 0..WINDOW
}

internal object ReminderStore {
    val lock = Any()
    const val CHANNEL = "tamandua_private_checkin"
    const val ID = 5452
    fun prefs(context: Context) = context.getSharedPreferences("tamandua_reminders", Context.MODE_PRIVATE)
    fun permitted(context: Context) = Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    fun manager(context: Context) = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    fun channel(context: Context) {
        if (Build.VERSION.SDK_INT >= 26) manager(context).createNotificationChannel(
            NotificationChannel(CHANNEL, "Lembretes do Tamanduá", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Check-ins privados sobre compromissos já registrados"
                lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
            })
    }
    fun cancel(context: Context) { WorkManager.getInstance(context).cancelAllWorkByTag(CHANNEL); manager(context).cancel(ID) }
}

/** Caches dates and an account/family hash only; no values, descriptions or auth tokens. */
internal class TamanduaAlerts(private val activity: Activity, private val webView: WebView, private val report: (String, JSONObject) -> Unit) {
    private val permissionCode = 8422
    private var pendingId: String? = null
    private var pendingScope: String? = null
    fun register() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return
        WebViewCompat.addWebMessageListener(webView, "CopilotoAlerts", setOf("https://appassets.androidplatform.net")) { _, message, origin, mainFrame, _ ->
            if (!mainFrame || origin.toString() != "https://appassets.androidplatform.net" || !isTrustedAppAssetUrl(webView.url.orEmpty())) return@addWebMessageListener
            val raw = message.data ?: return@addWebMessageListener
            if (raw.length > 8192) return@addWebMessageListener
            val body = runCatching { JSONObject(raw) }.getOrNull() ?: return@addWebMessageListener
            when (body.optString("action")) {
                "clear" -> synchronized(ReminderStore.lock) {
                    ReminderStore.prefs(activity).edit().clear().commit(); ReminderStore.cancel(activity)
                }
                "sync" -> synchronize(body)
                "permission" -> requestPermission(body)
            }
        }
    }
    private fun synchronize(body: JSONObject) = synchronized(ReminderStore.lock) {
        val scope = ReminderPolicy.scope(body.optString("scope")) ?: return@synchronized
        val prefs = ReminderStore.prefs(activity)
        val enabled = body.optBoolean("enabled", false) && ReminderStore.permitted(activity)
        val now = System.currentTimeMillis()
        val days = body.optJSONArray("days")
        val plan = (0 until minOf(days?.length() ?: 0, 7)).mapNotNull { i -> ReminderPolicy.nineOClock(days?.optString(i).orEmpty()) }
            .filter { it > now && it - now <= 7 * 86400000L }.distinct().sorted()
        val signature = scope + ":" + enabled + ":" + plan.joinToString(",")
        if (prefs.getString("signature", null) == signature) return@synchronized
        val oldScope = prefs.getString("scope", null)
        val editor = prefs.edit().putString("scope", scope).putBoolean("enabled", enabled).putString("signature", signature)
        if (oldScope != scope) editor.remove("ack")
        editor.commit(); ReminderStore.cancel(activity)
        if (!enabled) return@synchronized
        ReminderStore.channel(activity)
        for (at in plan) {
            val token = "$scope:$at"
            val data = Data.Builder().putString("scope", scope).putString("token", token).putLong("at", at).putLong("expires", minOf(now + ReminderPolicy.WINDOW, at + 86400000L)).build()
            val work = OneTimeWorkRequestBuilder<TamanduaReminderWorker>().setInputData(data).addTag(ReminderStore.CHANNEL)
                .setInitialDelay(at - now, TimeUnit.MILLISECONDS).build()
            WorkManager.getInstance(activity).enqueueUniqueWork("tamandua-$token", ExistingWorkPolicy.REPLACE, work)
        }
    }
    private fun requestPermission(body: JSONObject) {
        val id = body.optString("id"); val scope = ReminderPolicy.scope(body.optString("scope"))
        if (!id.matches(Regex("[A-Za-z0-9_-]{1,80}")) || scope != ReminderStore.prefs(activity).getString("scope", null)) return
        if (ReminderStore.permitted(activity)) { reportPermission(id, true); return }
        if (pendingId != null) { reportPermission(id, false); return }
        pendingId = id; pendingScope = scope
        if (Build.VERSION.SDK_INT >= 33) activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), permissionCode)
        else reportPermission(id, true)
    }
    fun handlePermissionResult(code: Int): Boolean {
        if (code != permissionCode) return false
        val id = pendingId; val scope = pendingScope; pendingId = null; pendingScope = null
        if (id != null) reportPermission(id, scope == ReminderStore.prefs(activity).getString("scope", null) && ReminderStore.permitted(activity))
        return true
    }
    private fun reportPermission(id: String, granted: Boolean) = report("copiloto:alerts-permission", JSONObject().put("id", id).put("granted", granted))
}

class TamanduaReminderWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result = synchronized(ReminderStore.lock) {
        val prefs = ReminderStore.prefs(applicationContext)
        val scope = inputData.getString("scope"); val token = inputData.getString("token")
        if (!ReminderPolicy.canDeliver(prefs.getString("scope", null), scope, prefs.getBoolean("enabled", false), System.currentTimeMillis(), inputData.getLong("at", 0), inputData.getLong("expires", 0))
            || !ReminderStore.permitted(applicationContext) || prefs.getString("ack", null) == token) return@synchronized Result.success()
        ReminderStore.channel(applicationContext)
        val open = PendingIntent.getActivity(applicationContext, 5452, Intent(applicationContext, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val ack = PendingIntent.getBroadcast(applicationContext, 5453, Intent(applicationContext, TamanduaReminderAck::class.java).putExtra("scope", scope).putExtra("token", token), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notification = NotificationCompat.Builder(applicationContext, ReminderStore.CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Seu Tamanduá tem um lembrete").setContentText("Abra o Copiloto para conferir seus compromissos registrados.")
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH).addAction(0, "OK", ack).build()
        runCatching { ReminderStore.manager(applicationContext).notify(ReminderStore.ID, notification) }
        Result.success()
    }
}

class TamanduaReminderAck : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = synchronized(ReminderStore.lock) {
        val prefs = ReminderStore.prefs(context)
        if (intent.getStringExtra("scope") == prefs.getString("scope", null)) {
            prefs.edit().putString("ack", intent.getStringExtra("token")).commit()
            ReminderStore.manager(context).cancel(ReminderStore.ID)
        }
    }
}
