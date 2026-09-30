package expo.modules.notificationlistener

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationListenerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NotificationListener")

    // Same check NotificationManagerCompat.getEnabledListenerPackages does, without pulling in androidx.core.
    Function("isPermissionGranted") {
      val context = appContext.reactContext ?: return@Function false
      val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        ?: return@Function false
      enabled.split(':').any { ComponentName.unflattenFromString(it)?.packageName == context.packageName }
    }

    // Returns "sent" | "gone" (notification dismissed) | "no_reply_action" | "not_connected".
    AsyncFunction("reply") { key: String, text: String ->
      PulseNotificationListenerService.instance?.reply(key, text) ?: "not_connected"
    }

    Function("openPermissionSettings") {
      appContext.reactContext?.startActivity(
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }
  }
}
