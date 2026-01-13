package com.nooralsalah.family

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * Implementation of App Widget functionality.
 */
class PrayerWidgetProvider : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
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

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        updateAppWidget(context, appWidgetManager, appWidgetId)
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
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
        val prefs: SharedPreferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)

        // 2. Read "WIDGET_DATA" string
        val jsonString = prefs.getString("WIDGET_DATA", null)

        if (jsonString != null) {
            val data = JSONObject(jsonString)
            val prayerName = data.optString("nextPrayerName", "--")
            val prayerTime = data.optString("nextPrayerTime", "--:--")
            val city = data.optString("city", "إربد")
            val date = data.optString("date", "")
            // Timestamp is in milliseconds
            val nextPrayerTimestamp = data.optLong("nextPrayerTimestamp", 0L)

            // 3. Update Text Views
            views.setTextViewText(R.id.widget_prayer_name, prayerName)
            views.setTextViewText(R.id.widget_prayer_time, prayerTime)
            views.setTextViewText(R.id.widget_city, city)
            views.setTextViewText(R.id.widget_date, date)
            views.setTextViewText(R.id.widget_next_label, "الصلاة القادمة")

            // 4. Handle Chronometer (Countdown)
            if (nextPrayerTimestamp > 0) {
                // Determine visibility based on widget size
                val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
                val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
                val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)

                // Show countdown if height > 100dp OR if it's a large width widget (e.g. tablet/desktop)
                // Adjust these thresholds as needed. Standard 4x1 is ~50-70dp height. 4x2 is ~150dp.
                // So if user resizes vertically, show countdown.
                val shouldShowCountdown = minHeight > 100

                if (shouldShowCountdown) {
                    views.setViewVisibility(R.id.widget_countdown, View.VISIBLE)
                    views.setChronometer(R.id.widget_countdown, SystemClock.elapsedRealtime() + (nextPrayerTimestamp - System.currentTimeMillis()), null, true)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        views.setChronometerCountDown(R.id.widget_countdown, true)
                    }
                } else {
                    views.setViewVisibility(R.id.widget_countdown, View.GONE)
                }
            } else {
                views.setViewVisibility(R.id.widget_countdown, View.GONE)
            }

        } else {
            views.setTextViewText(R.id.widget_prayer_name, "افتح التطبيق")
            views.setTextViewText(R.id.widget_prayer_time, "--:--")
            views.setTextViewText(R.id.widget_next_label, "نور الصلاة")
            views.setViewVisibility(R.id.widget_countdown, View.GONE)
        }

    } catch (e: Exception) {
        e.printStackTrace()
        views.setTextViewText(R.id.widget_next_label, "خطأ")
    }

    // Intent to open app
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
