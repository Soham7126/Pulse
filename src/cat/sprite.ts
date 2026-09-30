export type PoseId = 'sleep_curled' | 'sleep_night' | 'awake_sit' | 'alert' | 'delivery' | 'yarn' | 'waking';

export const SPRITE_SIZE = 32;

export type Sprite = {
  id: PoseId;
  /** Idle-loop speed, in-app only (the widget shows frame 0). */
  fps: number;
  /** Order in which frames play in the idle loop. */
  sequence: number[];
  /** Each frame: 32 strings of 32 chars, one char per palette key, '.' transparent. */
  frames: string[][];
};

/** Palette key -> hex colour. Skins are palette swaps. */
export type Palette = Record<string, string>;

export type PixelRect = { x: number; y: number; w: number; color: string };

/**
 * Frame for an idle-loop step. Wraps, because a pose change swaps in a sprite with a shorter loop
 * before any reset can run (awake_sit has 10 steps, sleep_curled 6).
 */
export function frameAt(sprite: Sprite, step: number): string[] {
  const n = sprite.sequence.length;
  const index = sprite.sequence[((step % n) + n) % n];
  return sprite.frames[index] ?? sprite.frames[0];
}

/** Merges horizontal runs of the same colour into rects so renderers draw far fewer shapes. */
export function spriteToRects(frame: string[], palette: Palette): PixelRect[] {
  const rects: PixelRect[] = [];
  frame.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== '.') {
        const color = palette[ch];
        if (!color) throw new Error(`Palette has no colour for '${ch}'`);
        rects.push({ x, y, w: end - x, color });
      }
      x = end;
    }
  });
  return rects;
}

/** SVG for the widget (SvgWidget). Integer scale only, crisp edges, transparent background. */
export function renderSpriteToSvg(frame: string[], palette: Palette, scale: number): string {
  if (!Number.isInteger(scale) || scale < 1) throw new Error('Sprite scale must be a positive integer');
  const size = SPRITE_SIZE * scale;
  const rects = spriteToRects(frame, palette)
    .map((r) => `<rect x="${r.x * scale}" y="${r.y * scale}" width="${r.w * scale}" height="${scale}" fill="${r.color}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects}</svg>`;
}
