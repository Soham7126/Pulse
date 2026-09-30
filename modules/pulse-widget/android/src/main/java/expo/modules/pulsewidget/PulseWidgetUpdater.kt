package expo.modules.pulsewidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.view.View
import android.widget.RemoteViews

enum class WidgetKind { SMALL, MEDIUM }

/**
 * Builds both widgets natively. The cat's idle loop is a ViewFlipper of pre-drawn frames, so Android keeps it
 * animating on the home screen with no JS running. Text is real views, so layout follows the actual widget size.
 */
object PulseWidgetUpdater {
  private const val TAG = "PulseWidget"
  private const val PREFS = "pulse_widget"
  private const val KEY_SNAPSHOT = "snapshot"
  private val ROWS = listOf(
    Triple(R.id.pulse_row1, R.id.pulse_row1_icon, R.id.pulse_row1_who) to R.id.pulse_row1_what,
    Triple(R.id.pulse_row2, R.id.pulse_row2_icon, R.id.pulse_row2_who) to R.id.pulse_row2_what,
    Triple(R.id.pulse_row3, R.id.pulse_row3_icon, R.id.pulse_row3_who) to R.id.pulse_row3_what,
  )

  fun save(context: Context, json: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_SNAPSHOT, json).apply()
  }

  private fun load(context: Context): WidgetData? =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_SNAPSHOT, null)?.let(WidgetData::parse)

  fun updateAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    for ((cls, kind) in listOf(PulseSmallWidgetProvider::class.java to WidgetKind.SMALL, PulseMediumWidgetProvider::class.java to WidgetKind.MEDIUM)) {
      manager.getAppWidgetIds(ComponentName(context, cls)).forEach { update(context, manager, it, kind) }
    }
  }

  fun update(context: Context, manager: AppWidgetManager, widgetId: Int, kind: WidgetKind) {
    val options = manager.getAppWidgetOptions(widgetId)
    // MIN_HEIGHT is the conservative bound; some launchers (Realme) report a MAX_HEIGHT taller than the real slot.
    val minH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110)
    val maxH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, minH)
    Log.i(TAG, "update id=$widgetId kind=$kind minH=${minH}dp maxH=${maxH}dp")
    val data = load(context)
    val views = RemoteViews(context.packageName, if (kind == WidgetKind.SMALL) R.layout.pulse_widget_small else R.layout.pulse_widget_medium)
    val awake = data?.awake == true

    // Room aspect: square for the small widget and the wide widget's side panel; wide while the cat sleeps alone.
    val cols = if (kind == WidgetKind.MEDIUM && !awake) 80 else 40
    val panelPx = (minH - if (kind == WidgetKind.SMALL) 16 else 24) * context.resources.displayMetrics.density
    val scale = (panelPx / SceneRenderer.SCENE_ROWS).toInt().coerceIn(2, 8)
    setFrames(context, views, data, cols, scale)

    views.setOnClickPendingIntent(R.id.pulse_root, openApp(context, 0))
    views.setContentDescription(R.id.pulse_root, if (awake) "Pulse: ${data?.headline}" else "Pulse: all quiet")

    if (kind == WidgetKind.SMALL) {
      views.setViewVisibility(R.id.pulse_line, if (awake) View.VISIBLE else View.GONE)
      views.setTextViewText(R.id.pulse_line, data?.line ?: "")
    } else {
      views.setViewVisibility(R.id.pulse_summary, if (awake) View.VISIBLE else View.GONE)
      if (awake && data != null) fillSummary(context, views, data, widgetId, rowsThatFit(minH))
    }
    manager.updateAppWidget(widgetId, views)
  }

  // Launchers over-report: Realme says 175dp (min and max) for a 146dp slot. Thresholds leave that ~20% headroom,
  // so a 2-cell-tall widget shows 2 rows and a resized 3-cell one shows 3.
  private fun rowsThatFit(minHeightDp: Int): Int = when {
    minHeightDp >= 210 -> 3
    minHeightDp >= 120 -> 2
    else -> 1
  }

  private fun setFrames(context: Context, views: RemoteViews, data: WidgetData?, cols: Int, scale: Int) {
    views.removeAllViews(R.id.pulse_flipper)
    val palette = data?.palette ?: emptyMap()
    val frames = data?.frames?.takeIf { it.isNotEmpty() } ?: listOf(emptyList())
    // One bitmap per unique frame; the sequence reuses them (RemoteViews de-duplicates identical bitmaps).
    val bitmaps = frames.map { SceneRenderer.render(it, palette, cols, scale) }
    val sequence = data?.sequence?.filter { it in bitmaps.indices }?.takeIf { it.isNotEmpty() } ?: listOf(0)
    for (index in sequence) {
      val frame = RemoteViews(context.packageName, R.layout.pulse_widget_frame)
      frame.setImageViewBitmap(R.id.pulse_frame, bitmaps[index])
      views.addView(R.id.pulse_flipper, frame)
    }
    views.setInt(R.id.pulse_flipper, "setFlipInterval", 1000 / (data?.fps ?: 2))
  }

  private fun fillSummary(context: Context, views: RemoteViews, data: WidgetData, widgetId: Int, fit: Int) {
    views.setTextViewText(R.id.pulse_headline, data.headline)
    views.setTextViewText(R.id.pulse_footer, data.footer)
    views.setOnClickPendingIntent(R.id.pulse_arrow, openApp(context, 1))
    ROWS.forEachIndexed { i, (ids, whatId) ->
      val (rowId, iconId, whoId) = ids
      val row = data.rows.getOrNull(i)
      if (row == null || i >= fit) {
        views.setViewVisibility(rowId, View.GONE)
        return@forEachIndexed
      }
      views.setViewVisibility(rowId, View.VISIBLE)
      views.setTextViewText(iconId, row.icon)
      views.setTextViewText(whoId, row.who)
      views.setTextViewText(whatId, if (row.what.isEmpty()) "" else "· ${row.what}")
      views.setOnClickPendingIntent(rowId, openDetail(context, row.id, 100 + widgetId * 10 + i))
    }
  }

  private fun openApp(context: Context, requestCode: Int): PendingIntent {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)!!
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  /** Deep link into the notification's detail screen (expo-router route notification/[id], scheme "pulse"). */
  private fun openDetail(context: Context, id: Long, requestCode: Int): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("pulse://notification/$id"))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }
}
