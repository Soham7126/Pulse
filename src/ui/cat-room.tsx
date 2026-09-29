import { View } from 'react-native';

import type { PoseId } from '../cat/sprite';
import { PixelCat } from './pixel-cat';
import { COLORS, alpha } from './theme';

type Props = { pose: PoseId; size: number; radius?: number; borderColor?: string };

/** The locked scene: plain wall, wooden plank floor, cat standing on the floor line. */
export function CatRoom({ pose, size, radius = 16, borderColor = alpha(COLORS.outlineVariant, 0.3) }: Props) {
  const scale = Math.max(1, Math.floor((size * 0.72) / 32));
  const floorHeight = Math.round(size * 0.24);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: COLORS.wall,
        borderWidth: 1,
        borderColor,
      }}
    >
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: floorHeight, backgroundColor: COLORS.floor }}>
        {[0.33, 0.66].map((p) => (
          <View key={p} style={{ position: 'absolute', top: floorHeight * p, left: 0, right: 0, height: 1, backgroundColor: COLORS.floorPlank }} />
        ))}
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: floorHeight - scale * 2, alignItems: 'center' }}>
        <PixelCat pose={pose} scale={scale} />
      </View>
    </View>
  );
}
