package com.nooralsalah.family

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    
    companion object {
        private const val TAG = "MainActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Register custom plugins before calling super.onCreate
        registerPlugin(OverlayPermissionPlugin::class.java)
        registerPlugin(AlarmSchedulerPlugin::class.java)
        super.onCreate(savedInstanceState)
        
        // Keep screen on for alarm
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        // Check if launched from alarm
        handleAlarmIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Handle alarm when app is already running
        handleAlarmIntent(intent)
    }

    /**
     * Check if this intent is from an alarm and navigate to /alarm page
     */
    private fun handleAlarmIntent(intent: Intent?) {
        if (intent == null) return
        
        val isAlarm = intent.getBooleanExtra(AlarmReceiver.EXTRA_IS_ALARM, false)
        if (!isAlarm) return
        
        val prayerId = intent.getStringExtra(AlarmReceiver.EXTRA_PRAYER_ID) ?: "fajr"
        val sound = intent.getStringExtra(AlarmReceiver.EXTRA_SOUND) ?: ""
        
        Log.d(TAG, "Alarm intent received! Prayer: $prayerId, Sound: $sound")
        
        // Save alarm data to mailbox so the web app can pick it up
        val data = com.getcapacitor.JSObject()
        data.put("isAlarm", true)
        data.put("prayerId", prayerId)
        data.put("sound", sound)
        
        AlarmSchedulerPlugin.activeAlarmData = data
        Log.d(TAG, "Saved alarm data to mailbox")
        
        // Clear the alarm flag to prevent re-triggering
        intent.removeExtra(AlarmReceiver.EXTRA_IS_ALARM)
    }
}
