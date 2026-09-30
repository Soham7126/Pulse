package expo.modules.pulsewidget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint

/**
 * Draws the locked scene (plain wall, plank floor, cat on the floor line) as a pixel-exact bitmap.
 * Mirrors the app's sprite system: frames are 32x32 text grids, one char per palette key, '.' transparent.
 */
object SceneRenderer {
  const val SCENE_ROWS = 40
  private const val FLOOR_TOP = 30
  private const val SPRITE = 32
  private val WALL = Color.parseColor("#F5EFE6")
  private val FLOOR = Color.parseColor("#D5C3A5")
  private val PLANK = Color.parseColor("#BFA985")

  /** `cols` sets the aspect ratio (40 = square room, 80 = wide room); `scale` is an integer pixel size. */
  fun render(frame: List<String>, palette: Map<Char, Int>, cols: Int, scale: Int): Bitmap {
    val w = maxOf(SPRITE, cols)
    val bitmap = Bitmap.createBitmap(w * scale, SCENE_ROWS * scale, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint().apply { isAntiAlias = false }
    fun cells(x: Int, y: Int, width: Int, height: Int, color: Int) {
      paint.color = color
      canvas.drawRect((x * scale).toFloat(), (y * scale).toFloat(), ((x + width) * scale).toFloat(), ((y + height) * scale).toFloat(), paint)
    }
    cells(0, 0, w, SCENE_ROWS, WALL)
    cells(0, FLOOR_TOP, w, SCENE_ROWS - FLOOR_TOP, FLOOR)
    cells(0, FLOOR_TOP + 3, w, 1, PLANK)
    cells(0, FLOOR_TOP + 6, w, 1, PLANK)
    // The sprite's bottom row sits two rows into the floor so the cat reads as standing on it.
    val catX = (w - SPRITE) / 2
    val catY = FLOOR_TOP + 2 - (SPRITE - 1)
    frame.forEachIndexed { y, row ->
      var x = 0
      while (x < row.length) {
        val ch = row[x]
        var end = x + 1
        while (end < row.length && row[end] == ch) end++
        val color = palette[ch]
        if (ch != '.' && color != null) cells(catX + x, catY + y, end - x, 1, color)
        x = end
      }
    }
    return bitmap
  }
}
