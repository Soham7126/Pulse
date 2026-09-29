package expo.modules.notificationlistener

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class PulseHeadlessTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    return HeadlessJsTaskConfig(TASK_NAME, Arguments.fromBundle(extras), TIMEOUT_MS, true)
  }

  companion object {
    // Must match NOTIFICATION_TASK in modules/notification-listener/index.ts.
    const val TASK_NAME = "PulseNotification"
    private const val TIMEOUT_MS = 10_000L
  }
}
