import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { DEFAULT_PALETTE } from '../cat/palette';
import { SPRITE_SIZE, frameAt, spriteToRects, type PoseId } from '../cat/sprite';
import { SPRITES } from '../cat/sprites';

type Props = { pose: PoseId; scale: number; animate?: boolean };

/** In-app idle loop. Drawn with plain Views (merged pixel runs), so no SVG native module is needed. */
export function PixelCat({ pose, scale, animate = true }: Props) {
  const sprite = SPRITES[pose] ?? SPRITES.sleep_curled!;
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    if (!animate) return;
    const id = setInterval(() => setStep((s) => (s + 1) % sprite.sequence.length), 1000 / sprite.fps);
    return () => clearInterval(id);
  }, [sprite, animate]);

  const s = Math.max(1, Math.round(scale));
  const frame = frameAt(sprite, step);
  return (
    <View style={{ width: SPRITE_SIZE * s, height: SPRITE_SIZE * s }}>
      {spriteToRects(frame, DEFAULT_PALETTE).map((r, i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: r.x * s, top: r.y * s, width: r.w * s, height: s, backgroundColor: r.color }}
        />
      ))}
    </View>
  );
}
