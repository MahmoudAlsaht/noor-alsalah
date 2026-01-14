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
import org.json.JSONArray

/**
 * Smart Prayer Widget Provider
 * 
 * This widget is "smart" - it receives ALL prayer times from the app
 * and calculates the "next prayer" itself based on current system time.
 * This allows it to update correctly even when the app is not open.
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

/**
 * Find the next prayer from the prayers array based on current time
 */
private fun findNextPrayer(prayersArray: JSONArray, currentTime: Long): JSONObject? {
    for (i in 0 until prayersArray.length()) {
        val prayer = prayersArray.getJSONObject(i)
        val timestamp = prayer.optLong("timestamp", 0L)
        if (timestamp > currentTime) {
            return prayer
        }
    }
    // If no prayer found (after Isha), return null - widget will show "افتح التطبيق"
    return null
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
            val city = data.optString("city", "إربد")
            val date = data.optString("date", "")
            val currentTime = System.currentTimeMillis()

            // 3. Try to find next prayer from prayers array (smart mode)
            var prayerName: String = "--"
            var prayerTime: String = "--:--"
            var nextPrayerTimestamp: Long = 0L

            val prayersArray = data.optJSONArray("prayers")
            if (prayersArray != null && prayersArray.length() > 0) {
                // Smart mode: Calculate next prayer ourselves
                val nextPrayer = findNextPrayer(prayersArray, currentTime)
                if (nextPrayer != null) {
                    prayerName = nextPrayer.optString("name", "--")
                    prayerTime = nextPrayer.optString("time", "--:--")
                    nextPrayerTimestamp = nextPrayer.optLong("timestamp", 0L)
                } else {
                    // After Isha - show message to open app
                    prayerName = "افتح التطبيق"
                    prayerTime = "فجر الغد"
                }
            } else {
                // Fallback: Use legacy fields
                prayerName = data.optString("nextPrayerName", "--")
                prayerTime = data.optString("nextPrayerTime", "--:--")
                nextPrayerTimestamp = data.optLong("nextPrayerTimestamp", 0L)
            }

            // 4. Update Text Views
            views.setTextViewText(R.id.widget_prayer_name, prayerName)
            views.setTextViewText(R.id.widget_prayer_time, prayerTime)
            views.setTextViewText(R.id.widget_city, city)
            views.setTextViewText(R.id.widget_date, date)
            
            // Hijri Date - with fallback
            val hijriDate = data.optString("hijriDate", "")
            if (hijriDate.isNotEmpty()) {
                views.setTextViewText(R.id.widget_hijri_date, hijriDate)
            }
            
            views.setTextViewText(R.id.widget_next_label, "الصلاة القادمة")

            // 5. Handle Chronometer (Countdown)
            if (nextPrayerTimestamp > currentTime) {
                // Determine visibility based on widget size
                val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
                val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)

                // Show countdown if height > 100dp (larger widget)
                val shouldShowCountdown = minHeight > 100

                if (shouldShowCountdown) {
                    views.setViewVisibility(R.id.widget_countdown, View.VISIBLE)
                    val elapsedDiff = nextPrayerTimestamp - currentTime
                    views.setChronometer(
                        R.id.widget_countdown,
                        SystemClock.elapsedRealtime() + elapsedDiff,
                        null,
                        true
                    )
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        views.setChronometerCountDown(R.id.widget_countdown, true)
                    }
                } else {
                    views.setViewVisibility(R.id.widget_countdown, View.GONE)
                }
            } else {
                // Time passed or no valid timestamp - hide countdown
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
