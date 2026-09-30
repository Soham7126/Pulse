package expo.modules.pulsewidget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle

// Both widgets redraw from the last saved snapshot, so they work after a reboot without the app running.

class PulseSmallWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { PulseWidgetUpdater.update(context, manager, it, WidgetKind.SMALL) }
  }

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, newOptions: Bundle) {
    PulseWidgetUpdater.update(context, manager, id, WidgetKind.SMALL)
  }
}

class PulseMediumWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { PulseWidgetUpdater.update(context, manager, it, WidgetKind.MEDIUM) }
  }

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, newOptions: Bundle) {
    PulseWidgetUpdater.update(context, manager, id, WidgetKind.MEDIUM)
  }
}
