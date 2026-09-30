package expo.modules.pulsewidget

import android.graphics.Color
import org.json.JSONObject

/** Display-only snapshot written by the app (src/widget/payload.ts). Never the full notification store. */
data class WidgetData(
  val awake: Boolean,
  val headline: String,
  val line: String,
  val footer: String,
  val rows: List<Row>,
  val fps: Int,
  val sequence: List<Int>,
  val frames: List<List<String>>,
  val palette: Map<Char, Int>,
) {
  data class Row(val id: Long, val icon: String, val who: String, val what: String)

  companion object {
    fun parse(json: String): WidgetData? = try {
      val o = JSONObject(json)
      val sprite = o.getJSONObject("sprite")
      val framesJson = sprite.getJSONArray("frames")
      val paletteJson = o.getJSONObject("palette")
      WidgetData(
        awake = o.getBoolean("awake"),
        headline = o.getString("headline"),
        line = o.getString("line"),
        footer = o.getString("footer"),
        rows = List(o.getJSONArray("rows").length()) { i ->
          val r = o.getJSONArray("rows").getJSONObject(i)
          Row(r.getLong("id"), r.getString("icon"), r.getString("who"), r.getString("what"))
        },
        fps = sprite.getInt("fps").coerceIn(1, 12),
        sequence = List(sprite.getJSONArray("sequence").length()) { sprite.getJSONArray("sequence").getInt(it) },
        frames = List(framesJson.length()) { f ->
          val rows = framesJson.getJSONArray(f)
          List(rows.length()) { rows.getString(it) }
        },
        palette = paletteJson.keys().asSequence().associate { it[0] to Color.parseColor(paletteJson.getString(it)) },
      )
    } catch (e: Exception) {
      null
    }
  }
}
