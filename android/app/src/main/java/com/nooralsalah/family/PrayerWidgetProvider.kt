package com.nooralsalah.family

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * Implementation of App Widget functionality.
 */
class PrayerWidgetProvider : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        // Force update on any event
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = android.content.ComponentName(context, PrayerWidgetProvider::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {}
    override fun onDisabled(context: Context) {}
}

internal fun updateAppWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    val views = RemoteViews(context.packageName, R.layout.widget_layout)

    try {
        // 1. Get SharedPreferences
        // Capacitor uses "CapacitorStorage" by default for Preferences plugin
        val prefs: SharedPreferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)

        // 2. Read "WIDGET_DATA" string
        // The key is raw "WIDGET_DATA" because we didn't use a group in React
        val jsonString = prefs.getString("WIDGET_DATA", null)

        if (jsonString != null) {
            // 3. Parse JSON
            val data = JSONObject(jsonString)
            val prayerName = data.optString("nextPrayerName", "--")
            val prayerTime = data.optString("nextPrayerTime", "--:--")
            val city = data.optString("city", "إربد")
            val date = data.optString("date", "")

            // 4. Update Views
            views.setTextViewText(R.id.widget_prayer_name, prayerName)
            views.setTextViewText(R.id.widget_prayer_time, prayerTime)
            views.setTextViewText(R.id.widget_city, city)
            views.setTextViewText(R.id.widget_date, date)
            views.setTextViewText(R.id.widget_next_label, "الصلاة القادمة")

        } else {
            // Fallback if no data yet (e.g. app never opened)
            views.setTextViewText(R.id.widget_prayer_name, "افتح التطبيق")
            views.setTextViewText(R.id.widget_prayer_time, "--:--")
            views.setTextViewText(R.id.widget_next_label, "نور الصلاة")
        }

    } catch (e: Exception) {
        // Error handling
        e.printStackTrace()
        views.setTextViewText(R.id.widget_next_label, "خطأ في التحديث")
    }

    // Intent to open app when clicked
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
    if (intent != null) {
        val pendingIntent = android.app.PendingIntent.getActivity(
            context,
            0,
            intent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
    }

    appWidgetManager.updateAppWidget(appWidgetId, views)
}
