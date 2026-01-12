package com.nooralsalah.family

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import org.json.JSONObject

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

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.prayer_widget)

            try {
                // Read from Capacitor Preferences
                // The file name internally used by Capacitor Preferences is "CapacitorStorage"
                val sharedPrefs: SharedPreferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
                
                // Capacitor prefixes keys with "_cap_"
                val jsonString = sharedPrefs.getString("_cap_widget_prayer_data", null)

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

                    // Update Next Prayer
                    views.setTextViewText(R.id.widget_next_prayer_name, data.optString("nextName", "نور الصلاة"))
                    views.setTextViewText(R.id.widget_next_prayer_time, data.optString("nextTime", ""))

                } else {
                     views.setTextViewText(R.id.widget_date, "افتح التطبيق")
                     views.setTextViewText(R.id.widget_next_prayer_name, "مزامنة البيانات...")
                     views.setTextViewText(R.id.widget_next_prayer_time, "--:--")
                }

            } catch (e: Exception) {
                e.printStackTrace()
                views.setTextViewText(R.id.widget_date, "Error")
            }

            // Instruct the widget manager to update the widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
