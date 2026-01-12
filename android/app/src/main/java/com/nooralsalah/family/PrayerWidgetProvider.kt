package com.nooralsalah.family

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PrayerWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // There may be multiple widgets active, so update all of them
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        // Construct the RemoteViews object
        val views = RemoteViews(context.packageName, R.layout.prayer_widget)

        try {
            // Read from Capacitor Preferences
            // File name is "CapacitorStorage"
            val sharedPrefs: SharedPreferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val jsonString = sharedPrefs.getString("widget_prayer_data", null)

            if (jsonString != null) {
                val data = JSONObject(jsonString)
                
                // Update Date
                val dateStr = data.optString("date", "No Data")
                views.setTextViewText(R.id.widget_date, dateStr)

                // Update Times
                views.setTextViewText(R.id.time_fajr, data.optString("fajr", "--"))
                views.setTextViewText(R.id.time_dhuhr, data.optString("dhuhr", "--"))
                views.setTextViewText(R.id.time_asr, data.optString("asr", "--"))
                views.setTextViewText(R.id.time_maghrib, data.optString("maghrib", "--"))
                views.setTextViewText(R.id.time_isha, data.optString("isha", "--"))

                // Determine Next Prayer
                // This logic is simplified; for full accuracy we might need to parse times.
                // For now, we just show "Noor Al-Salah" or maybe pass "nextPrayer" from JS side?
                // JS side only passed times. Let's stick to showing times for now.
                // Or we can parse times here.
                
                // Let's just set a static title for now or "Next Prayer" logic if simple.
                // Ideally JS passes "nextPrayerName" and "nextPrayerTime".
                // I will update useWidgetSync to pass 'nextPrayer' and 'nextTime'.
                
                views.setTextViewText(R.id.widget_next_prayer_name, data.optString("nextName", "نور الصلاة"))
                views.setTextViewText(R.id.widget_next_prayer_time, data.optString("nextTime", ""))

            } else {
                 views.setTextViewText(R.id.widget_date, "افتح التطبيق")
            }

        } catch (e: Exception) {
            e.printStackTrace()
             views.setTextViewText(R.id.widget_date, "Error")
        }

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
