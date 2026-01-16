package com.nooralsalah.family

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log

/**
 * AlarmReceiver
 * 
 * This BroadcastReceiver is triggered when a prayer alarm fires.
 * It wakes up the device and launches the MainActivity with alarm data,
 * which will then navigate to the /alarm page.
 */
class AlarmReceiver : BroadcastReceiver() {



    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Alarm received!")

        val prayerId = intent.getStringExtra(EXTRA_PRAYER_ID) ?: "fajr"
        val prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME) ?: "صلاة"
        val sound = intent.getStringExtra(EXTRA_SOUND) ?: "adhan"

        Log.d(TAG, "Prayer: $prayerId, Sound: $sound")

        // Wake up the device
        wakeUpDevice(context)

        // START PLAYING SOUND IMMEDIATELY (Native)
        // This ensures sound plays even if app UI takes time to load or screen is locked
        playAlarmSound(context, sound, isPreview = false)

        // Launch MainActivity with alarm intent
        val launchIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_IS_ALARM, true)
            putExtra(EXTRA_PRAYER_ID, prayerId)
            putExtra(EXTRA_PRAYER_NAME, prayerName)
            putExtra(EXTRA_SOUND, sound)
        }

        context.startActivity(launchIntent)
        Log.d(TAG, "Launched MainActivity with alarm data")
    }


    companion object {
        private const val TAG = "AlarmReceiver"
        const val EXTRA_PRAYER_ID = "prayer_id"
        const val EXTRA_PRAYER_NAME = "prayer_name"
        const val EXTRA_SOUND = "sound"
        const val EXTRA_IS_ALARM = "is_alarm"
        
        // Global MediaPlayer to control it from anywhere (e.g. stop it from UI)
        var mediaPlayer: android.media.MediaPlayer? = null

        fun playAlarmSound(context: Context, soundName: String, isPreview: Boolean = false) {
            try {
                // Stop any existing sound first
                stopAlarmSound()

                val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
                
                // For preview, we don't force max volume and use STREAM_MUSIC
                val streamType = if (isPreview) android.media.AudioManager.STREAM_MUSIC else android.media.AudioManager.STREAM_ALARM
                
                if (!isPreview) {
                    // Request Max Volume for Alarm Stream
                    val maxVolume = audioManager.getStreamMaxVolume(streamType)
                    audioManager.setStreamVolume(streamType, maxVolume, 0)
                }

                val uri = if (soundName.isNotEmpty() && (soundName.startsWith("content://") || soundName.startsWith("file://"))) {
                    android.net.Uri.parse(soundName)
                } else {
                    android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI
                }

                mediaPlayer = android.media.MediaPlayer().apply {
                    setDataSource(context, uri)
                    setAudioStreamType(streamType)
                    isLooping = !isPreview // Loop for real alarms, play once for preview
                    prepare()
                    start()
                }
                
                Log.d(TAG, "🎵 Started playing sound: $soundName on stream $streamType (preview=$isPreview)")
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to play sound", e)
            }
        }
        
        fun stopAlarmSound() {
            try {
                mediaPlayer?.stop()
                mediaPlayer?.release()
                mediaPlayer = null
                Log.d(TAG, "🛑 Stopped alarm sound")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop alarm", e)
            }
        }
    }

    /**
     * Wake up the device screen
     */
    private fun wakeUpDevice(context: Context) {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        
        @Suppress("DEPRECATION")
        val wakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or
            PowerManager.ACQUIRE_CAUSES_WAKEUP or
            PowerManager.ON_AFTER_RELEASE,
            "NoorAlsalah:AlarmWakeLock"
        )
        
        wakeLock.acquire(10 * 1000L) // 10 seconds
        Log.d(TAG, "WakeLock acquired to wake device")
    }
}
