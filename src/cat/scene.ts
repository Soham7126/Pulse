import { SPRITE_SIZE, spriteToRects, type Palette } from './sprite';

export const SCENE_ROWS = 40;
const FLOOR_TOP = 30;
const WALL = '#F5EFE6';
const FLOOR = '#D5C3A5';
const PLANK = '#BFA985';

/**
 * The locked widget scene as one SVG: plain wall, plank floor, cat standing on the floor line.
 * Units are sprite pixels (viewBox), so it stays crisp at any widget size; `cols` follows the panel's aspect ratio.
 */
export function renderSceneSvg(frame: string[], palette: Palette, cols: number): string {
  const w = Math.max(SPRITE_SIZE, Math.round(cols));
  const catX = Math.floor((w - SPRITE_SIZE) / 2);
  // Sprite's bottom row sits two rows into the floor so the cat reads as standing on it.
  const catY = FLOOR_TOP + 2 - (SPRITE_SIZE - 1);
  const floorH = SCENE_ROWS - FLOOR_TOP;
  const planks = [FLOOR_TOP + 3, FLOOR_TOP + 6]
    .map((y) => `<rect x="0" y="${y}" width="${w}" height="1" fill="${PLANK}"/>`)
    .join('');
  const cat = spriteToRects(frame, palette)
    .map((r) => `<rect x="${r.x + catX}" y="${r.y + catY}" width="${r.w}" height="1" fill="${r.color}"/>`)
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${SCENE_ROWS}" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges">` +
    `<rect width="${w}" height="${SCENE_ROWS}" fill="${WALL}"/>` +
    `<rect y="${FLOOR_TOP}" width="${w}" height="${floorH}" fill="${FLOOR}"/>${planks}${cat}</svg>`
  );
}
