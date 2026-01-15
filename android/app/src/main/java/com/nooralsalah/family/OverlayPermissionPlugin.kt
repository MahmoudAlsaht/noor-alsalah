package com.nooralsalah.family

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * OverlayPermissionPlugin
 * 
 * A simple Capacitor plugin to check and request the "Display over other apps" permission.
 * This is needed for showing alarm screens when the device is locked.
 */
@CapacitorPlugin(name = "OverlayPermission")
class OverlayPermissionPlugin : Plugin() {

    /**
     * Check if the app can draw over other apps
     */
    @PluginMethod
    fun canDrawOverlays(call: PluginCall) {
        val canDraw = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true // Permission not needed below Android M
        }
        
        val ret = com.getcapacitor.JSObject()
        ret.put("value", canDraw)
        call.resolve(ret)
    }

    /**
     * Open the overlay permission settings page
     */
    @PluginMethod
    fun requestOverlayPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(context)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${context.packageName}")
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                
                val ret = com.getcapacitor.JSObject()
                ret.put("opened", true)
                call.resolve(ret)
            } else {
                val ret = com.getcapacitor.JSObject()
                ret.put("opened", false)
                ret.put("alreadyGranted", true)
                call.resolve(ret)
            }
        } else {
            val ret = com.getcapacitor.JSObject()
            ret.put("opened", false)
            ret.put("notNeeded", true)
            call.resolve(ret)
        }
    }
}
