import { describe, expect, it } from '@jest/globals';

import { DEFAULT_PALETTE } from '../src/cat/palette';
import { renderSceneSvg } from '../src/cat/scene';
import { renderSpriteToSvg, SPRITE_SIZE, spriteToRects } from '../src/cat/sprite';
import { SPRITES } from '../src/cat/sprites';

describe('sprite assets', () => {
  for (const sprite of Object.values(SPRITES)) {
    it(`${sprite!.id}: every frame is 32x32 and only uses palette keys`, () => {
      for (const frame of sprite!.frames) {
        expect(frame).toHaveLength(SPRITE_SIZE);
        for (const row of frame) {
          expect(row).toHaveLength(SPRITE_SIZE);
          for (const ch of row) expect(ch === '.' || ch in DEFAULT_PALETTE).toBe(true);
        }
      }
    });

    it(`${sprite!.id}: sequence only references existing frames`, () => {
      for (const i of sprite!.sequence) expect(sprite!.frames[i]).toBeDefined();
    });

    it(`${sprite!.id}: stands on the shared floor line (bottom row)`, () => {
      for (const frame of sprite!.frames) expect(frame[SPRITE_SIZE - 1].replace(/\./g, '').length).toBeGreaterThan(0);
    });
  }
});

describe('spriteToRects', () => {
  it('merges horizontal runs and skips transparency', () => {
    expect(spriteToRects(['.kkw.'], { k: '#000', w: '#fff' })).toEqual([
      { x: 1, y: 0, w: 2, color: '#000' },
      { x: 3, y: 0, w: 1, color: '#fff' },
    ]);
  });

  it('throws on a char missing from the palette', () => {
    expect(() => spriteToRects(['q'], {})).toThrow("'q'");
  });
});

describe('renderSceneSvg', () => {
  const frame = SPRITES.awake_sit!.frames[0];

  it('draws wall, floor and cat crisply, sized to the panel aspect', () => {
    const svg = renderSceneSvg(frame, DEFAULT_PALETTE, 60);
    expect(svg).toContain('viewBox="0 0 60 40"');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('fill="#D5C3A5"');
    expect(svg).toContain(`fill="${DEFAULT_PALETTE.k}"`);
  });

  it('centres the cat and never goes narrower than the sprite', () => {
    expect(renderSceneSvg(frame, DEFAULT_PALETTE, 10)).toContain('viewBox="0 0 32 40"');
    // Leftmost cat pixel in a 60-wide scene is offset by (60 - 32) / 2 = 14.
    expect(renderSceneSvg(['k'], { k: '#000' }, 60)).toContain('<rect x="14"');
  });
});

describe('renderSpriteToSvg', () => {
  it('scales by an integer with crisp edges', () => {
    const svg = renderSpriteToSvg(['k.'], { k: '#000' }, 3);
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('width="96"');
    expect(svg).toContain('<rect x="0" y="0" width="3" height="3" fill="#000"/>');
  });

  it('rejects non-integer scales', () => {
    expect(() => renderSpriteToSvg(['k'], { k: '#000' }, 1.5)).toThrow();
  });
});
