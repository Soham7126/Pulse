package expo.modules.notificationlistener

import android.app.Notification
import android.app.PendingIntent
import android.app.RemoteInput
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.facebook.react.HeadlessJsTaskService

class PulseNotificationListenerService : NotificationListenerService() {
  override fun onListenerConnected() {
    instance = this
  }

  override fun onListenerDisconnected() {
    instance = null
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (sbn.packageName == packageName) return
    val notification = sbn.notification
    val extras = notification.extras
    // Title/text only travel to the JS task, which filters and redacts before anything is stored.
    val data = Bundle().apply {
      putString("packageName", sbn.packageName)
      putString("appLabel", appLabel(sbn.packageName))
      putString("key", sbn.key)
      putDouble("postTime", sbn.postTime.toDouble())
      putInt("flags", notification.flags)
      putString("category", notification.category)
      putString("title", extras.getCharSequence(Notification.EXTRA_TITLE)?.toString())
      putString("text", extras.getCharSequence(Notification.EXTRA_TEXT)?.toString())
    }
    try {
      startService(Intent(this, PulseHeadlessTaskService::class.java).putExtras(data))
      HeadlessJsTaskService.acquireWakeLockNow(this)
    } catch (e: IllegalStateException) {
      // Background-start restriction. Log the package only, never content.
      Log.w(TAG, "headless start blocked for ${sbn.packageName}: ${e.javaClass.simpleName}")
    }
  }

  // Android 11+ package visibility can hide some apps; fall back to the package name in JS.
  private fun appLabel(pkg: String): String? =
    try {
      packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
    } catch (e: PackageManager.NameNotFoundException) {
      null
    }

  /**
   * Replies through the notification's own inline-reply action (what the shade's "Reply" does).
   * Only works while the source app's notification is still showing.
   */
  fun reply(key: String, text: String): String {
    val sbn = activeNotifications?.firstOrNull { it.key == key } ?: return "gone"
    val action = sbn.notification.actions?.firstOrNull { a -> a.remoteInputs?.any { it.allowFreeFormInput } == true }
      ?: return "no_reply_action"
    val results = Bundle().apply { action.remoteInputs.forEach { putCharSequence(it.resultKey, text) } }
    val intent = Intent().addFlags(Intent.FLAG_RECEIVER_FOREGROUND)
    RemoteInput.addResultsToIntent(action.remoteInputs, intent, results)
    return try {
      action.actionIntent.send(this, 0, intent)
      Log.i(TAG, "reply sent for ${sbn.packageName}")
      "sent"
    } catch (e: PendingIntent.CanceledException) {
      "gone"
    }
  }

  companion object {
    private const val TAG = "PulseListener"

    // Set while the system has the listener bound; used by the module to reach active notifications.
    @Volatile
    var instance: PulseNotificationListenerService? = null
  }
}
