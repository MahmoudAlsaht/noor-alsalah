package com.nooralsalah.family

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * AlarmSchedulerPlugin
 * 
 * A Capacitor plugin that schedules alarms using Android's AlarmManager.
 * These alarms will wake the device and open the alarm screen, even when
 * the app is closed or the device is locked.
 */
@CapacitorPlugin(name = "AlarmScheduler")
class AlarmSchedulerPlugin : Plugin() {

    companion object {
        private const val TAG = "AlarmScheduler"
        // Mailbox for alarm data
        var activeAlarmData: JSObject? = null
    }

    /**
     * Schedule an alarm at a specific time
     * 
     * @param id Unique alarm ID
     * @param triggerTime Unix timestamp in milliseconds
     * @param prayerId Prayer identifier (fajr, dhuhr, etc.)
     * @param prayerName Prayer name in Arabic
     * @param sound Sound to play (adhan, gentle, alert)
     */
    @PluginMethod
    fun scheduleAlarm(call: PluginCall) {
        val id = call.getInt("id") ?: run {
            Log.e(TAG, "Missing 'id' parameter")
            call.reject("Missing 'id' parameter")
            return
        }
        
        // Get triggerTime - handle both Long and Double from JavaScript
        val triggerTimeRaw = call.data.opt("triggerTime")
        val triggerTime: Long = when (triggerTimeRaw) {
            is Long -> triggerTimeRaw
            is Double -> triggerTimeRaw.toLong()
            is Int -> triggerTimeRaw.toLong()
            is Number -> triggerTimeRaw.toLong()
            else -> {
                Log.e(TAG, "Missing or invalid 'triggerTime' parameter: $triggerTimeRaw")
                call.reject("Missing 'triggerTime' parameter")
                return
            }
        }
        
        val prayerId = call.getString("prayerId") ?: "fajr"
        val prayerName = call.getString("prayerName") ?: "صلاة"
        val sound = call.getString("sound") ?: "adhan"

        val now = System.currentTimeMillis()
        val delayMs = triggerTime - now
        
        Log.d(TAG, "=== SCHEDULING ALARM ===")
        Log.d(TAG, "ID: $id")
        Log.d(TAG, "Trigger time: $triggerTime")
        Log.d(TAG, "Current time: $now")
        Log.d(TAG, "Delay: ${delayMs}ms (${delayMs/1000} seconds)")
        Log.d(TAG, "Prayer: $prayerId, Sound: $sound")

        if (delayMs <= 0) {
            Log.e(TAG, "Trigger time is in the past!")
            call.reject("Trigger time must be in the future")
            return
        }

        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = createAlarmIntent(id, prayerId, prayerName, sound)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                id,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Use setAlarmClock for high priority alarm that shows on lock screen
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val alarmInfo = AlarmManager.AlarmClockInfo(triggerTime, pendingIntent)
                alarmManager.setAlarmClock(alarmInfo, pendingIntent)
                Log.d(TAG, "✅ Alarm scheduled with setAlarmClock")
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                Log.d(TAG, "✅ Alarm scheduled with setExact")
            }

            // Toast removed for production to avoid spamming user on re-schedules
            
            val ret = JSObject()
            ret.put("success", true)
            ret.put("id", id)
            ret.put("triggerTime", triggerTime)
            ret.put("delaySeconds", delayMs / 1000)
            call.resolve(ret)

        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to schedule alarm", e)
            call.reject("Failed to schedule alarm: ${e.message}")
        }
    }

    /**
     * Cancel a scheduled alarm
     */
    @PluginMethod
    fun cancelAlarm(call: PluginCall) {
        val id = call.getInt("id") ?: run {
            call.reject("Missing 'id' parameter")
            return
        }

        Log.d(TAG, "Cancelling alarm: id=$id")

        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = createAlarmIntent(id, "", "", "")
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                id,
                intent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )

            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
                Log.d(TAG, "Alarm cancelled: id=$id")
            }

            val ret = JSObject()
            ret.put("success", true)
            ret.put("id", id)
            call.resolve(ret)

        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel alarm", e)
            call.reject("Failed to cancel alarm: ${e.message}")
        }
    }

    /**
     * Cancel all scheduled alarms
     */
    @PluginMethod
    fun cancelAllAlarms(call: PluginCall) {
        Log.d(TAG, "Cancelling all alarms")
        
        // Note: AlarmManager doesn't provide a way to cancel "all" alarms.
        // We would need to track alarm IDs separately.
        // For now, we'll just acknowledge the request.
        
        val ret = JSObject()
        ret.put("success", true)
        call.resolve(ret)
    }

    /**
     * Force update the widget
     */
    @PluginMethod
    fun updateWidgets(call: PluginCall) {
        try {
            val context = context
            val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
            val componentName = android.content.ComponentName(context, PrayerWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            
            val intent = Intent(context, PrayerWidgetProvider::class.java).apply {
                action = android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
            }
            context.sendBroadcast(intent)
            
            call.resolve()
            Log.d(TAG, "Requested widget update for ${appWidgetIds.size} widgets")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update widget", e)
            call.reject("Failed to update widget: ${e.message}")
        }
    }

    /**
     * Check if the app was launched by an alarm
     */
    @PluginMethod
    fun checkLaunchData(call: PluginCall) {
        val data = activeAlarmData
        if (data != null) {
            Log.d(TAG, "Launch data found! returning to web: $data")
            call.resolve(data)
            // Clear after reading so we don't trigger it again on reload
            activeAlarmData = null
        } else {
            val ret = JSObject()
            ret.put("isAlarm", false)
            call.resolve(ret)
        }
    }

    /**
     * Stop the currently playing alarm sound
     */
    @PluginMethod
    fun stopAlarmSound(call: PluginCall) {
        AlarmReceiver.stopAlarmSound()
        call.resolve()
    }

    /**
     * Create an intent for the alarm
     */
    private fun createAlarmIntent(id: Int, prayerId: String, prayerName: String, sound: String): Intent {
        return Intent(context, AlarmReceiver::class.java).apply {
            action = "com.nooralsalah.family.ALARM_$id"
            putExtra(AlarmReceiver.EXTRA_PRAYER_ID, prayerId)
            putExtra(AlarmReceiver.EXTRA_PRAYER_NAME, prayerName)
            putExtra(AlarmReceiver.EXTRA_SOUND, sound)
            putExtra(AlarmReceiver.EXTRA_IS_ALARM, true)
        }
    }
}
