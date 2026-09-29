package expo.modules.notificationlistener

import android.app.Notification
import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.facebook.react.HeadlessJsTaskService

class PulseNotificationListenerService : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (sbn.packageName == packageName) return
    val notification = sbn.notification
    val extras = notification.extras
    // Title/text only travel to the JS task, which filters and redacts before anything is stored.
    val data = Bundle().apply {
      putString("packageName", sbn.packageName)
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

  companion object {
    private const val TAG = "PulseListener"
  }
}
