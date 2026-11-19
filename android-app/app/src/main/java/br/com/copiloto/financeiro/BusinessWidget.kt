package br.com.copiloto.financeiro

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class BusinessWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val views = RemoteViews(context.packageName, R.layout.business_widget)
        for ((button, command) in listOf(R.id.widget_income to "SERVICES", R.id.widget_expense to "EXPENSE")) {
            val intent = Intent(context, MainActivity::class.java).setAction("br.com.copiloto.financeiro." + command)
            views.setOnClickPendingIntent(button, PendingIntent.getActivity(context, button, intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
        }
        manager.updateAppWidget(ids, views)
    }
}
