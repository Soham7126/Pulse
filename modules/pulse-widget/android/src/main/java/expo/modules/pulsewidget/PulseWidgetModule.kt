package expo.modules.pulsewidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PulseWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PulseWidget")

    // Saves the display snapshot and redraws every placed Pulse widget. Works from the headless task too.
    Function("update") { json: String ->
      val context = appContext.reactContext ?: return@Function false
      PulseWidgetUpdater.save(context, json)
      PulseWidgetUpdater.updateAll(context)
      true
    }

    // Launcher's "add widget" prompt. Returns false where the launcher doesn't support pinning.
    Function("requestPin") { kind: String ->
      val context = appContext.reactContext ?: return@Function false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function false
      val manager = AppWidgetManager.getInstance(context)
      if (!manager.isRequestPinAppWidgetSupported) return@Function false
      val cls = if (kind == "small") PulseSmallWidgetProvider::class.java else PulseMediumWidgetProvider::class.java
      manager.requestPinAppWidget(ComponentName(context, cls), null, null)
    }
  }
}
